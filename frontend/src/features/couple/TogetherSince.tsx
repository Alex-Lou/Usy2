import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { setTogetherSince } from "./api";
import type { CoupleOverview } from "./types";
import { daysSince } from "./time";

function sinceLabel(date: string): string {
  const days = daysSince(date);
  return days <= 0 ? "Ensemble depuis aujourd'hui" : `Ensemble depuis ${days.toLocaleString("fr-FR")} jour${days > 1 ? "s" : ""}`;
}

/** "Ensemble depuis N jours", with an inline date editor. */
export function TogetherSince({
  value,
  editable = false,
  onSaved,
}: {
  value: string | null;
  editable?: boolean;
  onSaved?: (couple: CoupleOverview) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, local

  async function save(next: string | null) {
    setError(null);
    try {
      onSaved?.(await setTogetherSince(next));
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Date refusée.");
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-token border border-border bg-bg-2/60 px-3 py-2 text-text outline-none focus:border-primary/70"
          />
          <Button type="button" onClick={() => date && save(date)} disabled={!date} className="!px-3 !py-2">
            OK
          </Button>
          {value && (
            <Button type="button" variant="ghost" onClick={() => save(null)} className="!px-3 !py-2">
              Effacer
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => setEditing(false)} className="!px-3 !py-2">
            Annuler
          </Button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    );
  }

  if (!value) {
    return editable ? (
      <button type="button" onClick={() => setEditing(true)} className="chip press self-start hover:border-primary/50">
        Depuis quand êtes-vous ensemble ?
      </button>
    ) : null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-lg font-bold text-text">{sinceLabel(value)}</span>
      {editable && (
        <button
          type="button"
          onClick={() => {
            setDate(value);
            setEditing(true);
          }}
          className="text-sm text-text-muted underline-offset-2 hover:underline"
        >
          modifier
        </button>
      )}
    </div>
  );
}
