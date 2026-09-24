import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../components/ui/Icon";
import type { SharedContent } from "./sharedContent";

/** Where does the shared content go: a post, or a message to the other person? */
export function ShareChoice({
  shared,
  partnerName,
  onPost,
  onMessage,
  onCancel,
}: {
  shared: SharedContent;
  partnerName: string | null;
  onPost: () => void;
  onMessage: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const summary = shared.text || shared.file?.name || "";
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    if (!shared.file || !shared.file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(shared.file);
    setThumb(url);
    return () => URL.revokeObjectURL(url);
  }, [shared.file]);

  // A small centred popup: what was shared, then "post" or "message".
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 animate-fade-up" onClick={onCancel}>
      <div
        role="dialog"
        aria-label="Partager dans MemoCat"
        onClick={(e) => e.stopPropagation()}
        className="w-[min(20rem,100%)] rounded-3xl border border-border bg-surface p-4 shadow-card animate-pop"
      >
        <h2 className="text-center font-display text-base font-bold">Partager dans MemoCat</h2>
        <div className="mt-3 flex items-center gap-3 rounded-token bg-bg-2/60 p-2">
          {thumb && <img src={thumb} alt="" className="h-12 w-12 shrink-0 rounded-token-sm object-cover" />}
          <p className="line-clamp-3 min-w-0 break-words text-xs text-text-muted">{summary || "Photo"}</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onPost} className="flex flex-col items-center gap-1 rounded-token border border-border bg-bg-2/40 px-2 py-3 text-sm font-semibold press hover:border-primary/50">
            <Icon name="home" size={22} className="text-primary" />
            En post
          </button>
          <button type="button" onClick={onMessage} className="flex flex-col items-center gap-1 rounded-token border border-border bg-bg-2/40 px-2 py-3 text-sm font-semibold press hover:border-primary/50">
            <Icon name="chat" size={22} className="text-primary" />
            {partnerName ? `Message à ${partnerName}` : "En message"}
          </button>
        </div>
        <button type="button" onClick={onCancel} className="mt-2 w-full py-1.5 text-xs text-text-muted press hover:text-text">
          Annuler
        </button>
      </div>
    </div>,
    document.body,
  );
}
