import { useEffect, useRef, useState, type FormEvent } from "react";
import { AssetImage } from "../../components/AssetImage";
import { ImageViewer } from "../../components/photo/ImageViewer";
import { GifPicker } from "../../components/rich/GifPicker";
import { RichBody } from "../../components/rich/RichBody";
import { uploadImage, type Asset } from "../../lib/api/assets";
import { RichPicker } from "../../components/rich/RichPicker";
import { isSendKey, useAutoGrow, useRichInput } from "../../components/rich/useRichInput";
import { Avatar } from "../../components/ui/Avatar";
import { ProfileLink } from "../../components/ui/ProfileLink";
import { Icon } from "../../components/ui/Icon";
import { flashElement } from "../../lib/flash";
import { useAuth } from "../auth/useAuth";
import { LongPress, ReactionBar, ReactionPills } from "../chat/MessageReactions";
import { onCommentReactions } from "./activity";
import { addComment, deleteComment, listComments, reactToComment } from "./api";
import { MentionSuggest, usePeople, withMentions } from "./mentions";
import { photoName, type Comment, type CommentReaction } from "./types";

/** Where a new comment goes: at the end, or (a reply) right after the last of its thread. */
function placed(list: Comment[], c: Comment): Comment[] {
  if (c.parentId == null) return [...list, c];
  let at = list.length;
  list.forEach((x, i) => {
    if (x.id === c.parentId || x.parentId === c.parentId) at = i + 1;
  });
  return [...list.slice(0, at), c, ...list.slice(at)];
}

