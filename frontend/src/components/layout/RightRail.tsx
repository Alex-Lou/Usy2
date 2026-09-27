import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { daysBetween, nextOccurrence, today } from "../../features/couple/dates";
import { useDates } from "../../features/couple/useDates";
import { CoupleStrip } from "../../features/feed/CoupleStrip";
import { HomeWidgets } from "../../features/feed/HomeWidgets";
import { CompanionPicker } from "../ui/CompanionPicker";

/**
 * 🖥️ The desktop right rail: on the home page our « Nous » block (moods,
 * notes), then our next dates, our little widgets and the companion. Always
 * shown from xl; between lg and xl it is a drawer opened from the top bar
 * (closed by Escape, a new page or the top bar button again).
 */
export function RightRail({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <aside
      aria-label="Nos widgets et le compagnon"
      className={
        "fixed bottom-0 right-0 top-desk-bar z-30 w-shell-right flex-col gap-5 overflow-y-auto overflow-x-hidden border-l border-border glass px-4 py-5 "
        + (open ? "hidden shadow-card lg:flex" : "hidden xl:flex")
      }
    >
      {pathname === "/" && <div className="hidden xl:block"><CoupleStrip /></div>}
      <NextDates />
      <HomeWidgets />
      <section aria-label="Notre compagnon" className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-text-muted">Notre compagnon</p>
        <CompanionPicker compact />
      </section>
    </aside>
  );
}

/** Our next three dates (yearly ones counted from today), a tap from the calendar. */
function NextDates() {
  const { events } = useDates();
  const from = today();
  const next = (events ?? [])
    .map((e) => ({ e, day: nextOccurrence(e, from) }))
    .filter((x): x is { e: typeof x.e; day: Date } => x.day != null)
    .sort((a, b) => a.day.getTime() - b.day.getTime())
    .slice(0, 3);
  if (!events) return null;
  return (
    <section aria-label="Nos prochaines dates" className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-text-muted">Nos prochaines dates</p>
        <Link to="/dates" className="text-xs text-text-muted hover:text-primary">Calendrier →</Link>
      </div>
      {next.length === 0 ? (
        <Link to="/dates" className="card press p-3 text-sm text-text-muted">Rien de prévu : ajoute une date 📅</Link>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {next.map(({ e, day }) => {
            const n = daysBetween(from, day);
            return (
              <li key={e.id}>
                <Link to="/dates" className="card press flex items-center gap-3 p-2.5 hover:border-primary/40">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-token-sm bg-surface-2 text-lg" aria-hidden="true">{e.emoji ?? "📅"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{e.title}</span>
                    <span className="block text-xs text-text-muted">
                      {n === 0 ? "Aujourd'hui 🎉" : n === 1 ? "Demain" : `Dans ${n} jours`} · {day.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
