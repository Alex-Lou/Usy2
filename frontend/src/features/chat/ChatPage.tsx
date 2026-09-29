import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Client } from "@stomp/stompjs";
import { useCompanion } from "../../app/companion";
import { Animal } from "../../components/ui/animals";
import { Icon } from "../../components/ui/Icon";
import { Avatar } from "../../components/ui/Avatar";
import { ProfileLink } from "../../components/ui/ProfileLink";
import type { Asset } from "../../lib/api/assets";
import { flashElement } from "../../lib/flash";
import { useAuth } from "../auth/useAuth";
import { getReactionEmojis } from "../feed/api";
import { PetStage } from "../pet/PetStage";
import { usePet } from "../pet/usePet";
import { getAllProfiles } from "../profile/api";
import type { Profile } from "../profile/types";
import { editMessage, getHistory, reactToMessage } from "./api";
import { ChatComposer } from "./ChatComposer";
import { createChatClient, sendMessage, sendRead, sendTyping } from "./chatClient";
import { effectSeen, markEffectSeen, SCREEN_EFFECTS, type MessageLook, type ScreenEffectId } from "./looks";
import { ScreenEffect } from "./ScreenEffect";
import { ImageViewer } from "../../components/photo/ImageViewer";
import { MessageList } from "./MessageList";
import { useFonts } from "../../lib/fonts";
import { useSharedAppearance } from "../couple/appearance";
import { readingStyle, useReading } from "./reading";
import { ReadingMenu } from "./ReadingMenu";
import type { Message, MessageReaction } from "./types";
import { feel } from "../../lib/feel";
import { refreshUnread } from "./unread";

/** Adds messages not seen yet, keeping chronological (id) order. */
function mergeById(prev: Message[], fresh: Message[]): Message[] {
  const known = new Set(prev.map((m) => m.id));
  return [...prev, ...fresh.filter((m) => !known.has(m.id))].sort((a, b) => a.id - b.id);
}

