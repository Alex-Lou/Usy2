import { useCallback, useEffect, useRef, useState } from "react";
import type { Client } from "@stomp/stompjs";
import { useCompanion } from "../../app/companion";
import { Animal } from "../../components/ui/animals";
import { Avatar } from "../../components/ui/Avatar";
import type { Asset } from "../../lib/api/assets";
import { useAuth } from "../auth/useAuth";
import { getAllProfiles } from "../profile/api";
import type { Profile } from "../profile/types";
import { getHistory } from "./api";
import { ChatComposer } from "./ChatComposer";
import { createChatClient, sendMessage } from "./chatClient";
import { ImageViewer } from "./ImageViewer";
import { MessageList } from "./MessageList";
import type { Message } from "./types";

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
  const clientRef = useRef<Client | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const everConnected = useRef(false);
  const stickToBottom = useRef(true);

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
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const client = createChatClient(
      (m) => setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m])),
      setConnected,
    );
    clientRef.current = client;
    return () => {
      void client.deactivate();
    };
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

  // Stay pinned to the newest message — also while photos load and grow the
  // list — unless the user scrolled up to read older ones.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (!scroller || !content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (stickToBottom.current) scroller.scrollTop = scroller.scrollHeight;
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  async function loadOlder() {
    const next = page + 1;
    const p = await getHistory(next, 30);
    stickToBottom.current = false;
    setMessages((prev) => mergeById(prev, [...p.content].reverse()));
    setPage(next);
    setHasOlder(next + 1 < p.totalPages);
  }

  const send = useCallback((text: string, attachment: Asset | null) => {
    const client = clientRef.current;
    if (!client) return;
    stickToBottom.current = true;
    sendMessage(client, text, attachment?.id ?? null);
  }, []);

  return (
    <div className="flex h-[calc(100dvh-var(--topbar-h)-var(--tabbar-h)-2rem)] flex-col gap-3 lg:h-[calc(100dvh-5rem)]">
      <header className="flex items-center gap-3 animate-fade-up">
        {partner && <Avatar name={partner.displayName} size={40} assetId={partner.avatarAssetId} species={partner.companion} />}
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-bold leading-tight">{partner?.displayName ?? "Messages"}</h1>
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-accent shadow-glow" : "bg-text-muted"}`} />
            {connected ? "Connecté" : "Connexion…"}
          </p>
        </div>
      </header>

      <div
        ref={scrollerRef}
        className="card min-h-0 flex-1 overflow-y-auto px-3 py-2"
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        <div ref={contentRef} className="flex min-h-full flex-col">
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
            <MessageList messages={messages} myId={user?.id} onOpenImage={setViewing} />
          )}
          <div className="h-2 shrink-0" />
        </div>
      </div>

      <ChatComposer connected={connected} onSend={send} />

      {viewing && <ImageViewer asset={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
