import { useEffect } from "react";
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
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-fade-up lg:pl-64" onClick={onCancel}>
      <div
        role="dialog"
        aria-label="Partager dans MemoCat"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl border border-b-0 border-border bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] animate-sheet-up"
      >
        <h2 className="font-display text-lg font-bold">Partager dans MemoCat</h2>
        <p className="mt-1 line-clamp-2 break-all text-sm text-text-muted">
          {shared.file && "📷 "}
          {summary}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={onPost} className="flex flex-col items-center gap-2 rounded-token border border-border bg-bg-2/40 px-3 py-4 font-semibold press hover:border-primary/50">
            <Icon name="home" size={26} className="text-primary" />
            En post
          </button>
          <button type="button" onClick={onMessage} className="flex flex-col items-center gap-2 rounded-token border border-border bg-bg-2/40 px-3 py-4 font-semibold press hover:border-primary/50">
            <Icon name="chat" size={26} className="text-primary" />
            {partnerName ? `En message à ${partnerName}` : "En message"}
          </button>
        </div>
        <button type="button" onClick={onCancel} className="mt-3 w-full py-2 text-sm text-text-muted press hover:text-text">
          Annuler
        </button>
      </div>
    </div>,
    document.body,
  );
}
