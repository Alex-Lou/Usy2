import { Fragment, useRef, useState } from "react";
import { AssetImage } from "../../components/AssetImage";
import { EffectLayer } from "../../components/photo/EffectLayer";
import { Avatar } from "../../components/ui/Avatar";
import { LinkPreview } from "../../components/rich/LinkPreview";
import { firstUrl } from "../../components/rich/links";
import { Icon } from "../../components/ui/Icon";
import { ProfileLink } from "../../components/ui/ProfileLink";
import { ImageViewer } from "../../components/photo/ImageViewer";
import { ReactionBar } from "../chat/MessageReactions";
import { deletePost, react, unreact, updatePost } from "./api";
import { Comments } from "./Comments";
import { usePeople, withMentions } from "./mentions";
import type { Post } from "./types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function PostCard({
  post,
  currentUserId,
  emojis,
  onChanged,
  onDeleted,
  initialShowComments = false,
  highlightCommentId = null,
}: {
  post: Post;
  currentUserId: number | undefined;
  emojis: string[];
  onChanged: (updated: Post) => void;
  onDeleted: (id: number) => void;
  /** Opened from a comment notification: comments already shown. */
  initialShowComments?: boolean;
  highlightCommentId?: number | null;
}) {
  const isOwn = post.author.id === currentUserId;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const people = usePeople();
  const [showComments, setShowComments] = useState(initialShowComments);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [burst, setBurst] = useState(0); // a heart blooms on the photo (double tap)
  const tapTimer = useRef<number | null>(null);

  // One reaction per person, like Facebook: picking another emoji replaces mine, the same one removes it.
  const mine = post.reactions.filter((r) => r.reactedByMe).map((r) => r.emoji);
  const total = post.reactions.reduce((n, r) => n + r.count, 0);
  const top = [...post.reactions].filter((r) => r.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);
  const [picker, setPicker] = useState<DOMRect | null>(null);
  const likeRef = useRef<HTMLButtonElement>(null);
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false); // the long press opened the picker: the click that follows does nothing

  async function pick(emoji: string) {
    let updated = post;
    for (const e of mine) if (e !== emoji) updated = await unreact(post.id, e);
    updated = mine.includes(emoji) ? await unreact(post.id, emoji) : await react(post.id, emoji);
    onChanged(updated);
  }

  function openPicker() {
    if (likeRef.current) setPicker(likeRef.current.getBoundingClientRect());
  }

  function startHold(delay: number) {
    stopHold();
    held.current = false;
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      navigator.vibrate?.(10);
      openPicker();
    }, delay);
  }

  function stopHold() {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }

  // One tap opens the photo; a quick second tap likes it instead (❤️, never un-likes).
  function tapPhoto() {
    if (tapTimer.current !== null) {
      window.clearTimeout(tapTimer.current);
      tapTimer.current = null;
      setBurst(Date.now());
      if (!mine.includes("❤️")) void pick("❤️");
      return;
    }
    tapTimer.current = window.setTimeout(() => {
      tapTimer.current = null;
      setViewing(true);
    }, 260);
  }

  async function saveEdit() {
    if (!editText.trim()) return;
    setBusy(true);
    try {
      onChanged(await updatePost(post.id, editText, post.imageAssetId));
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Supprimer ce post ?")) return;
    await deletePost(post.id);
    onDeleted(post.id);
  }

  return (
    <article className="card animate-fade-up overflow-hidden p-4">
      <header className="mb-3 flex items-center gap-3">
        <ProfileLink userId={post.author.id} className="shrink-0 rounded-full">
          <Avatar name={post.author.displayName} size={42} assetId={post.author.avatarAssetId} framing={post.author.avatarFraming} species={post.author.companion} />
        </ProfileLink>
        <div className="min-w-0 flex-1">
          <ProfileLink userId={post.author.id} className="block truncate font-semibold hover:underline">
            {post.author.displayName}
          </ProfileLink>
          <p className="text-xs text-text-muted">
            {timeAgo(post.createdAt)}
            {post.edited && " · modifié"}
          </p>
        </div>
        {isOwn && !editing && (
          <div className="flex gap-1">
            <button onClick={() => setEditing(true)} aria-label="Éditer" className="grid h-8 w-8 place-items-center rounded-token-sm text-text-muted hover:text-text press">
              <Icon name="sliders" size={17} />
            </button>
            <button onClick={remove} aria-label="Supprimer" className="grid h-8 w-8 place-items-center rounded-token-sm text-text-muted hover:text-danger press">
              <Icon name="trash" size={17} />
            </button>
          </div>
        )}
      </header>

      {editing ? (
        <div>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full resize-none rounded-token border border-border bg-bg-2/60 px-3 py-2 outline-none focus:border-primary/70"
          />
          <div className="mt-2 flex gap-2">
            <button onClick={saveEdit} disabled={busy} className="btn-brand rounded-token px-3 py-1.5 text-sm font-semibold disabled:opacity-50 press">
              Enregistrer
            </button>
            <button onClick={() => { setEditing(false); setEditText(post.text); }} className="rounded-token border border-border px-3 py-1.5 text-sm press">
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {withMentions(post.text, people).map((n, i) => <Fragment key={i}>{n}</Fragment>)}
        </p>
      )}

      {!editing && !post.imageAssetId && firstUrl(post.text) && <LinkPreview url={firstUrl(post.text)!} className="mt-3" />}

      {post.imageAssetId && (
        <button
          type="button"
          onClick={tapPhoto}
          className="relative -mx-4 mt-3 block w-[calc(100%+2rem)] touch-manipulation"
          aria-label="Agrandir la photo (deux fois : ❤️)"
        >
          {/* Edge to edge in the card, like a photo post should be. */}
          <EffectLayer effect={post.imageEffect}>
            <AssetImage assetId={post.imageAssetId} ratio={4 / 3} className="max-h-[32rem] w-full object-cover" />
          </EffectLayer>
          {burst > 0 && (
            <span key={burst} data-heart-burst="" className="mc-heart-burst pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
              <span className="mc-emoji text-7xl drop-shadow-lg">❤️</span>
            </span>
          )}
        </button>
      )}
      {viewing && post.imageAssetId && (
        <ImageViewer
          asset={{ id: post.imageAssetId, originalFilename: `memocat-${post.id}.jpg` }}
          onClose={() => setViewing(false)}
        />
      )}

      {(total > 0 || commentCount > 0) && (
        <div className="mt-3 flex items-center justify-between gap-2 text-sm text-text-muted">
          {total > 0 ? (
            <button type="button" onClick={openPicker} className="flex items-center gap-1.5 press hover:text-text" aria-label={`${total} réaction${total > 1 ? "s" : ""}`}>
              <span className="flex -space-x-1">
                {top.map((r) => (
                  <span key={r.emoji} className="grid h-5 w-5 place-items-center rounded-full bg-surface-2 text-xs ring-2 ring-surface">
                    {r.emoji}
                  </span>
                ))}
              </span>
              {total}
            </button>
          ) : (
            <span />
          )}
          {commentCount > 0 && (
            <button type="button" onClick={() => setShowComments((s) => !s)} className="press hover:text-text hover:underline">
              {commentCount} commentaire{commentCount > 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}

      <div className="mt-2 grid grid-cols-2 gap-1 border-t border-border pt-1">
        <button
          ref={likeRef}
          type="button"
          onPointerDown={(e) => e.pointerType !== "mouse" && startHold(450)}
          onPointerEnter={(e) => e.pointerType === "mouse" && startHold(600)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => {
            if (held.current) {
              held.current = false;
              return;
            }
            stopHold();
            void pick(mine[0] ?? "❤️");
          }}
          aria-label={mine.length ? "Retirer ma réaction (appui long : changer)" : "J'aime (appui long : autres réactions)"}
          className={
            "flex select-none items-center justify-center gap-2 rounded-token py-2 text-sm font-semibold transition press hover:bg-surface-2 " +
            (mine.length ? "text-primary" : "text-text-muted")
          }
        >
          {mine.length ? <span className="text-base leading-none">{mine[0]}</span> : <Icon name="heart" size={18} />}
          {mine.length && mine[0] !== "❤️" ? "Réagi" : "J'aime"}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          aria-expanded={showComments}
          className="flex items-center justify-center gap-2 rounded-token py-2 text-sm font-semibold text-text-muted transition press hover:bg-surface-2"
        >
          <Icon name="chat" size={18} /> Commenter
        </button>
      </div>

      {picker && (
        <ReactionBar
          anchor={picker}
          mine={false}
          emojis={emojis}
          current={mine[0] ?? null}
          copyText={null}
          onPick={(emoji) => {
            setPicker(null);
            void pick(emoji);
          }}
          onClose={() => setPicker(null)}
        />
      )}

      {showComments && <Comments postId={post.id} emojis={emojis} highlightId={highlightCommentId} onCountChange={(d) => setCommentCount((c) => c + d)} />}
    </article>
  );
}
