import { useCallback, useEffect, useRef, useState } from "react";
import type { Client } from "@stomp/stompjs";
import type { Asset } from "../../lib/api/assets";
import { useNotifications } from "../../app/notifications";
import { feel } from "../../lib/feel";
import { editMessage, getHistory, reactToMessage } from "../chat/api";
import { createChatClient, sendMessage, sendRead, sendTyping } from "../chat/chatClient";
import type { Message, MessageReaction } from "../chat/types";
import { refreshUnread } from "../chat/unread";
import { isLooking, markActive } from "../notifications/notifClient";
import { clearConversationNotifications } from "../notifications/systemNotify";

const PAGE = 30;
const STALE_AFTER_MS = 20_000; // back after longer than this: the old socket may be dead without knowing it
const SLOW_AFTER_MS = 2500; // « Connexion… » only shows when it takes longer than this

/** A message written while the connection was not there yet: it leaves as soon as it is. */
export interface Outgoing {
  key: number;
  text: string;
  attachment: Asset | null;
  replyToId: number | null;
}

/** Adds messages not seen yet, keeping chronological (id) order. */
function mergeById(prev: Message[], fresh: Message[]): Message[] {
  const known = new Set(prev.map((m) => m.id));
  return [...prev, ...fresh.filter((m) => !known.has(m.id))].sort((a, b) => a.id - b.id);
}

/**
 * The one conversation, live: history by pages, the socket (new messages,
 * reactions, ✓✓, « écrit… », edits), and the actions on it. The same server
 * and the same messages as MemoCat's chat; only the screen differs.
 */
