import { useEffect, useState } from "react";
import { clearDraft, loadDraft, type StudioEdit } from "./draft";

/**
 * « Reprendre ta retouche ? »: shown when a studio edit was left unfinished
 * on this device (app closed mid-edit). Nothing when there is no draft.
 */
export function StudioDraftCard({ onResume }: { onResume: (file: File, edit: StudioEdit) => void }) {
  const [draft, setDraft] = useState<{ file: File; edit: StudioEdit; url: string } | null>(null);

  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    loadDraft().then((d) => {
      if (!alive || !d) return;
      url = URL.createObjectURL(d.file);
      setDraft({ ...d, url });
    });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  if (!draft) return null;
  return (
    <div data-studio-draft="" className="mb-3 flex items-center gap-3 rounded-token border border-primary/40 bg-surface-2 p-2">
      <img src={draft.url} alt="" className="h-12 w-12 shrink-0 rounded-token-sm object-cover" />
      <span className="flex-1 text-sm font-semibold text-text">Reprendre ta retouche ?</span>
      <button
        type="button"
        onClick={() => {
          onResume(draft.file, draft.edit);
          setDraft(null);
        }}
        className="rounded-full btn-brand px-3 py-1.5 text-sm press"
      >
        Reprendre
      </button>
      <button
        type="button"
        onClick={() => {
          void clearDraft();
          setDraft(null);
        }}
        className="rounded-full px-3 py-1.5 text-sm text-text-muted press hover:text-danger"
      >
        Jeter
      </button>
    </div>
  );
}