export function Comments({
  postId,
  emojis,
  onCountChange,
  highlightId = null,
}: {
  postId: number;
  emojis: string[];
  onCountChange: (delta: number) => void;
  /** Comment a notification points to: brought into view once loaded. */
  highlightId?: number | null;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<Comment[]>([]);
  const [menu, setMenu] = useState<{ comment: Comment; anchor: DOMRect } | null>(null);
  const highlightedRef = useRef(false);
  useEffect(() => {
    if (highlightId == null || highlightedRef.current || !items.some((c) => c.id === highlightId)) return;
    highlightedRef.current = true;
    requestAnimationFrame(() => flashElement(`comment-${highlightId}`));
  }, [highlightId, items]);
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
  const [error, setError] = useState<string | null>(null);
  // A photo of the phone (a GIF of the gallery or the keyboard too) going with the next comment.
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [attachMenu, setAttachMenu] = useState(false);
  const [gifs, setGifs] = useState(false);
  const [viewing, setViewing] = useState<Comment | null>(null);
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.preview);
  }, [photo]);
  function attach(file: File | undefined) {
    setAttachMenu(false);
    if (!file || !file.type.startsWith("image/") || file.type === "image/svg+xml") return;
    setPhoto({ file, preview: URL.createObjectURL(file) });
    ref.current?.focus();
  }
  const people = usePeople();
  const [caret, setCaret] = useState(0);
  // Answering a comment: its thread (the top-level comment) and whom.
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);

  function reply(c: Comment) {
    setReplyTo({ id: c.parentId ?? c.id, name: c.author.displayName });
    // Tags the person answered (not myself), unless the text already does.
    const tag = `@${c.author.displayName} `;
    const next = c.author.id !== user?.id && !text.includes(tag.trim()) ? tag + text : text;
    setText(next);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(next.length, next.length);
      setCaret(next.length);
    });
  }

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

  // Shared by the text box (with the photo waiting, if any), the sticker picker (a sticker is sent
  // as-is) and the GIF search (a GIF picked goes at once, already kept by the server).
  async function send(content: string, fromBox: boolean, gif: Asset | null = null) {
    const withPhoto = fromBox ? photo : null;
    if ((!content.trim() && !withPhoto && !gif) || busy) return;
    setBusy(true);
    setError(null);
    try {
      const image = gif ?? (withPhoto ? await uploadImage(withPhoto.file) : null);
      const c = await addComment(postId, content, replyTo?.id ?? null, image?.id ?? null);
      setItems((prev) => placed(prev, c));
      setReplyTo(null);
      if (fromBox) {
        setText("");
        setPhoto(null);
      }
      onCountChange(1);
    } catch {
      setError("Le commentaire n'a pas pu partir, réessaie.");
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void send(text, true);
  }

  // Deleting a comment takes its replies with it (the server does the same).
  async function remove(id: number) {
    await deleteComment(id);
    const gone = items.filter((c) => c.id === id || c.parentId === id).length;
    setItems((prev) => prev.filter((c) => c.id !== id && c.parentId !== id));
    if (replyTo?.id === id) setReplyTo(null);
    onCountChange(-gone);
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      {/* The box comes first: nothing moves when the comments finish loading. */}
      {replyTo && (
        <p className="mb-1.5 flex items-center gap-2 text-xs text-text-muted">
          <span>↩ Réponse à <b className="text-text">{replyTo.name}</b></span>
          <button type="button" onClick={() => setReplyTo(null)} aria-label="Ne plus répondre" className="press hover:text-text">
            <Icon name="x" size={12} />
          </button>
        </p>
      )}
      {photo && (
        <div className="relative mb-2 inline-block">
          <img src={photo.preview} alt="Photo jointe" className="max-h-32 rounded-token border border-border object-cover" />
          <button
            type="button"
            onClick={() => setPhoto(null)}
            aria-label="Retirer la photo"
            className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white press"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      )}
      <form onSubmit={submit} className="flex items-end gap-1.5">
        <div className="relative">
          <button
            type="button"
            onClick={() => setAttachMenu((o) => !o)}
            aria-label="Joindre une photo ou un GIF"
            aria-expanded={attachMenu}
            className={"grid h-10 w-10 shrink-0 place-items-center rounded-full press hover:text-primary " + (attachMenu ? "text-primary" : "text-text-muted")}
          >
            <Icon name="images" size={20} />
          </button>
          {attachMenu && <div className="fixed inset-0 z-10" onClick={() => setAttachMenu(false)} aria-hidden="true" />}
          {attachMenu && (
            <div className="absolute bottom-12 left-0 z-20 w-56 overflow-hidden rounded-token border border-border bg-surface shadow-card animate-pop">
              <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface-2">
                <Icon name="images" size={18} className="text-primary" />
                <span className="text-sm font-semibold">Photo ou GIF du téléphone</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    attach(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setAttachMenu(false);
                  setGifs(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2"
              >
                <span className="rounded border-2 border-primary px-0.5 text-[9px] font-bold leading-tight text-primary">GIF</span>
                <span className="text-sm font-semibold">Chercher un GIF</span>
              </button>
            </div>
          )}
        </div>
        <textarea
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setCaret(e.target.selectionStart ?? e.target.value.length);
          }}
          onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
          onKeyDown={(e) => {
            if (isSendKey(e)) {
              e.preventDefault();
              void send(text, true);
            }
          }}
          onBlur={rememberCaret}
          // A photo or GIF pasted (the phone keyboard's GIFs come this way).
          onPaste={(e) => {
            const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
            if (file) {
              e.preventDefault();
              attach(file);
            }
          }}
          maxLength={1000}
          placeholder={replyTo ? `Répondre à ${replyTo.name}…` : "Commenter… (@ pour taguer)"}
          className="min-h-10 flex-1 resize-none rounded-3xl border border-border bg-bg-2/60 px-4 py-2 text-sm leading-snug outline-none focus:border-primary/70"
        />
        <RichPicker onEmoji={insert} onSticker={(token) => void send(token, false)} />
        {gifs && <GifPicker onPick={(asset) => void send("", false, asset)} onClose={() => setGifs(false)} />}
        <button type="submit" disabled={busy || (!text.trim() && !photo)} aria-label="Envoyer" className="grid h-10 w-10 shrink-0 place-items-center rounded-full btn-brand disabled:opacity-50 press">
          <Icon name="send" size={16} />
        </button>
      </form>
      {error && <p role="alert" className="mt-1.5 text-sm text-danger">{error}</p>}
      <div className="mt-1.5 empty:hidden">
        <MentionSuggest
          text={text}
          caret={caret}
          people={people}
          myId={user?.id}
          onPick={(next, pos) => {
            setText(next);
            setCaret(pos);
            requestAnimationFrame(() => ref.current?.setSelectionRange(pos, pos));
          }}
        />
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {items.map((c) => (
          <div key={c.id} className={`flex items-start gap-2.5 ${c.parentId != null ? "ml-10" : ""}`}>
            <ProfileLink userId={c.author.id} className="shrink-0 rounded-full">
              <Avatar name={c.author.displayName} size={c.parentId != null ? 24 : 30} assetId={c.author.avatarAssetId} framing={c.author.avatarFraming} species={c.author.companion} />
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
              {c.text && <RichBody text={c.text} className="text-sm" renderText={(t) => withMentions(t, people)} />}
              {c.image && (
                <button
                  type="button"
                  onClick={() => setViewing(c)}
                  aria-label="Agrandir l'image"
                  className="mt-1.5 block overflow-hidden rounded-token"
                  style={{ width: "min(14rem, 60vw)", aspectRatio: c.image.width && c.image.height ? `${c.image.width} / ${c.image.height}` : "4 / 3" }}
                >
                  <AssetImage assetId={c.image.assetId} className="h-full w-full object-cover" />
                </button>
              )}
            </div>
            </LongPress>
            <div className="flex items-center gap-2">
              <ReactionPills
                reactions={c.reactions ?? []}
                myId={user?.id}
                onOpen={() => {
                  const el = document.getElementById(`comment-${c.id}`);
                  if (el) setMenu({ comment: c, anchor: el.getBoundingClientRect() });
                }}
              />
              <button type="button" onClick={() => reply(c)} className="px-1 text-xs font-semibold text-text-muted press hover:text-text">
                Répondre
              </button>
            </div>
            </div>
          </div>
        ))}
        {page + 1 < totalPages && (
          <button onClick={loadMore} className="self-start text-xs text-text-muted hover:underline">
            Voir plus de commentaires
          </button>
        )}
      </div>

      {viewing?.image && (
        <ImageViewer
          asset={{ id: viewing.image.assetId, originalFilename: photoName(`memocat-commentaire-${viewing.id}`, viewing.image) }}
          onClose={() => setViewing(null)}
        />
      )}
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
