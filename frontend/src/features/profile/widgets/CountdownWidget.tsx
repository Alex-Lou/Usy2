import { useEffect, useState } from "react";
import { Icon } from "../../../components/ui/Icon";

function remaining(target: number): { days: number; hours: number; minutes: number; past: boolean } {
  const diff = target - Date.now();
  const past = diff <= 0;
  const abs = Math.abs(diff);
  return {
    days: Math.floor(abs / 86_400_000),
    hours: Math.floor((abs % 86_400_000) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000) / 60_000),
    past,
  };
}

// Countdown to a date; recomputes each minute.
export function CountdownWidget({ date, label }: { date: string; label?: string }) {
  const target = new Date(date).getTime();
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (Number.isNaN(target)) return null;
  const r = remaining(target);

  return (
    <div className="rounded-token border border-border bg-surface px-4 py-3">
      <p className="flex items-center gap-2 text-xs text-text-muted">
        <Icon name="clock" size={14} className="text-primary" />
        {label || (r.past ? "Depuis" : "Bientôt")}
      </p>
      <p className="mt-1 font-display text-xl font-bold text-text">
        {r.past ? "Il y a " : "J-"}
        <span className="text-primary tabular-nums">{r.days}</span>
        {r.past ? " j" : ""}
        <span className="ml-2 text-sm font-normal text-text-muted tabular-nums">
          {r.hours}h {r.minutes}min
        </span>
      </p>
    </div>
  );
}
