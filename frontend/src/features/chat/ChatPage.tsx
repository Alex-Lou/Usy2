import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Client } from "@stomp/stompjs";
import { useCompanion } from "../../app/companion";
import { Animal } from "../../components/ui/animals";
import { isBare, RichBody } from "../../components/rich/RichBody";
import { RichPicker } from "../../components/rich/RichPicker";
import { useRichInput } from "../../components/rich/useRichInput";
import { Avatar } from "../../components/ui/Avatar";
import { Icon } from "../../components/ui/Icon";
import { useAuth } from "../auth/useAuth";
import { getHistory } from "./api";
import { createChatClient, sendMessage } from "./chatClient";
import type { Message } from "./types";

/** Adds messages not seen yet, keeping chronological (id) order. */
function mergeById(prev: Message[], fresh: Message[]): Message[] {
  const known = new Set(prev.map((m) => m.id));
  return [...prev, ...fresh.filter((m) => !known.has(m.id))].sort((a, b) => a.id - b.id);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function ChatPage() {
  const { user } = useAuth();
  const { companion } = useCompanion();
  const [messages, setMessages] = useState<Message[]>([]);
  const { text, setText, ref: inputRef, insert } = useRichInput<HTMLInputElement>();
  const [connected, setConnected] = useState(false);
  const [page, setPage] = useState(0);
  const [hasOlder, setHasOlder] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const everConnected = useRef(false);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadOlder() {
    const next = page + 1;
    const p = await getHistory(next, 30);
    setMessages((prev) => [...[...p.content].reverse(), ...prev]);
    setPage(next);
    setHasOlder(next + 1 < p.totalPages);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const client = clientRef.current;
    if (!text.trim() || !client || !connected) return;
    sendMessage(client, text);
    setText("");
  }

  return (
    <div className="flex h-[calc(100dvh_-_8.5rem)] flex-col lg:h-[calc(100vh_-_5rem)]">
      <header className="mb-3 flex items-center gap-2 animate-fade-up">
        <h1 className="font-display text-2xl font-bold">Messages</h1>
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${connected ? "bg-accent shadow-glow" : "bg-text-muted"}`}
          title={connected ? "Connecté" : "Connexion…"}
        />
      </header>

      <div className="card flex-1 overflow-y-auto p-4">
        {hasOlder && (
          <button onClick={loadOlder} className="mx-auto mb-3 block text-xs text-text-muted hover:underline">
            Charger les messages plus anciens
          </button>
        )}
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Animal species={companion} size={76} />
            <p className="text-text-muted">Aucun message. Dis coucou !</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const mine = m.sender.id === user?.id;
              const bare = isBare(m.content); // lone sticker / few emojis: no bubble, shown big
              return (
                <div key={m.id} className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  {!mine && <Avatar name={m.sender.displayName} size={30} assetId={m.sender.avatarAssetId} species={m.sender.companion} />}
                  <div
                    className={
                      "max-w-[78%] animate-pop " +
                      (bare
                        ? ""
                        : "rounded-token px-3.5 py-2 " +
                          (mine ? "btn-brand rounded-br-sm" : "border border-border bg-surface-2 rounded-bl-sm"))
                    }
                  >
                    <RichBody text={m.content} />
                    <p className={`mt-1 text-right text-[10px] ${mine && !bare ? "text-primary-foreground/70" : "text-text-muted"}`}>
                      {formatTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="mt-3 flex items-center gap-1.5">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder={connected ? "Écris un message…" : "Connexion…"}
          className="flex-1 rounded-full border border-border bg-surface px-4 py-3 outline-none focus:border-primary/70"
        />
        <RichPicker
          onEmoji={insert}
          onSticker={(token) => {
            const client = clientRef.current;
            if (client && connected) sendMessage(client, token);
          }}
        />
        <button type="submit" disabled={!text.trim() || !connected} aria-label="Envoyer" className="grid h-12 w-12 place-items-center rounded-full btn-brand disabled:opacity-50 press">
          <Icon name="send" size={18} />
        </button>
      </form>
    </div>
  );
}
