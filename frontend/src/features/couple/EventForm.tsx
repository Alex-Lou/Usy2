import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import type { CoupleEvent, CoupleEventInput } from "./types";

const EMOJIS = ["🎂", "💞", "🍝", "🎬", "✈️", "🎉", "🏖️", "🎁", "🩺", "📦"];

/** Adds or changes one shared date. The time is optional (empty = all day). */
export function EventForm({
  initial,
  day,
  busy,
  onSave,
  onDelete,
  onCancel,
}: {
  initial: CoupleEvent | null;
  day: string; // YYYY-MM-DD for a new date
  busy: boolean;
  onSave: (input: CoupleEventInput) => void;
  onDelete?: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? day);
  const [time, setTime] = useState(initial?.time?.slice(0, 5) ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [yearly, setYearly] = useState(initial?.yearly ?? false);
  const valid = title.trim() !== "" && /^\d{4}-\d{2}-\d{2}$/.test(date);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    onSave({
      title: title.trim(),
      date,
      time: time || null,
      emoji: emoji.trim() || null,
      note: note.trim() || null,
      yearly,
    });
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3 p-4 animate-fade-up" aria-label={initial ? "Modifier la date" : "Nouvelle date"}>
      <h2 className="font-display text-lg font-bold">{initial ? "Modifier la date" : "Nouvelle date"}</h2>

      <Input value={title} maxLength={60} placeholder="Quoi ? (resto, anniversaire…)" onChange={(e) => setTitle(e.target.value)} autoFocus aria-label="Titre" />

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Emoji">
        {EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(emoji === e ? "" : e)}
            aria-pressed={emoji === e}
            className={`grid h-9 w-9 place-items-center rounded-full text-lg press ${emoji === e ? "bg-primary/20 ring-2 ring-primary" : "bg-surface-2"}`}
          >
            {e}
          </button>
        ))}
        <Input value={emoji} maxLength={8} placeholder="autre" onChange={(e) => setEmoji(e.target.value)} className="!w-20 !py-1.5 text-center" aria-label="Autre emoji" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Jour
          <Input type="date" value={date} required onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Heure (facultative)
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" checked={yearly} onChange={(e) => setYearly(e.target.checked)} className="h-4 w-4 accent-[var(--color-primary)]" />
        Chaque année (anniversaire, rencontre…)
      </label>

      <textarea
        value={note}
        maxLength={300}
        rows={2}
        placeholder="Une note (adresse, idée cadeau…)"
        onChange={(e) => setNote(e.target.value)}
        aria-label="Note"
        className="w-full resize-y rounded-token border border-border bg-bg-2/60 px-3.5 py-2.5 text-text outline-none transition placeholder:text-text-muted focus:border-primary/70 focus:ring-2 focus:ring-primary/25"
      />

      <p className="text-xs text-text-muted">Vous recevrez tous les deux un rappel la veille à 19h.</p>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={!valid || busy}>{busy ? "…" : "Enregistrer"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button>
        {onDelete && (
          <Button type="button" variant="ghost" onClick={onDelete} disabled={busy} className="ml-auto !text-danger">
            Supprimer
          </Button>
        )}
      </div>
    </form>
  );
}
