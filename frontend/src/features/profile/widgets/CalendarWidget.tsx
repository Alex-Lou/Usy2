import { Link } from "react-router-dom";
import { Icon } from "../../../components/ui/Icon";
import { DateList } from "../../couple/DateList";
import { today, upcoming, whenLabel } from "../../couple/dates";
import { useDates } from "../../couple/useDates";

/** The next shared dates ("Nos dates"); opens the calendar. */
export function CalendarWidget({ label }: { label?: string }) {
  const { events, countdowns } = useDates();
  const next = upcoming(events ?? [], countdowns, today(), 3);
  return (
    <Link to="/dates" className="block rounded-token border border-border bg-surface px-4 py-3 press hover:border-primary/50">
      <p className="mb-1 flex items-center gap-2 text-xs text-text-muted">
        <Icon name="calendar" size={14} className="text-primary" />
        {label || "Nos dates"}
      </p>
      {events === null ? (
        <div className="h-10 animate-pulse rounded-token bg-border/50" />
      ) : next.length ? (
        <DateList entries={next} compact />
      ) : (
        <p className="text-sm text-text-muted">Aucune date à venir : on en ajoute une ?</p>
      )}
    </Link>
  );
}

/** Side-menu version: the next two dates on one wide tile. */
export function MiniCalendar({ label }: { label?: string }) {
  const { events, countdowns } = useDates();
  const next = upcoming(events ?? [], countdowns, today(), 2);
  return (
    <Link to="/dates" className="flex flex-col gap-1 rounded-2xl bg-surface-2/60 px-3 py-2 press hover:text-primary" aria-label={`${label || "Nos dates"} : ouvrir le calendrier`}>
      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-text-muted">
        <Icon name="calendar" size={11} /> {label || "Nos dates"}
      </span>
      {next.length ? (
        next.map((e) => (
          <span key={e.key} className="flex items-center gap-1.5 text-[11px] text-text">
            <span aria-hidden="true">{e.emoji || "📅"}</span>
            <span className="min-w-0 flex-1 truncate">{e.title}</span>
            <span className="shrink-0 text-text-muted">{whenLabel(e.day)}</span>
          </span>
        ))
      ) : (
        <span className="text-[11px] text-text-muted">{events === null ? "…" : "Rien de prévu, ajouter ?"}</span>
      )}
    </Link>
  );
}
