import { useEffect, useRef, useState, type FormEvent } from "react";
import { GifPicker } from "../../components/rich/GifPicker";
import { isSendKey, useAutoGrow } from "../../components/rich/useRichInput";
import { Icon } from "../../components/ui/Icon";
import { uploadAudio, type Asset } from "../../lib/api/assets";
import { checkFile, DOCUMENT_ACCEPT, uploadAttachment } from "../chat/attachments";
import { takeForChat } from "../feed/sharedContent";
import { quoteText } from "../chat/Quote";
import type { Message } from "../chat/types";
import { canRecordVoice, formatDuration, MAX_VOICE_SECONDS, useVoiceRecorder } from "../chat/useVoiceRecorder";
import { MsgIcon } from "./icons";

const MAX_TEXT = 2000;

/**
 * The message box: text that grows, a ＋ for a photo, the camera, a GIF or a
 * file (uploaded first, then sent), and the microphone while it is empty.
 * Above it, the message being answered or rewritten.
 */
export function Composer({ partnerName, myId, replyTo, editing, onSend, onSaveEdit, onCancel, onTyping }: {
  partnerName: string;
  myId: number | undefined;
  replyTo: Message | null;
  editing: Message | null;
  onSend: (text: string, attachment: Asset | null) => void;
  onSaveEdit: (text: string) => void;
  onCancel: () => void;
  onTyping: () => void;
}) {
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (!menu) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menu]);
  const [gifs, setGifs] = useState(false);
  const [pending, setPending] = useState<{ file: File; preview: string | null } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useAutoGrow(ref, text);

  // Rewriting a message: its text comes into the box; leaving it empties the box
  // (what was being typed before a reply stays).
  const wasEditing = useRef(false);
  useEffect(() => {
    if (editing) setText(editing.content);
    else if (wasEditing.current) setText("");
    wasEditing.current = !!editing;
  }, [editing]);
  useEffect(() => {
    if (editing || replyTo) ref.current?.focus();
  }, [editing, replyTo]);

  useEffect(() => () => {
    if (pending?.preview) URL.revokeObjectURL(pending.preview);
  }, [pending]);

  // Content shared from another app, sent here from the feed's "post or message?" choice (once, on arrival).
  useEffect(() => {
    const shared = takeForChat();
    if (!shared) return;
    if (shared.text) setText(shared.text);
    if (shared.file) pick(shared.file);
  }, []);

  const voice = useVoiceRecorder((recording) => void run(async () => onSend("", await uploadAudio(recording)), "Envoi du vocal impossible, réessaie."));

  async function run(task: () => Promise<void>, fallback: string) {
    setSending(true);
    setError(null);
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : fallback);
    } finally {
      setSending(false);
    }
  }

  function pick(file: File | undefined) {
    setMenu(false);
    if (!file) return;
    const problem = checkFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setPending({ file, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null });
  }

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const value = text.trim();
    if (editing) {
      if (value && value !== editing.content) onSaveEdit(value);
      else onCancel();
      return;
    }
    if ((!value && !pending) || sending) return; // not connected yet: it waits in the outbox
    const file = pending;
    void run(async () => {
      onSend(value, file ? await uploadAttachment(file.file) : null);
      setText("");
      setPending(null);
    }, "Envoi impossible, réessaie.");
  }

  const empty = text.trim().length === 0 && !pending;
  const showMic = canRecordVoice && empty && !editing;

  if (voice.recording) {
    return (
      <div className="flex items-center gap-2 px-2 pb-3 pt-2">
        <button type="button" onClick={() => voice.stop(false)} aria-label="Annuler le vocal" className="grid h-11 w-11 place-items-center rounded-full text-text-muted press">
          <Icon name="trash" size={20} />
        </button>
        <div className="msg-field flex h-11 flex-1 items-center gap-2 rounded-full px-4">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" aria-hidden="true" />
          <span className="tabular-nums">{formatDuration(voice.seconds)}</span>
          <span className="text-xs text-text-muted">/ {formatDuration(MAX_VOICE_SECONDS)}</span>
        </div>
        <button type="button" onClick={() => voice.stop(true)} aria-label="Envoyer le vocal" className="msg-cta grid h-11 w-11 place-items-center rounded-full press">
          <Icon name="send" size={20} />
        </button>
      </div>
    );
  }

  const context = editing ?? replyTo;
  return (
    <form onSubmit={submit} className="relative flex flex-col px-2 pb-3 pt-2">
      {context && (
        <div className="msg-quote mx-1 mb-1.5 flex items-center gap-2 px-3 py-1.5">
          <MsgIcon name={editing ? "edit" : "reply"} size={16} className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1 text-[12.5px]">
            <b className="block text-xs">{editing ? "Modifier le message" : `Répondre à ${context.sender.id === myId ? "toi" : partnerName}`}</b>
            <span className="block truncate text-text-muted">{quoteText(context)}</span>
          </span>
          <button type="button" onClick={onCancel} aria-label="Annuler" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-text-muted press">
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      {pending && (
        <div className="msg-field mx-1 mb-1.5 flex items-center gap-3 rounded-2xl p-2">
          {pending.preview ? <img src={pending.preview} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <Icon name="file" size={28} className="mx-3 text-text-muted" />}
          <span className="min-w-0 flex-1 truncate text-sm">{pending.file.name}</span>
          <button type="button" onClick={() => setPending(null)} aria-label="Retirer" className="grid h-8 w-8 place-items-center rounded-full text-text-muted press">
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      {error && <p role="alert" className="mx-2 mb-1 text-xs text-danger">{error}</p>}

      {menu && (
        // A touch anywhere else closes the menu (the invisible layer catches it).
        <div className="fixed inset-0 z-20" aria-hidden="true" onPointerDown={() => setMenu(false)} />
      )}
      {menu && (
        <div className="msg-sheet absolute bottom-full left-3 z-30 mb-1 flex flex-col overflow-hidden rounded-2xl text-[14.5px] shadow-lg">
          <MenuItem icon="images" label="Photo" onClick={() => photoInput.current?.click()} />
          <MenuItem icon="camera" label="Appareil photo" onClick={() => cameraInput.current?.click()} />
          <MenuItem icon="smile" label="GIF" onClick={() => { setMenu(false); setGifs(true); }} />
          <MenuItem icon="file" label="Fichier" onClick={() => fileInput.current?.click()} />
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <div className="msg-field flex min-h-11 flex-1 items-end rounded-[22px] pl-1">
          {!editing && (
            <button type="button" onClick={() => setMenu((o) => !o)} aria-expanded={menu} aria-label="Joindre" className="grid h-11 w-10 shrink-0 place-items-center text-text-muted press">
              <Icon name="plus" size={22} className={menu ? "rotate-45 transition-transform" : "transition-transform"} />
            </button>
          )}
          <textarea
            ref={ref}
            rows={1}
            value={text}
            maxLength={MAX_TEXT}
            placeholder="Message"
            aria-label="Message"
            onChange={(e) => {
              setText(e.target.value);
              if (!editing) onTyping();
            }}
            onKeyDown={(e) => {
              if (isSendKey(e)) {
                e.preventDefault();
                submit();
              }
            }}
            className={"min-w-0 flex-1 resize-none bg-transparent py-[11px] pr-3 text-[15px] leading-snug outline-none placeholder:text-text-muted " + (editing ? "pl-3" : "")}
          />
        </div>
        {showMic ? (
          <button type="button" onClick={() => void voice.start()} disabled={sending} aria-label="Enregistrer un vocal" className="msg-cta grid h-11 w-11 shrink-0 place-items-center rounded-full press disabled:opacity-50">
            <Icon name="mic" size={21} />
          </button>
        ) : (
          <button type="submit" disabled={sending || (empty && !editing)} aria-label={editing ? "Enregistrer" : "Envoyer"} className="msg-cta grid h-11 w-11 shrink-0 place-items-center rounded-full press disabled:opacity-50">
            <Icon name="send" size={20} className={sending ? "animate-pulse" : ""} />
          </button>
        )}
      </div>
      {voice.error && <p role="alert" className="mx-2 mt-1 text-xs text-danger">{voice.error}</p>}

      <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={fileInput} type="file" accept={DOCUMENT_ACCEPT} hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      {gifs && <GifPicker onPick={(asset) => onSend("", asset)} onClose={() => setGifs(false)} />}
    </form>
  );
}

function MenuItem({ icon, label, onClick }: { icon: "images" | "camera" | "smile" | "file"; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 px-4 py-3 text-left press hover:bg-surface">
      <Icon name={icon} size={20} className="text-primary" />
      {label}
    </button>
  );
}
