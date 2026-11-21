import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LiveToast } from "../../components/layout/LiveToast";
import { ImageViewer } from "../../components/photo/ImageViewer";
import { NotificationsListener } from "../notifications/NotificationsListener";
import { Avatar } from "../../components/ui/Avatar";
import { Icon } from "../../components/ui/Icon";
import type { Asset } from "../../lib/api/assets";
import { flashElement } from "../../lib/flash";
import { useAuth } from "../auth/useAuth";
import type { Message } from "../chat/types";
import { getReactionEmojis } from "../feed/api";
import { getAllProfiles } from "../profile/api";
import type { Profile } from "../profile/types";
import { Composer } from "./Composer";
import { InfoView } from "./InfoView";
import { MessagesLogin } from "./MessagesLogin";
import { NotifPrompt } from "./NotifPrompt";
import { SearchView } from "./SearchView";
import { Thread } from "./Thread";
import { useConversation } from "./useConversation";

const SEEK_PAGES = 10; // how far back a search result or a link may send us (10 × 30 messages)


/** While Messages is on screen, the whole page wears its look (see messages.css). */
function useMessagesLook() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("msg-mode");
    return () => root.classList.remove("msg-mode");
  }, []);
}

/**
 * 💬 Messages, the app apart: the one conversation, sober, without MemoCat's
 * tabs and toys. Same account, same messages, live. Where we are lives in the
 * URL (?v=search, ?v=info, ?m=42 for a message), so « back » works, in the
 * browser as in the Android app.
 */
export function MessagesApp() {
  useMessagesLook();
  const { user, loading } = useAuth();
  if (loading) return <div className="msg-app" />;
  if (!user) return <MessagesLogin />;
  return <Conversation />;
}

function Conversation() {
  return (
    <>
      {/* Like MemoCat: the server knows this screen is looked at (no push meanwhile), new bell entries come live. */}
      <NotificationsListener />
      <LiveToast />
      <ConversationScreen />
    </>
  );
}

