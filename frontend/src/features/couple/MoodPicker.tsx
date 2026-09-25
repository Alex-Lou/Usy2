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

  async function save(nextEmoji: string) {
    setEmoji(nextEmoji);
    setSaving(true);
    setError(null);
    try {
      onSaved(await setMood(nextEmoji, label.trim() || null));
      onClose();
    } catch {
      setError("Impossible d'enregistrer l'humeur.");
    } finally {
      setSaving(false);
    }
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
        <Button variant="surface" type="button" onClick={onClose} className="!px-3">
          Fermer
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