export function useConversation(myId: number | undefined) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [connected, setConnected] = useState(false);
  const [page, setPage] = useState(0);
  const [hasOlder, setHasOlder] = useState(false);
  const [typing, setTyping] = useState(false);
  const [slow, setSlow] = useState(false);
  const [outbox, setOutbox] = useState<Outgoing[]>([]);
  const outboxKey = useRef(0);
  const clientRef = useRef<Client | null>(null);
  const myIdRef = useRef(myId);
  myIdRef.current = myId;
  const typingTimer = useRef<number | null>(null);
  const everConnected = useRef(false);
  const { reload } = useNotifications();
  const reloadBell = useRef(reload);
  reloadBell.current = reload;

  const loadLatest = useCallback(() => {
    getHistory(0, PAGE)
      .then((p) => {
        setMessages((prev) => mergeById(prev, [...p.content].reverse()));
        setHasOlder((h) => h || p.totalPages > 1);
        setLoaded(true);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);
  useEffect(loadLatest, [loadLatest]);

  // A rewritten message keeps what this screen knows better (ticks that moved since).
  const replace = useCallback((edited: Message) => {
    setMessages((prev) => prev.map((m) => (m.id === edited.id ? { ...m, content: edited.content, editedAt: edited.editedAt, reactions: edited.reactions } : m)));
  }, []);
  const setReactions = useCallback((messageId: number, reactions: MessageReaction[]) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
  }, []);

  useEffect(() => {
    const stopTyping = () => {
      if (typingTimer.current !== null) window.clearTimeout(typingTimer.current);
      typingTimer.current = null;
      setTyping(false);
    };
    const client = createChatClient(
      (m) => {
        if (m.sender.id !== myIdRef.current) {
          stopTyping();
          if (document.visibilityState === "visible") feel.message();
        }
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      },
      setConnected,
      (r) => setReactions(r.messageId, r.reactions),
      (r) => {
        if (r.readerId === myIdRef.current) {
          refreshUnread();
          void reloadBell.current(); // the server marked the conversation's notifications read
          void clearConversationNotifications(); // and the phone's shade lets them go too
          return;
        }
        setMessages((prev) =>
          prev.map((m) => (m.sender.id !== r.readerId && m.id <= r.upToId && !m.readAt ? { ...m, readAt: r.readAt, deliveredAt: m.deliveredAt ?? r.readAt } : m)),
        );
      },
      (t) => {
        if (t.userId === myIdRef.current) return;
        setTyping(true);
        if (typingTimer.current !== null) window.clearTimeout(typingTimer.current);
        typingTimer.current = window.setTimeout(stopTyping, 5000);
      },
      (d) => {
        if (d.receiverId === myIdRef.current) return;
        setMessages((prev) => prev.map((m) => (m.sender.id !== d.receiverId && m.id <= d.upToId && !m.deliveredAt ? { ...m, deliveredAt: d.deliveredAt } : m)));
      },
      replace,
    );
    clientRef.current = client;
    return () => {
      stopTyping();
      void client.deactivate();
    };
  }, [replace, setReactions]);

  // Back on the app, or the network back: connect again now, not at the next try.
  // After a long while away, the socket may look open but be dead: a fresh one.
  useEffect(() => {
    let hiddenAt: number | null = null;
    const reconnect = () => {
      const client = clientRef.current;
      if (client) void client.deactivate().then(() => client.activate());
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      const away = hiddenAt === null ? 0 : Date.now() - hiddenAt;
      hiddenAt = null;
      if (!clientRef.current?.connected || away > STALE_AFTER_MS) reconnect();
    };
    const onOnline = () => {
      if (!clientRef.current?.connected) reconnect();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  // « Connexion… » only when it really takes a while (no flash on every opening).
  useEffect(() => {
    if (connected) {
      setSlow(false);
      return;
    }
    const t = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [connected]);

  // Connected: what was written meanwhile leaves, in order.
  useEffect(() => {
    const client = clientRef.current;
    if (!connected || !client || outbox.length === 0) return;
    try {
      outbox.forEach((o) => sendMessage(client, o.text, o.attachment?.id ?? null, o.replyToId));
      setOutbox([]);
    } catch {
      /* the socket fell again: they stay and leave at the next connection */
    }
  }, [connected, outbox]);

  // Back online after a while (the phone slept): catch up on what was missed.
  useEffect(() => {
    if (!connected) return;
    if (!everConnected.current) {
      everConnected.current = true;
      return;
    }
    loadLatest();
  }, [connected, loadLatest]);

  // On screen, the conversation's banners in the phone's shade are already seen.
  useEffect(() => {
    const clear = () => document.visibilityState === "visible" && void clearConversationNotifications();
    clear();
    document.addEventListener("visibilitychange", clear);
    return () => document.removeEventListener("visibilitychange", clear);
  }, []);

  // Looked at (on screen and touched lately), their newest message counts as seen:
  // their ticks turn to colour. A screen left open with nobody in front (a computer)
  // reads nothing, so the phone still rings. Seen as soon as someone comes back.
  const lastReadSent = useRef(0);
  useEffect(() => {
    const tell = () => {
      const client = clientRef.current;
      if (!client || !connected || !isLooking()) return;
      const theirs = messages.filter((m) => m.sender.id !== myId);
      const newest = theirs[theirs.length - 1];
      if (newest && newest.id > lastReadSent.current && !newest.readAt) {
        lastReadSent.current = newest.id;
        sendRead(client, newest.id);
      }
    };
    const back = () => {
      if (document.visibilityState !== "visible") return;
      markActive(); // a touch, a key, or the app brought back: someone is there
      tell();
    };
    const ACTIVITY = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    tell();
    document.addEventListener("visibilitychange", back);
    for (const type of ACTIVITY) window.addEventListener(type, back, { passive: true });
    return () => {
      document.removeEventListener("visibilitychange", back);
      for (const type of ACTIVITY) window.removeEventListener(type, back);
    };
  }, [messages, connected, myId]);

  const loadOlder = useCallback(async () => {
    const next = page + 1;
    const p = await getHistory(next, PAGE);
    setMessages((prev) => mergeById(prev, [...p.content].reverse()));
    setPage(next);
    setHasOlder(next + 1 < p.totalPages);
  }, [page]);

  const send = useCallback((text: string, attachment: Asset | null, replyToId: number | null) => {
    const client = clientRef.current;
    feel.tap();
    if (client?.connected) {
      try {
        sendMessage(client, text, attachment?.id ?? null, replyToId);
        return;
      } catch {
        /* closed in between: it waits below */
      }
    }
    setOutbox((list) => [...list, { key: ++outboxKey.current, text, attachment, replyToId }]);
  }, []);

  // Optimistic: my emoji shows at once, and goes back if the server refuses.
  const react = useCallback(
    (messageId: number, emoji: string | null) => {
      if (myId == null) return;
      const before = messages.find((m) => m.id === messageId)?.reactions ?? [];
      const others = before.filter((r) => r.userId !== myId);
      setReactions(messageId, emoji ? [...others, { userId: myId, emoji }] : others);
      reactToMessage(messageId, emoji)
        .then((r) => setReactions(r.messageId, r.reactions))
        .catch(() => setReactions(messageId, before));
    },
    [messages, myId, setReactions],
  );

  const edit = useCallback(
    (target: Message, text: string) => {
      replace({ ...target, content: text, editedAt: new Date().toISOString() });
      editMessage(target.id, text)
        .then(replace)
        .catch(() => replace(target)); // refused: back as it was
    },
    [replace],
  );

  // While I type: tell the other one, every few seconds at most.
  const lastTypingSent = useRef(0);
  const notifyTyping = useCallback(() => {
    const client = clientRef.current;
    if (!client || Date.now() - lastTypingSent.current < 2500) return;
    lastTypingSent.current = Date.now();
    sendTyping(client);
  }, []);

  return { messages, loaded, failed, connected, slow, outbox, hasOlder, typing, loadLatest, loadOlder, send, react, edit, notifyTyping };
}
