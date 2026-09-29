import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getJournal, type JournalEntry } from "./api";
import { parseDay } from "./dates";

/**
 * « Le livre de l'année »: every line of a year, oldest first, laid out like a
 * little book; "Imprimer" gives a PDF (the app itself is hidden when printing).
 */
export function JournalBook({
  year,
  years,
  onYear,
  onClose,
}: {
  year: number;
  years: number[];
  onYear: (year: number) => void;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setEntries(null);
    setError(false);
    getJournal(year)
      .then((p) => setEntries([...p.entries].reverse()))
      .catch(() => setError(true));
  }, [year]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Grouped by month, then by day.
  const months = new Map<string, Map<string, JournalEntry[]>>();
  for (const e of entries ?? []) {
    const d = parseDay(e.day);
    const month = d.toLocaleDateString("fr-FR", { month: "long" });
    const days = months.get(month) ?? new Map<string, JournalEntry[]>();
    days.set(e.day, [...(days.get(e.day) ?? []), e]);
    months.set(month, days);
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Le livre de ${year}`} className="journal-book fixed inset-0 z-[70] overflow-y-auto bg-bg text-text">
      <div className="no-print sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface/90 px-4 pb-2 pt-[calc(var(--safe-top)+0.5rem)] backdrop-blur">
        {years.length > 1 && (
          <select value={year} onChange={(e) => onYear(Number(e.target.value))} aria-label="Année du livre" className="rounded-token-sm border border-border bg-surface px-2 py-2 text-sm">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}
        <button type="button" onClick={() => window.print()} disabled={!entries?.length} className="ml-auto rounded-full btn-brand px-4 py-2 text-sm font-semibold press disabled:opacity-50">
          Imprimer / PDF
        </button>
        <button type="button" onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm font-semibold press hover:bg-surface-2">
          Fermer
        </button>
      </div>

      <article className="mx-auto max-w-xl px-6 pb-16 pt-10">
        <header className="book-cover mb-10 text-center">
          <p className="text-5xl" aria-hidden="true">
            📓
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold">Notre carnet</h1>
          <p className="mt-1 text-lg text-text-muted">{year}</p>
        </header>

        {error ? (
          <p className="text-center text-danger">Le livre n'a pas pu se charger.</p>
        ) : entries === null ? (
          <p className="text-center text-text-muted">Chargement…</p>
        ) : entries.length === 0 ? (
          <p className="text-center text-text-muted">Aucune ligne cette année.</p>
        ) : (
          [...months].map(([month, days]) => (
            <section key={month} className="book-month mb-10">
              <h2 className="mb-4 border-b border-border pb-1 font-display text-2xl font-bold capitalize">{month}</h2>
              {[...days].map(([day, lines]) => (
                <div key={day} className="book-day mb-4">
                  <p className="text-sm font-semibold text-text-muted first-letter:uppercase">
                    {parseDay(day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })}
                  </p>
                  {lines.map((l) => (
                    <p key={l.id} className="mt-0.5 font-serif leading-relaxed">
                      <span className="font-sans text-sm font-semibold">{l.authorName} — </span>
                      {l.text}
                    </p>
                  ))}
                </div>
              ))}
            </section>
          ))
        )}
      </article>
    </div>,
    document.body,
  );
}
