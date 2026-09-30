import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { writeLine, type JournalEntry } from "./api";

const MAX = 280;

/** My line of a day (today or yesterday): write, rewrite, or empty it to erase. */
export function LineEditor({
  day,
  current,
  placeholder,
  onSaved,
  onCancel,
}: {
  day: string;
  current: string;
  placeholder: string;
  onSaved: (entry: JournalEntry | undefined) => void;
  onCancel?: () => void;
}) {
  const [text, setText] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = text.trim() !== current.trim();

  async function save() {
    setSaving(true);
    setError(null);
    try {
      onSaved(await writeLine(text, day));
    } catch {
      setError("La ligne n'a pas pu être enregistrée.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX}
        rows={2}
        placeholder={placeholder}
        aria-label="Ma ligne"
        className="w-full resize-none rounded-token-sm border border-border bg-bg-2/50 px-3 py-2 outline-none focus:border-primary/70"
      />
      <div className="flex items-center gap-2">
        <span className="text-xs tabular-nums text-text-muted">
          {text.length}/{MAX}
        </span>
        {error && <span className="text-xs text-danger">{error}</span>}
        <div className="ml-auto flex gap-2">
          {onCancel && (
            <Button variant="surface" onClick={onCancel} className="!px-3 !py-1.5 text-sm">
              Annuler
            </Button>
          )}
          <Button onClick={save} disabled={saving || !changed} className="!px-3 !py-1.5 text-sm">
            {saving ? "…" : current && !text.trim() ? "Effacer" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
