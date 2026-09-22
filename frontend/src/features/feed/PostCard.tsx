import { useState } from "react";
import { AssetImage } from "../../components/AssetImage";
import { deletePost, react, unreact, updatePost } from "./api";
import { Comments } from "./Comments";
import type { Post } from "./types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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

  async function toggleReaction(emoji: string) {
    const summary = post.reactions.find((r) => r.emoji === emoji);
    const updated = summary?.reactedByMe
      ? await unreact(post.id, emoji)
      : await react(post.id, emoji);
    onChanged(updated);
  }

  async function saveEdit() {
    if (!editText.trim()) return;
    setBusy(true);
    try {
      const updated = await updatePost(post.id, editText, post.imageAssetId);
      onChanged(updated);
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
    <article className="rounded-token border border-border bg-surface p-4">
      <header className="mb-2 flex items-center justify-between">
        <div className="text-sm">
          <span className="font-semibold text-primary">{post.author.displayName}</span>
          <span className="text-text-muted"> · {formatDate(post.createdAt)}</span>
          {post.edited && <span className="text-text-muted"> · modifié</span>}
        </div>
        {isOwn && !editing && (
          <div className="flex gap-2 text-xs">
            <button onClick={() => setEditing(true)} className="text-text-muted hover:underline">
              Éditer
            </button>
            <button onClick={remove} className="text-text-muted hover:text-danger">
              Supprimer
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
            className="w-full resize-none rounded-token border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={saveEdit}
              disabled={busy}
              className="rounded-token bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Enregistrer
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditText(post.text);
              }}
              className="rounded-token border border-border px-3 py-1.5 text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-text">{post.text}</p>
      )}

      {post.imageAssetId && (
        <AssetImage
          assetId={post.imageAssetId}
          className="mt-3 max-h-96 w-full rounded-token object-cover"
        />
      )}

      {/* Reactions */}
      <div className="mt-3 flex flex-wrap gap-1">
        {emojis.map((emoji) => {
          const summary = post.reactions.find((r) => r.emoji === emoji);
          const active = summary?.reactedByMe ?? false;
          return (
            <button
              key={emoji}
              onClick={() => toggleReaction(emoji)}
              className={`rounded-token border px-2 py-1 text-sm transition-colors ${
                active ? "border-primary bg-primary/10" : "border-border hover:bg-bg"
              }`}
            >
              <span>{emoji}</span>
              {summary && summary.count > 0 && (
                <span className="ml-1 text-xs text-text-muted">{summary.count}</span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setShowComments((s) => !s)}
        className="mt-3 text-sm text-text-muted hover:underline"
      >
        💬 {commentCount} commentaire{commentCount > 1 ? "s" : ""}
      </button>

      {showComments && (
        <Comments postId={post.id} onCountChange={(d) => setCommentCount((c) => c + d)} />
      )}
    </article>
  );
}
