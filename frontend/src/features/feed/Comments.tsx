import { useEffect, useState, type FormEvent } from "react";
import { RichBody } from "../../components/rich/RichBody";
import { RichPicker } from "../../components/rich/RichPicker";
import { isSendKey, useAutoGrow, useRichInput } from "../../components/rich/useRichInput";
import { Avatar } from "../../components/ui/Avatar";
import { ProfileLink } from "../../components/ui/ProfileLink";
import { Icon } from "../../components/ui/Icon";
import { useAuth } from "../auth/useAuth";
import { LongPress, ReactionBar, ReactionPills } from "../chat/MessageReactions";
import { onCommentReactions } from "./activity";
import { addComment, deleteComment, listComments, reactToComment } from "./api";
import type { Comment, CommentReaction } from "./types";

export function Comments({
  postId,
  emojis,
  onCountChange,
}: {
  postId: number;
  emojis: string[];
  onCountChange: (delta: number) => void;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<Comment[]>([]);
  const [menu, setMenu] = useState<{ comment: Comment; anchor: DOMRect } | null>(null);
  const myReaction = (c: Comment) => (c.reactions ?? []).find((r) => r.userId === user?.id)?.emoji ?? null;

  const setReactions = (commentId: number, reactions: CommentReaction[]) =>
    setItems((list) => list.map((c) => (c.id === commentId ? { ...c, reactions } : c)));

  // The other person's reactions arrive live (and mine from my other devices).
  useEffect(
    () => onCommentReactions((c) => setItems((list) => list.map((x) => (x.id === c.commentId ? { ...x, reactions: c.reactions } : x)))),
    [],
  );

  // Optimistic: my emoji shows at once, and goes back if the server refuses.
  function react(commentId: number, emoji: string | null) {
    const me = user?.id;
    if (me == null) return;
    const before = items.find((c) => c.id === commentId)?.reactions ?? [];
    const others = before.filter((r) => r.userId !== me);
    setReactions(commentId, emoji ? [...others, { userId: me, emoji }] : others);
    reactToComment(commentId, emoji)
      .then((r) => setReactions(r.commentId, r.reactions))
      .catch(() => setReactions(commentId, before));
  }
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const { text, setText, ref, insert, rememberCaret } = useRichInput<HTMLTextAreaElement>();
  useAutoGrow(ref, text, 120);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listComments(postId, 0, 20)
      .then((p) => {
        if (!cancelled) {
          setItems(p.content);
          setTotalPages(p.totalPages);
          setPage(0);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [postId]);

  async function loadMore() {
    const next = page + 1;
    const p = await listComments(postId, next, 20);
    setItems((prev) => [...prev, ...p.content]);
    setPage(next);
    setTotalPages(p.totalPages);
  }

  // Shared by the text box and the sticker picker (a sticker is sent as-is).
  async function send(content: string, clearInput: boolean) {
    if (!content.trim() || busy) return;
    setBusy(true);
    try {
      const c = await addComment(postId, content);
      setItems((prev) => [...prev, c]);
      if (clearInput) setText("");
      onCountChange(1);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void send(text, true);
  }

  async function remove(id: number) {
    await deleteComment(id);
    setItems((prev) => prev.filter((c) => c.id !== id));
    onCountChange(-1);
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      {/* The box comes first: nothing moves when the comments finish loading. */}
      <form onSubmit={submit} className="flex items-end gap-1.5">
        <textarea
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (isSendKey(e)) {
              e.preventDefault();
              void send(text, true);
            }
          }}
          onBlur={rememberCaret}
          maxLength={1000}
          placeholder="Écrire un commentaire…"
          className="min-h-10 flex-1 resize-none rounded-3xl border border-border bg-bg-2/60 px-4 py-2 text-sm leading-snug outline-none focus:border-primary/70"
        />
        <RichPicker onEmoji={insert} onSticker={(token) => void send(token, false)} />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Envoyer" className="grid h-10 w-10 shrink-0 place-items-center rounded-full btn-brand disabled:opacity-50 press">
          <Icon name="send" size={16} />
        </button>
      </form>

      <div className="mt-3 flex flex-col gap-3">
        {items.map((c) => (
          <div key={c.id} className="flex items-start gap-2.5">
            <ProfileLink userId={c.author.id} className="shrink-0 rounded-full">
              <Avatar name={c.author.displayName} size={30} assetId={c.author.avatarAssetId} species={c.author.companion} />
            </ProfileLink>
            <div id={`comment-${c.id}`} className="flex min-w-0 flex-1 flex-col items-start">
            <LongPress onLongPress={(anchor) => setMenu({ comment: c, anchor })}>
            <div className="rounded-token rounded-tl-sm bg-bg-2/50 px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <ProfileLink userId={c.author.id} className="text-sm font-semibold text-primary hover:underline">
                  {c.author.displayName}
                </ProfileLink>
                {user?.id === c.author.id && (
                  <button onClick={() => remove(c.id)} aria-label="Supprimer" className="text-text-muted hover:text-danger press">
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>
              <RichBody text={c.text} className="text-sm" />
            </div>
            </LongPress>
            <ReactionPills
              reactions={c.reactions ?? []}
              myId={user?.id}
              onOpen={() => {
                const el = document.getElementById(`comment-${c.id}`);
                if (el) setMenu({ comment: c, anchor: el.getBoundingClientRect() });
              }}
            />
            </div>
          </div>
        ))}
        {page + 1 < totalPages && (
          <button onClick={loadMore} className="self-start text-xs text-text-muted hover:underline">
            Voir plus de commentaires
          </button>
        )}
      </div>

      {menu && (
        <ReactionBar
          anchor={menu.anchor}
          mine={false}
          emojis={emojis}
          current={myReaction(menu.comment)}
          copyText={menu.comment.text}
          onPick={(emoji) => {
            react(menu.comment.id, myReaction(menu.comment) === emoji ? null : emoji);
            setMenu(null);
          }}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
