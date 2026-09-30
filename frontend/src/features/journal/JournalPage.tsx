import { useCallback, useEffect, useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { useOnRefresh } from "../../lib/refresh";
import { useAuth } from "../auth/useAuth";
import { getJournal, getJournalYears, type JournalEntry } from "./api";
import { dayLabel, monthLabel, parseDay, previousDay } from "./dates";
import { JournalBook } from "./JournalBook";
import { LineEditor } from "./LineEditor";

/**
 * « Notre carnet »: one line a day each, no obligation, no reminder. Today on
 * top, then the month's days; my line can be (re)written today and yesterday.
 * « Le livre de l'année » lays a year out to re-read or print.
 */
export function JournalPage() {
  const { user } = useAuth();
  const myId = user?.id;
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [today, setToday] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState<string | null>(null); // the past day whose line I am writing
  const [years, setYears] = useState<number[]>([]);
  const [book, setBook] = useState<number | null>(null);

  const load = useCallback(() => {
    setError(false);
    getJournal(view.year, view.month)
      .then((p) => {
        setToday(p.today);
        setEntries(p.entries);
      })
      .catch(() => setError(true));
    getJournalYears().then(setYears).catch(() => {});
  }, [view]);
  useEffect(load, [load]);
  useOnRefresh(load);

  const yesterday = today ? previousDay(today) : null;
  const todayMonth = today ? { year: parseDay(today).getFullYear(), month: parseDay(today).getMonth() + 1 } : null;
  const onCurrentMonth = todayMonth?.year === view.year && todayMonth.month === view.month;

  function saved(day: string, entry: JournalEntry | undefined) {
    setEditing(null);
    setEntries((list) => {
      const others = (list ?? []).filter((e) => !(e.day === day && e.authorId === myId));
      const next = entry ? [...others, entry] : others;
      return next.sort((a, b) => (a.day === b.day ? a.id - b.id : a.day < b.day ? 1 : -1));
    });
    getJournalYears().then(setYears).catch(() => {});
  }

  function shift(delta: number) {
    setEditing(null);
    setView(({ year, month }) => {
      const d = new Date(year, month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  }

  const byDay = new Map<string, JournalEntry[]>();
  for (const e of entries ?? []) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e]);
  // Yesterday shows even without lines, so a forgotten one can still be written.
  const days = [...byDay.keys()];
  if (onCurrentMonth && yesterday && parseDay(yesterday).getMonth() + 1 === view.month && !byDay.has(yesterday)) days.push(yesterday);
  const pastDays = days.filter((d) => d !== today).sort((a, b) => (a < b ? 1 : -1));

  const todays = today ? byDay.get(today) ?? [] : [];
  const mine = todays.find((e) => e.authorId === myId);
  const theirs = todays.filter((e) => e.authorId !== myId);
  const bookYears = years.length > 0 ? years : [view.year];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="📓 Notre carnet"
        subtitle="Une ligne par jour, quand on veut."
        action={
          <button type="button" onClick={() => setBook(bookYears[0])} className="chip press hover:border-primary/50">
            📖 Le livre
          </button>
        }
      />

      {today && onCurrentMonth && (
        <section className="card flex flex-col gap-3 p-4 animate-fade-up">
          <p className="text-sm font-semibold text-text-muted first-letter:uppercase">Aujourd'hui · {dayLabel(today)}</p>
          <LineEditor key={`${today}-${mine?.updatedAt ?? ""}`} day={today} current={mine?.text ?? ""} placeholder="Ta journée en une ligne…" onSaved={(e) => saved(today, e)} />
          {theirs.map((e) => (
            <p key={e.id} className="rounded-token border-l-4 border-primary bg-bg-2/60 px-3 py-2">
              <span className="text-sm font-semibold">{e.authorName} — </span>
              {e.text}
            </p>
          ))}
        </section>
      )}

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} aria-label="Mois précédent" className="grid h-9 w-9 place-items-center rounded-full text-text-muted press hover:text-text">
          <Icon name="chevronLeft" size={18} />
        </button>
        <h2 className="font-display text-lg font-bold">{monthLabel(view.year, view.month)}</h2>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={onCurrentMonth}
          aria-label="Mois suivant"
          className="grid h-9 w-9 place-items-center rounded-full text-text-muted press hover:text-text disabled:opacity-30"
        >
          <Icon name="chevronLeft" size={18} className="rotate-180" />
        </button>
      </div>

      {error ? (
        <p className="text-center text-sm text-danger">Le carnet n'a pas pu se charger.</p>
      ) : entries === null ? (
        <p className="text-center text-sm text-text-muted">Chargement…</p>
      ) : pastDays.length === 0 ? (
        <p className="text-center text-sm text-text-muted">{onCurrentMonth ? "Les jours passés du mois s'afficheront ici." : "Aucune ligne ce mois-là."}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pastDays.map((day) => {
            const lines = byDay.get(day) ?? [];
            const myLine = lines.find((e) => e.authorId === myId);
            const canWrite = day === yesterday;
            return (
              <li key={day} className="card p-4">
                <p className="mb-1.5 text-sm font-semibold text-text-muted first-letter:uppercase">{dayLabel(day)}</p>
                {lines
                  .filter((e) => !(editing === day && e.authorId === myId))
                  .map((e) => (
                    <p key={e.id} className="mt-1 break-words">
                      <span className="text-sm font-semibold">{e.authorName} — </span>
                      {e.text}
                    </p>
                  ))}
                {editing === day ? (
                  <div className="mt-2">
                    <LineEditor day={day} current={myLine?.text ?? ""} placeholder="Ta journée d'hier en une ligne…" onSaved={(e) => saved(day, e)} onCancel={() => setEditing(null)} />
                  </div>
                ) : (
                  canWrite && (
                    <button type="button" onClick={() => setEditing(day)} className="mt-2 text-sm text-primary underline-offset-2 hover:underline">
                      {myLine ? "✏️ Modifier ma ligne" : "+ Écrire ma ligne d'hier"}
                    </button>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}

      {book !== null && <JournalBook year={book} years={bookYears} onYear={setBook} onClose={() => setBook(null)} />}
    </div>
  );
}