function ConversationScreen() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const view = params.get("v");
  const target = Number(params.get("m")) || null;
  const chat = useConversation(user?.id);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [emojis, setEmojis] = useState<string[]>([]);
  const [viewing, setViewing] = useState<Asset | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    getAllProfiles().then((all) => setPartner(all.find((p) => p.userId !== user?.id) ?? null)).catch(() => {});
    getReactionEmojis().then(setEmojis).catch(() => {});
  }, [user?.id]);

  // Pinned to the newest message while photos load and the keyboard opens, unless scrolled up.
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
  }, [view]);

  const loadOlder = useCallback(async () => {
    stickToBottom.current = false;
    await chat.loadOlder();
  }, [chat.loadOlder]);

  // ?m=42 (a search result, a notification): bring that message into view,
  // loading older pages as needed, a bounded number of times.
  const seek = useRef<{ id: number; pages: number; busy: boolean; done: boolean } | null>(null);
  const [seekTick, setSeekTick] = useState(0);
  useEffect(() => {
    if (!target || view || !chat.loaded) return;
    if (seek.current?.id !== target) seek.current = { id: target, pages: 0, busy: false, done: false };
    const s = seek.current;
    if (s.done || s.busy) return;
    if (chat.messages.some((m) => m.id === target)) {
      s.done = true;
      stickToBottom.current = false;
      requestAnimationFrame(() => flashElement(`msg-${target}`));
    } else if (chat.hasOlder && s.pages < SEEK_PAGES) {
      s.pages++;
      s.busy = true;
      loadOlder()
        .catch(() => (s.done = true))
        .finally(() => {
          s.busy = false;
          setSeekTick((t) => t + 1);
        });
    } else {
      s.done = true;
      setNotice("Ce message est trop ancien pour être affiché ici.");
    }
  }, [target, view, chat.loaded, chat.messages, chat.hasOlder, loadOlder, seekTick]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(t);
  }, [notice]);

  const partnerName = partner?.displayName ?? "…";

  if (view === "search") {
    return (
      <div className="msg-app">
        <SearchView myName={user?.displayName ?? ""} onBack={() => setParams({})} onOpen={(id) => setParams({ m: String(id) }, { replace: true })} />
      </div>
    );
  }
  if (view === "info") {
    return (
      <div className="msg-app">
        <InfoView partner={partner} onBack={() => setParams({})} onSearch={() => setParams({ v: "search" }, { replace: true })} />
      </div>
    );
  }

  const status = chat.typing ? "écrit…" : chat.slow ? "Connexion…" : null;
  return (
    <div className="msg-app">
      <header className="msg-bar shrink-0">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-2">
        <button type="button" onClick={() => setParams({ v: "info" })} className="flex min-w-0 flex-1 items-center gap-3 text-left press" aria-label={`Infos sur ${partnerName}`}>
          {partner ? (
            <Avatar name={partner.displayName} size={40} assetId={partner.avatarAssetId} framing={partner.avatarFraming} />
          ) : (
            <span className="h-10 w-10 rounded-full bg-surface" aria-hidden="true" />
          )}
          <span className="min-w-0 leading-tight">
            <b className="block truncate text-base font-bold tracking-tight">{partnerName}</b>
            {status && <span className={"block text-[12.5px] " + (chat.typing ? "text-primary" : "text-text-muted")} aria-live="polite">{status}</span>}
          </span>
        </button>
        <button type="button" onClick={() => setParams({ v: "search" })} aria-label="Rechercher" className="grid h-10 w-10 place-items-center rounded-full press">
          <Icon name="search" size={21} />
        </button>
        </div>
      </header>

      <NotifPrompt />

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto px-3"
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        <div ref={contentRef} className="mx-auto flex min-h-full max-w-3xl flex-col justify-end py-2">
          {chat.hasOlder && (
            <button type="button" onClick={() => void loadOlder()} className="mx-auto my-2 block text-xs text-text-muted hover:underline">
              Messages plus anciens
            </button>
          )}
          {chat.failed && !chat.loaded && (
            <p className="m-auto p-6 text-center text-sm text-text-muted">
              Les messages ne se chargent pas. <button type="button" onClick={chat.loadLatest} className="underline">Réessayer</button>
            </p>
          )}
          {chat.loaded && chat.messages.length === 0 && <p className="m-auto p-6 text-center text-sm text-text-muted">Pas encore de message. Dis bonjour 👋</p>}
          <Thread
            messages={chat.messages}
            myId={user?.id}
            partnerName={partnerName}
            emojis={emojis}
            onOpenImage={setViewing}
            onReact={chat.react}
            onReply={(m) => {
              setEditing(null);
              setReplyTo(m);
            }}
            onEdit={(m) => {
              setReplyTo(null);
              setEditing(m);
            }}
          />
          {chat.outbox.map((o) => (
            <div key={o.key} className="msg-out msg-tail mt-0.5 flex flex-col items-end">
              <div className="msg-bubble max-w-[82%] opacity-70">
                {o.text || (o.attachment ? "📎 Pièce jointe" : "")}
                <span className="msg-meta float-right ml-4 mt-1 leading-none">En attente…</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {notice && <p role="status" className="msg-sheet mx-auto mb-1 rounded-full px-4 py-1.5 text-xs">{notice}</p>}

      <div className="mx-auto w-full max-w-3xl shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <Composer
          partnerName={partnerName}
          myId={user?.id}
          replyTo={replyTo}
          editing={editing}
          onSend={(text, attachment) => {
            stickToBottom.current = true;
            chat.send(text, attachment, replyTo?.id ?? null);
            setReplyTo(null);
          }}
          onSaveEdit={(text) => {
            if (editing) chat.edit(editing, text);
            setEditing(null);
          }}
          onCancel={() => {
            setReplyTo(null);
            setEditing(null);
          }}
          onTyping={chat.notifyTyping}
        />
      </div>

      {viewing && <ImageViewer asset={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
