import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { RichPicker } from "../../components/rich/RichPicker";
import { isSendKey, useAutoGrow, useRichInput } from "../../components/rich/useRichInput";
import { Icon } from "../../components/ui/Icon";
import { EffectLayer } from "../../components/photo/EffectLayer";
import { PhotoStudio } from "../../components/photo/studio/PhotoStudio";
import { getStorageUsage, type Asset, type StorageUsage } from "../../lib/api/assets";
import { checkFile, DOCUMENT_ACCEPT, formatSize, uploadAttachment } from "./attachments";

const MAX_TEXT = 2000;

interface Pending {
  file: File;
  preview: string | null; // object URL for images
  effect: string | null; // animated effect chosen in the studio
}

/**
 * The message box: multi-line text, emojis/stickers, and one attachment
 * (photo, camera, GIF or document) previewed before sending. The file is
 * uploaded first, then the message is sent with its id.
 */
export function ChatComposer({
  connected,
  onSend,
}: {
  connected: boolean;
  onSend: (text: string, attachment: Asset | null) => void;
}) {
  const { text, setText, ref, insert, rememberCaret } = useRichInput<HTMLTextAreaElement>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [studio, setStudio] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useAutoGrow(ref, text);

  useEffect(() => () => {
    if (pending?.preview) URL.revokeObjectURL(pending.preview);
  }, [pending]);

  useEffect(() => {
    if (!menuOpen) return;
    getStorageUsage().then(setUsage).catch(() => {});
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  function pick(file: File | undefined) {
    setMenuOpen(false);
    if (!file) return;
    const problem = checkFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setPending({ file, preview, effect: null });
    ref.current?.focus();
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const value = text.trim();
    if ((!value && !pending) || !connected || sending) return;
    setSending(true);
    setError(null);
    try {
      const asset = pending ? await uploadAttachment(pending.file, pending.effect) : null;
      onSend(value, asset);
      setText("");
      setPending(null);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Envoi impossible, réessaie.");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (isSendKey(e)) {
      e.preventDefault();
      void submit();
    }
  }

  const canSend = connected && !sending && (text.trim().length > 0 || pending !== null);

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      {pending && (
        <div className="flex items-center gap-3 rounded-token border border-border bg-surface p-2 animate-pop">
          {pending.preview ? (
            <EffectLayer effect={pending.effect} className="rounded-token-sm">
              <img src={pending.preview} alt="" className="h-16 w-16 rounded-token-sm object-cover" />
            </EffectLayer>
          ) : (
            <span className="grid h-16 w-12 place-items-center text-text-muted">
              <Icon name="file" size={32} strokeWidth={1.5} />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{pending.file.name}</span>
            <span className="block text-xs text-text-muted">
              {sending ? "Envoi…" : `${formatSize(pending.file.size)} · ajoute un message si tu veux`}
            </span>
          </span>
          {pending.preview && pending.file.type !== "image/gif" && !sending && (
            <button
              type="button"
              onClick={() => setStudio(true)}
              className="flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold text-text press hover:border-primary/50"
            >
              <Icon name="sparkles" size={13} /> Retoucher
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setPending(null);
              setError(null);
            }}
            disabled={sending}
            aria-label="Retirer la pièce jointe"
            className="grid h-9 w-9 place-items-center rounded-full text-text-muted press hover:text-danger"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
      )}
      {error && <p className="px-2 text-sm text-danger">{error}</p>}
      {studio && pending && (
        <PhotoStudio
          file={pending.file}
          onCancel={() => setStudio(false)}
          onDone={(edited, fx) => {
            if (pending.preview) URL.revokeObjectURL(pending.preview);
            setPending({ file: edited, preview: URL.createObjectURL(edited), effect: fx });
            setStudio(false);
          }}
        />
      )}

      <div className="flex items-end gap-1.5">
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Joindre"
            aria-expanded={menuOpen}
            className={"grid h-12 w-12 place-items-center rounded-full border border-border bg-surface press hover:text-primary " + (menuOpen ? "text-primary" : "text-text-muted")}
          >
            <Icon name="plus" size={22} className={"transition-transform " + (menuOpen ? "rotate-45" : "")} />
          </button>
          {menuOpen && (
            <div className="absolute bottom-14 left-0 z-20 w-60 overflow-hidden rounded-token border border-border bg-surface shadow-card animate-pop">
              <AttachOption icon="images" label="Photo ou GIF" accept="image/*" onFile={pick} />
              <AttachOption icon="camera" label="Appareil photo" accept="image/*" capture onFile={pick} />
              <AttachOption icon="file" label="Document" hint="PDF, Word, Excel… 10 Mo" accept={DOCUMENT_ACCEPT} onFile={pick} />
              {usage && (
                <p className="border-t border-border px-4 py-2 text-[11px] text-text-muted">
                  Espace utilisé : {formatSize(usage.usedBytes)} / {formatSize(usage.quotaBytes)}
                </p>
              )}
            </div>
          )}
        </div>

        <textarea
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={rememberCaret}
          onPaste={(e) => {
            const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
            if (file) {
              e.preventDefault();
              pick(file);
            }
          }}
          maxLength={MAX_TEXT}
          placeholder={connected ? "Écris un message…" : "Connexion…"}
          className="min-h-12 flex-1 resize-none rounded-3xl border border-border bg-surface px-4 py-3 leading-snug outline-none focus:border-primary/70"
        />
        <RichPicker onEmoji={insert} onSticker={(token) => connected && onSend(token, null)} />
        <button type="submit" disabled={!canSend} aria-label="Envoyer" className="grid h-12 w-12 shrink-0 place-items-center rounded-full btn-brand disabled:opacity-50 press">
          <Icon name="send" size={18} />
        </button>
      </div>
    </form>
  );
}

function AttachOption({
  icon,
  label,
  hint,
  accept,
  capture,
  onFile,
}: {
  icon: "images" | "camera" | "file";
  label: string;
  hint?: string;
  accept: string;
  capture?: boolean;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface-2">
      <Icon name={icon} size={20} className="text-primary" />
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-text">{label}</span>
        {hint && <span className="text-[11px] text-text-muted">{hint}</span>}
      </span>
      <input
        type="file"
        accept={accept}
        {...(capture && { capture: "environment" as const })}
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </label>
  );
}
