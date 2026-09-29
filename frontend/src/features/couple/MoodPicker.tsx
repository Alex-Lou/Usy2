import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { setMood } from "./api";
import type { Mood } from "./types";

// Plain, everyday moods — one tap to set.
const MOODS = [
  "🙂", "😀", "😌", "😍", "😘", "🤗", "😎", "🤓",
  "🤔", "😴", "🥱", "😮‍💨", "😔", "😢", "😤", "😡",
  "🤒", "🤯", "🥳", "😬", "🫠", "💪", "☕", "🎧",
];

/** Inline picker: tapping an emoji saves it immediately, the label is optional. */
export function MoodPicker({
  current,
  onSaved,
  onClose,
}: {
  current: Mood | undefined;
  onSaved: (mood: Mood) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(current?.label ?? "");
  const [emoji, setEmoji] = useState(current?.emoji ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(nextEmoji: string, nextLabel = label) {
    setEmoji(nextEmoji);
    setSaving(true);
    setError(null);
    try {
      onSaved(await setMood(nextEmoji, nextLabel.trim() || null));
      onClose();
    } catch {
      setError("Impossible d'enregistrer l'humeur.");
    } finally {
      setSaving(false);
    }
  }

  // Empties the little word; with a mood already set, it is saved without it.
  function clearLabel() {
    setLabel("");
    if (emoji) void save(emoji, "");
  }

  return (
    <div className="flex flex-col gap-2 rounded-token border border-border bg-bg-2/60 p-3 animate-pop">
      <div className="grid grid-cols-8 gap-1">
        {MOODS.map((m) => (
          <button
            key={m}
            type="button"
            disabled={saving}
            onClick={() => save(m)}
            aria-label={`Humeur ${m}`}
            className={
              "press rounded-token py-1 text-2xl leading-none hover:bg-surface-2 " +
              (m === emoji ? "bg-surface-2 ring-2 ring-primary/40" : "")
            }
          >
            {m}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={label}
          maxLength={40}
          placeholder="En quelques mots (optionnel)"
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && emoji && void save(emoji)}
        />
        <button
          type="button"
          disabled={!emoji || saving}
          onClick={() => void save(emoji)}
          aria-label="Enregistrer le petit mot"
          title={emoji ? "Enregistrer" : "Choisis d'abord un emoji"}
          className="grid w-10 shrink-0 place-items-center rounded-token text-xl font-bold text-[var(--color-success)] press hover:bg-surface-2 disabled:opacity-40"
        >
          ✓
        </button>
        <button
          type="button"
          disabled={!label || saving}
          onClick={clearLabel}
          aria-label="Effacer le petit mot"
          title="Effacer"
          className="grid w-10 shrink-0 place-items-center rounded-token text-xl font-bold text-danger press hover:bg-surface-2 disabled:opacity-40"
        >
          ✗
        </button>
        <Button variant="surface" type="button" onClick={onClose} className="!px-3">
          Fermer
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
