import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { Client } from "@stomp/stompjs";
import { useAuth } from "../auth/useAuth";
import { getHistory } from "./api";
import { createChatClient, sendMessage } from "./chatClient";
import type { Message } from "./types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]); // oldest -> newest
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [page, setPage] = useState(0);
  const [hasOlder, setHasOlder] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initial history (newest first from API -> reversed for display).
  useEffect(() => {
    getHistory(0, 30)
      .then((p) => {
        setMessages([...p.content].reverse());
        setHasOlder(p.totalPages > 1);
        setPage(0);
      })
      .catch(() => {});
  }, []);

  // Live connection.
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

  // Auto-scroll to the latest message.
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
    <div className="mx-auto flex h-screen max-w-2xl flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <Link to="/" className="text-sm text-text-muted hover:underline">← Accueil</Link>
        <h1 className="flex items-center gap-2 text-lg font-bold text-primary">
          Messages
          <span
            className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-text-muted"}`}
            title={connected ? "Connecté" : "Déconnecté"}
          />
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto rounded-token border border-border bg-surface p-4">
        {hasOlder && (
          <button onClick={loadOlder} className="mx-auto mb-3 block text-xs text-text-muted hover:underline">
            Charger les messages plus anciens
          </button>
        )}
        {messages.length === 0 ? (
          <p className="text-center text-text-muted">Aucun message. Dis coucou 💬</p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((m) => {
              const mine = m.sender.id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-token px-3 py-2 ${
                      mine ? "bg-primary text-primary-foreground" : "bg-bg text-text"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={`mt-1 text-right text-[10px] ${mine ? "text-primary-foreground/70" : "text-text-muted"}`}>
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

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder={connected ? "Écris un message…" : "Connexion…"}
          className="flex-1 rounded-token border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={!text.trim() || !connected}
          className="rounded-token bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