export function ChatPage() {
  const { user } = useAuth();
  const { companion } = useCompanion();
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const [page, setPage] = useState(0);
  const [hasOlder, setHasOlder] = useState(false);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [viewing, setViewing] = useState<Asset | null>(null);
  const [emojis, setEmojis] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null); // my message being rewritten
  const [playing, setPlaying] = useState<{ effect: ScreenEffectId; key: number } | null>(null);
  const [typing, setTyping] = useState<string | null>(null); // "Lou écrit…"
  const typingTimer = useRef<number | null>(null);
  const myIdRef = useRef(user?.id);
  myIdRef.current = user?.id;
  const play = useCallback((effect: string | null | undefined) => {
    if (effect && SCREEN_EFFECTS.some((f) => f.id === effect)) setPlaying({ effect: effect as ScreenEffectId, key: Date.now() });
  }, []);
  const replyRef = useRef<Message | null>(null);
  replyRef.current = replyTo;
  const clientRef = useRef<Client | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const everConnected = useRef(false);
  const stickToBottom = useRef(true);
  const { pet, loading: petLoading, setPet, pose, caption, act, onActivity, onMessage, noteHistory } = usePet(user?.id);
  const [petOpen, setPetOpen] = useState(() => readPetOpen());
  const { reading, save: saveReading, error: readingError } = useReading();
  const common = useSharedAppearance();
  useFonts(reading.font ? null : common.chatFont);

  useEffect(() => {
    getReactionEmojis().then(setEmojis).catch(() => {});
  }, []);

  // A rewritten message keeps what this screen knows better (ticks that moved since).
  const replaceMessage = useCallback((edited: Message) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === edited.id
          ? { ...m, content: edited.content, editedAt: edited.editedAt, reactions: edited.reactions }
          : m,
      ),
    );
  }, []);

  const saveEdit = useCallback(
    (text: string) => {
      const target = editing;
      setEditing(null);
      if (!target) return;
      replaceMessage({ ...target, content: text, editedAt: new Date().toISOString() }); // at once, like sending
      editMessage(target.id, text)
        .then(replaceMessage)
        .catch(() => replaceMessage(target)); // refused: back as it was
    },
    [editing, replaceMessage],
  );

  const setReactions = useCallback((messageId: number, reactions: MessageReaction[]) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
  }, []);

  // Optimistic: my emoji shows at once, and goes back if the server refuses.
  const react = useCallback(
    (messageId: number, emoji: string | null) => {
      const me = user?.id;
      if (me == null) return;
      const before = messages.find((m) => m.id === messageId)?.reactions ?? [];
      const others = before.filter((r) => r.userId !== me);
      if (emoji) feel.tap();
      setReactions(messageId, emoji ? [...others, { userId: me, emoji }] : others);
      reactToMessage(messageId, emoji)
        .then((r) => setReactions(r.messageId, r.reactions))
        .catch(() => setReactions(messageId, before));
    },
    [messages, user?.id, setReactions],
  );

  useEffect(() => {
    getAllProfiles()
      .then((all) => setPartner(all.find((p) => p.userId !== user?.id) ?? null))
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    getHistory(0, 30)
      .then((p) => {
        setMessages([...p.content].reverse());
        setHasOlder(p.totalPages > 1);
        setPage(0);
        noteHistory(p.content[0]?.createdAt);
        // An effect sent to me lately and not yet seen here plays once on opening.
        const fresh = p.content.find((m) => m.effect && m.sender.id !== user?.id && Date.now() - new Date(m.createdAt).getTime() < 86_400_000);
        if (fresh && !effectSeen(fresh.id)) {
          markEffectSeen(fresh.id);
          play(fresh.effect);
        }
      })
      .catch(() => {});
  }, [noteHistory, play, user?.id]);

  // The chat socket also carries the cat's live events (one connection).
  const onMessageRef = useRef(onMessage);
  const playRef = useRef(play);
  playRef.current = play;
  const onActivityRef = useRef(onActivity);
  onMessageRef.current = onMessage;
  onActivityRef.current = onActivity;

  useEffect(() => {
    const stopTyping = () => {
      if (typingTimer.current !== null) window.clearTimeout(typingTimer.current);
      typingTimer.current = null;
      setTyping(null);
    };
    const client = createChatClient(
      (m) => {
        if (m.sender.id !== myIdRef.current) {
          stopTyping(); // their message is here
          if (document.visibilityState === "visible") feel.message();
        }
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        onMessageRef.current(m);
        if (m.effect && !effectSeen(m.id)) {
          markEffectSeen(m.id); // played live, for both
          playRef.current(m.effect);
        }
      },
      setConnected,
      (a) => onActivityRef.current(a),
      (r) => setReactions(r.messageId, r.reactions),
      (r) => {
        if (r.readerId === myIdRef.current) {
          refreshUnread(); // I read them (here or on my other device): the red bubble goes
          return;
        }
        // They saw my messages up to there (so received them too): the ticks turn to colour.
        setMessages((prev) =>
          prev.map((m) =>
            m.sender.id !== r.readerId && m.id <= r.upToId && !m.readAt ? { ...m, readAt: r.readAt, deliveredAt: m.deliveredAt ?? r.readAt } : m,
          ),
        );
      },
      (t) => {
        if (t.userId === myIdRef.current) return;
        setTyping(t.name);
        if (typingTimer.current !== null) window.clearTimeout(typingTimer.current);
        typingTimer.current = window.setTimeout(stopTyping, 5000); // no news for 5 s: stopped typing
      },
      (d) => {
        if (d.receiverId === myIdRef.current) return; // messages that reached me
        // My messages up to there reached them: ✓ becomes ✓✓.
        setMessages((prev) =>
          prev.map((m) => (m.sender.id !== d.receiverId && m.id <= d.upToId && !m.deliveredAt ? { ...m, deliveredAt: d.deliveredAt } : m)),
        );
      },
      (edited) => replaceMessage(edited), // rewritten (by the other one, or me on another device)
    );
    clientRef.current = client;
    return () => {
      stopTyping();
      void client.deactivate();
    };
  }, []);

  // On screen, the other one's newest message counts as seen: tell them (their ticks turn to colour).
  const lastReadSent = useRef(0);
  useEffect(() => {
    const tell = () => {
      const client = clientRef.current;
      if (!client || !connected || document.visibilityState !== "visible") return;
      const theirs = messages.filter((m) => m.sender.id !== user?.id);
      const newest = theirs[theirs.length - 1];
      if (newest && newest.id > lastReadSent.current && !newest.readAt) {
        lastReadSent.current = newest.id;
        sendRead(client, newest.id);
      }
    };
    tell();
    document.addEventListener("visibilitychange", tell);
    return () => document.removeEventListener("visibilitychange", tell);
  }, [messages, connected, user?.id]);

  // While I type: tell the other one, every few seconds at most.
  const lastTypingSent = useRef(0);
  const onTyping = useCallback(() => {
    const client = clientRef.current;
    if (!client || Date.now() - lastTypingSent.current < 2500) return;
    lastTypingSent.current = Date.now();
    sendTyping(client);
  }, []);

  // After a reconnect (e.g. the app was in the background), catch up on what was missed.
  useEffect(() => {
    if (!connected) return;
    if (!everConnected.current) {
      everConnected.current = true;
      return;
    }
    getHistory(0, 30)
      .then((p) => setMessages((prev) => mergeById(prev, [...p.content].reverse())))
      .catch(() => {});
  }, [connected]);

  // Stay pinned to the newest message — while photos load and grow the list, or
  // when the emoji sheet shrinks the view — unless the user scrolled up.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (!scroller || !content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (stickToBottom.current) scroller.scrollTop = scroller.scrollHeight;
    });
    observer.observe(content);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  // From a notification (/chat?m=42): bring that message into view, loading
  // older pages as needed (bounded), instead of landing on the newest one.
  const [params] = useSearchParams();
  const target = Number(params.get("m")) || null;
  const seek = useRef<{ id: number; pages: number; done: boolean; busy: boolean } | null>(null);
  const [seekTick, setSeekTick] = useState(0); // re-checks once an older page has arrived
  useEffect(() => {
    if (!target || messages.length === 0) return;
    if (seek.current?.id !== target) seek.current = { id: target, pages: 0, done: false, busy: false };
    const s = seek.current;
    if (s.done || s.busy) return;
    if (messages.some((m) => m.id === target)) {
      s.done = true;
      stickToBottom.current = false;
      requestAnimationFrame(() => flashElement(`msg-${target}`));
    } else if (hasOlder && s.pages < 10) {
      s.pages++;
      s.busy = true;
      loadOlder()
        .catch(() => (s.done = true))
        .finally(() => {
          s.busy = false;
          setSeekTick((t) => t + 1);
        });
    } else {
      s.done = true; // too old or deleted: stay on the newest messages
    }
  }, [target, messages, hasOlder, seekTick]);

  async function loadOlder() {
    const next = page + 1;
    const p = await getHistory(next, 30);
    stickToBottom.current = false;
    setMessages((prev) => mergeById(prev, [...p.content].reverse()));
    setPage(next);
    setHasOlder(next + 1 < p.totalPages);
  }

  const send = useCallback((text: string, attachment: Asset | null, look?: MessageLook) => {
    const client = clientRef.current;
    if (!client) return;
    stickToBottom.current = true;
    feel.tap();
    sendMessage(client, text, attachment?.id ?? null, replyRef.current?.id ?? null, look);
    setReplyTo(null);
  }, []);

  return (
    <div className="flex h-[calc(100dvh-var(--topbar-h)-max(var(--tabbar-h),var(--picker-h,0px))-2rem)] flex-col gap-3 lg:h-[calc(100dvh-var(--desk-topbar-h)-2rem-max(2rem,var(--picker-h,0px))-1rem)]">
      <header className="relative z-20 flex items-center gap-3 animate-fade-up">
        {partner && (
          <ProfileLink userId={partner.userId} className="shrink-0 rounded-full">
            <Avatar name={partner.displayName} size={40} assetId={partner.avatarAssetId} framing={partner.avatarFraming} species={partner.companion} />
          </ProfileLink>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-bold leading-tight">
            {partner ? (
              <ProfileLink userId={partner.userId} className="hover:underline">
                {partner.displayName}
              </ProfileLink>
            ) : (
              "Messages"
            )}
          </h1>
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-accent shadow-glow" : "bg-text-muted"}`} />
            {connected ? "Connecté" : "Connexion…"}
          </p>
        </div>
        <div className="ml-auto">
          <ReadingMenu reading={reading} onChange={saveReading} error={readingError} commonFont={common.chatFont} />
        </div>
        {pet && (
          <button
            type="button"
            onClick={() => setPetOpen((o) => savePetOpen(!o))}
            aria-expanded={petOpen}
            aria-label={petOpen ? `Ranger ${pet.name}` : `Voir ${pet.name}`}
            className="flex items-center gap-1 rounded-full border border-border bg-surface py-1 pl-1 pr-2 text-xs text-text-muted press hover:border-primary/50"
          >
            <Animal species="cat" size={26} />
            <Icon name="chevronDown" size={14} className={"transition-transform " + (petOpen ? "rotate-180" : "")} />
          </button>
        )}
      </header>

      {pet && petOpen && <PetStage pet={pet} pose={pose} caption={caption} onAct={act} onRenamed={setPet} />}
      {/* Keeps the pet's room while it loads, so the conversation does not jump down. */}
      {!pet && petLoading && petOpen && <div className="card h-[120px] shrink-0 animate-pulse" aria-hidden="true" />}

      <div
        ref={scrollerRef}
        className="card min-h-0 flex-1 overflow-y-auto px-3 py-2"
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        <div ref={contentRef} className="flex min-h-full flex-col" style={readingStyle(reading, common)}>
          {hasOlder && (
            <button onClick={loadOlder} className="mx-auto my-2 block text-xs text-text-muted hover:underline">
              Charger les messages plus anciens
            </button>
          )}
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <Animal species={companion} size={76} />
              <p className="text-text-muted">Aucun message. Dis coucou !</p>
            </div>
          ) : (
            <MessageList
              messages={messages}
              myId={user?.id}
              emojis={emojis}
              onOpenImage={setViewing}
              onReact={react}
              onReply={(m) => {
                setEditing(null);
                setReplyTo(m);
              }}
              onEdit={(m) => {
                setReplyTo(null);
                setEditing(m);
              }}
              onReplay={play}
            />
          )}
          {typing && (
            <p className="mt-3 flex items-center gap-1.5 px-1 text-xs text-text-muted" aria-live="polite">
              <span className="mc-typing" aria-hidden="true"><i /><i /><i /></span>
              {typing} écrit…
            </p>
          )}
          <div className="h-2 shrink-0" />
        </div>
      </div>

      <ChatComposer connected={connected} onSend={send} replyTo={replyTo} myId={user?.id} onCancelReply={() => setReplyTo(null)} onTyping={onTyping}
        editing={editing}
        onSaveEdit={saveEdit}
        onCancelEdit={() => setEditing(null)}
      />

      {viewing && <ImageViewer asset={viewing} onClose={() => setViewing(null)} />}
      {playing && <ScreenEffect key={playing.key} effect={playing.effect} onDone={() => setPlaying(null)} />}
    </div>
  );
}

const PET_OPEN_KEY = "memocat.petOpen";

function readPetOpen(): boolean {
  try {
    return localStorage.getItem(PET_OPEN_KEY) !== "0";
  } catch {
    return true;
  }
}

function savePetOpen(open: boolean): boolean {
  try {
    localStorage.setItem(PET_OPEN_KEY, open ? "1" : "0");
  } catch {
    /* per-device convenience only */
  }
  return open;
}
