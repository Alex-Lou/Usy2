import { useEffect, useState, type FormEvent } from "react";
import { RichBody } from "../../components/rich/RichBody";
import { RichPicker } from "../../components/rich/RichPicker";
import { isSendKey, useAutoGrow, useRichInput } from "../../components/rich/useRichInput";
import { Avatar } from "../../components/ui/Avatar";
import { ProfileLink } from "../../components/ui/ProfileLink";
import { Icon } from "../../components/ui/Icon";
import { useAuth } from "../auth/useAuth";
import { addComment, deleteComment, listComments } from "./api";
import type { Comment } from "./types";

export function Comments({
  postId,
  onCountChange,
}: {
  postId: number;
  onCountChange: (delta: number) => void;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<Comment[]>([]);
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
            <div className="flex-1 rounded-token rounded-tl-sm bg-bg-2/50 px-3 py-2">
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
          </div>
        ))}
        {page + 1 < totalPages && (
          <button onClick={loadMore} className="self-start text-xs text-text-muted hover:underline">
            Voir plus de commentaires
          </button>
        )}
      </div>

    </div>
  );
}
