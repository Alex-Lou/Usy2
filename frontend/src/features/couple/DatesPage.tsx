import { useMemo, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { createEvent, deleteEvent, updateEvent } from "./api";
import { DateList } from "./DateList";
import { dayKey, entriesOn, nextOccurrence, parseDay, sameDay, today, upcoming, type DateEntry } from "./dates";
import { EventForm } from "./EventForm";
import type { CoupleEvent, CoupleEventInput } from "./types";
import { useDates } from "./useDates";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

/** "Nos dates": the shared calendar, editable by both, with the countdown widgets. */
export function DatesPage() {
  const { events, setEvents, countdowns, error: loadError, reload } = useDates();
  const now = today();
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(now);
  // null = closed; { event: null } = a new date; { event } = editing that one.
  const [form, setForm] = useState<{ event: CoupleEvent | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const list = events ?? [];
  const weeks = useMemo(() => monthGrid(month), [month]);
  const dayEntries = entriesOn(list, countdowns, selected);
  const next = upcoming(list, countdowns, now, 8);

  function open(event: CoupleEvent | null) {
    setError(null);
    setForm({ event });
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  function edit(entry: DateEntry) {
    if (entry.event) open(entry.event);
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setForm(null);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  function save(input: CoupleEventInput) {
    const editing = form?.event;
    void run(async () => {
      const saved = editing ? await updateEvent(editing.id, input) : await createEvent(input);
      setEvents((prev) => [...(prev ?? []).filter((e) => e.id !== saved.id), saved]);
      // Show where it lands (a yearly date from the past: its next time).
      const day = nextOccurrence(saved, now) ?? parseDay(saved.date);
      setSelected(day);
      setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
    });
  }

  function remove(event: CoupleEvent) {
    if (!window.confirm(`Supprimer « ${event.title} » ?`)) return;
    void run(async () => {
      await deleteEvent(event.id);
      setEvents((prev) => prev?.filter((e) => e.id !== event.id) ?? prev);
    });
  }

  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const monthTitle = month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const selectedTitle = selected.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Nos dates</h1>
          <p className="text-sm text-text-muted">Rendez-vous, anniversaires et comptes à rebours, pour vous deux. Rappel la veille à 19h.</p>
        </div>
        <Button onClick={() => open(null)}>
          <Icon name="plus" size={16} /> Ajouter
        </Button>
      </div>

      {(loadError || error) && (
        <p role="alert" className="text-sm text-danger">
          {error ?? loadError}{" "}
          {loadError && !error && (
            <button type="button" onClick={reload} className="underline">Réessayer</button>
          )}
        </p>
      )}

      <div ref={formRef}>
        {form && (
          <EventForm
            key={form.event?.id ?? `new-${dayKey(selected)}`}
            initial={form.event}
            day={dayKey(selected)}
            busy={busy}
            onSave={save}
            onDelete={form.event ? () => remove(form.event!) : undefined}
            onCancel={() => setForm(null)}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="card flex flex-col gap-3 p-3 sm:p-4" aria-label="Calendrier">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => shift(-1)} className="grid h-9 w-9 place-items-center rounded-full press hover:bg-surface-2" aria-label="Mois précédent">
              <Icon name="chevronLeft" size={18} />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-bold capitalize">{monthTitle}</h2>
              {!(month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth()) && (
                <button
                  type="button"
                  onClick={() => {
                    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                    setSelected(now);
                  }}
                  className="chip press text-xs hover:border-primary/50"
                >
                  Aujourd'hui
                </button>
              )}
            </div>
            <button type="button" onClick={() => shift(1)} className="grid h-9 w-9 place-items-center rounded-full press hover:bg-surface-2" aria-label="Mois suivant">
              <Icon name="chevronLeft" size={18} className="rotate-180" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-text-muted" aria-hidden="true">
            {WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((day) => {
              const inMonth = day.getMonth() === month.getMonth();
              const entries = events ? entriesOn(list, countdowns, day) : [];
              const isToday = sameDay(day, now);
              const isSelected = sameDay(day, selected);
              const label = day.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) +
                (entries.length ? `, ${entries.length} date${entries.length > 1 ? "s" : ""}` : "");
              return (
                <button
                  key={dayKey(day)}
                  type="button"
                  onClick={() => {
                    setSelected(day);
                    if (!inMonth) setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
                  }}
                  aria-label={label}
                  aria-pressed={isSelected}
                  className={
                    "flex h-12 min-w-0 flex-col items-center justify-start gap-0.5 rounded-token p-1 text-sm transition press sm:h-auto sm:aspect-[4/3] " +
                    (isSelected ? "bg-primary/15 ring-2 ring-primary " : "hover:bg-surface-2/70 ") +
                    (inMonth ? "text-text" : "text-text-muted opacity-50")
                  }
                >
                  <span className={`grid h-6 w-6 place-items-center rounded-full tabular-nums ${isToday ? "btn-brand font-bold" : ""}`}>
                    {day.getDate()}
                  </span>
                  {entries.length > 0 && (
                    <span className="flex max-w-full items-center gap-px truncate text-[11px] leading-none" aria-hidden="true">
                      {entries.slice(0, 2).map((e) => <span key={e.key}>{e.emoji || "•"}</span>)}
                      {entries.length > 2 && <span className="text-[9px] text-text-muted">+{entries.length - 2}</span>}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="border-t border-border pt-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold capitalize">{selectedTitle}</h3>
              <button type="button" onClick={() => open(null)} className="chip press text-xs hover:border-primary/50">
                + Ce jour-là
              </button>
            </div>
            {dayEntries.length ? (
              <DateList entries={dayEntries} onEdit={edit} showWhen={false} />
            ) : (
              <p className="text-sm text-text-muted">Rien de prévu.</p>
            )}
          </div>
        </section>

        <section className="card flex flex-col gap-2 p-4" aria-label="À venir">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">À venir</h2>
          {events === null && !loadError ? (
            <div className="h-24 animate-pulse rounded-token bg-border/50" />
          ) : next.length ? (
            <DateList entries={next} onEdit={edit} />
          ) : (
            <p className="text-sm text-text-muted">Aucune date à venir. Ajoutez un resto, un voyage, un anniversaire…</p>
          )}
        </section>
      </div>
    </div>
  );
}

/** The weeks shown for `month` (Monday first), including the edges of the next/previous months. */
function monthGrid(month: Date): Date[][] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const rows = Math.ceil((offset + daysInMonth) / 7);
  return Array.from({ length: rows }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d)),
  );
}
