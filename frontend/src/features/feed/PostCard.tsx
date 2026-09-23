import { useState } from "react";
import { AssetImage } from "../../components/AssetImage";
import { EffectLayer } from "../../components/photo/EffectLayer";
import { Avatar } from "../../components/ui/Avatar";
import { LinkPreview } from "../../components/rich/LinkPreview";
import { firstUrl, linkify } from "../../components/rich/links";
import { Icon } from "../../components/ui/Icon";
import { ImageViewer } from "../chat/ImageViewer";
import { deletePost, react, unreact, updatePost } from "./api";
import { Comments } from "./Comments";
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
}: {
  post: Post;
  currentUserId: number | undefined;
  emojis: string[];
  onChanged: (updated: Post) => void;
  onDeleted: (id: number) => void;
}) {
  const isOwn = post.author.id === currentUserId;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(false);

  async function toggleReaction(emoji: string) {
    const summary = post.reactions.find((r) => r.emoji === emoji);
    onChanged(summary?.reactedByMe ? await unreact(post.id, emoji) : await react(post.id, emoji));
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
        <Avatar name={post.author.displayName} size={42} assetId={post.author.avatarAssetId} species={post.author.companion} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{post.author.displayName}</p>
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
        <p className="whitespace-pre-wrap break-words leading-relaxed">{linkify(post.text)}</p>
      )}

      {!editing && !post.imageAssetId && firstUrl(post.text) && <LinkPreview url={firstUrl(post.text)!} className="mt-3" />}

      {post.imageAssetId && (
        <button type="button" onClick={() => setViewing(true)} className="mt-3 block w-full press" aria-label="Agrandir la photo">
          <EffectLayer effect={post.imageEffect} className="rounded-token">
            <AssetImage assetId={post.imageAssetId} className="max-h-[28rem] w-full rounded-token border border-border object-cover" />
          </EffectLayer>
        </button>
      )}
      {viewing && post.imageAssetId && (
        <ImageViewer
          asset={{ id: post.imageAssetId, originalFilename: `memocat-${post.id}.jpg` }}
          onClose={() => setViewing(false)}
        />
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {emojis.map((emoji) => {
          const summary = post.reactions.find((r) => r.emoji === emoji);
          const active = summary?.reactedByMe ?? false;
          return (
            <button
              key={emoji}
              onClick={() => toggleReaction(emoji)}
              className={
                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm transition press " +
                (active
                  ? "border-primary/60 bg-primary/15 text-text shadow-glow"
                  : "border-border bg-bg-2/40 hover:border-primary/40")
              }
            >
              <span>{emoji}</span>
              {summary && summary.count > 0 && (
                <span className="text-xs font-semibold text-text-muted">{summary.count}</span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setShowComments((s) => !s)}
        className="mt-3 flex items-center gap-1.5 text-sm text-text-muted transition hover:text-text press"
      >
        <Icon name="chat" size={16} />
        {commentCount} commentaire{commentCount > 1 ? "s" : ""}
      </button>

      {showComments && <Comments postId={post.id} onCountChange={(d) => setCommentCount((c) => c + d)} />}
    </article>
  );
}
