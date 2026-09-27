import type { ReactNode } from "react";
import type { NousTheme } from "./api";

/** A filter chip (a theme, a result…), coloured when on. */
export function FilterChip({ on, color, onClick, children }: { on: boolean; color?: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={"chip press shrink-0 text-sm " + (on ? "font-semibold text-white" : "text-text-muted")}
      style={on ? { background: color ?? "var(--nd-accent)", borderColor: color ?? "var(--nd-accent)" } : undefined}
    >
      {children}
    </button>
  );
}

/**
 * 🗂️ Choosing a category: « Toutes » then each theme as a tile with how many
 * questions wait there ({@code unit} says what they are). Empty ones stay,
 * dimmed, at the end.
 */
export function CategoryGrid({ themes, counts, unit, onPick }: {
  themes: NousTheme[];
  counts: Map<string, number>;
  unit: (n: number) => string;
  onPick: (theme: string) => void;
}) {
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const sorted = [...themes].sort((a, b) => Number((counts.get(b.id) ?? 0) > 0) - Number((counts.get(a.id) ?? 0) > 0));
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" data-nous-categories="">
      <Tile emoji="🎲" label="Toutes, au hasard" detail={unit(total)} color="var(--nous-accent)" disabled={total === 0} onClick={() => onPick("all")} />
      {sorted.map((t) => {
        const n = counts.get(t.id) ?? 0;
        return <Tile key={t.id} emoji={t.emoji} label={t.label} detail={unit(n)} color={t.color} disabled={n === 0} onClick={() => onPick(t.id)} />;
      })}
    </div>
  );
}

function Tile({ emoji, label, detail, color, disabled, onClick }: {
  emoji: string; label: string; detail: string; color: string; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="card press flex flex-col items-start gap-1 p-3 text-left transition hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
      style={{ borderTop: `4px solid ${color}` }}
    >
      <span className="text-2xl" aria-hidden="true">{emoji}</span>
      <span className="font-semibold leading-tight">{label}</span>
      <span className="text-xs text-text-muted">{detail}</span>
    </button>
  );
}

/** Counts by theme. */
export function countBy<T extends { theme: string }>(list: T[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of list) m.set(x.theme, (m.get(x.theme) ?? 0) + 1);
  return m;
}
