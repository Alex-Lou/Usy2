import type { NavalTheme } from "./api";
import { THEMES } from "./themes";

/** The four looks, as cards to pick from. */
export function ThemePicker({ value, onPick }: { value: NavalTheme; onPick: (t: NavalTheme) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Thème">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={value === t.id}
          onClick={() => onPick(t.id)}
          className={`nv-theme-card nv-${t.id} press ${value === t.id ? "nv-theme-card--on" : ""}`}
        >
          <span className="nv-sea" aria-hidden="true" />
          <span className="relative text-2xl" aria-hidden="true">{t.emoji}</span>
          <span className="relative font-semibold">{t.label}</span>
          <span className="relative text-xs opacity-85">{t.blurb}</span>
        </button>
      ))}
    </div>
  );
}

/** Where we are in the battle: done steps ticked, the current one lit. */
export function Steps({ steps, at }: { steps: string[]; at: number }) {
  return (
    <ol className="nv-steps" aria-label="Étapes">
      {steps.map((s, i) => (
        <li key={s} className={i < at ? "nv-step--done" : i === at ? "nv-step--on" : ""} aria-current={i === at ? "step" : undefined}>
          <span className="nv-step-dot" aria-hidden="true">{i < at ? "✓" : i + 1}</span>
          <span className="nv-step-label">{s}</span>
        </li>
      ))}
    </ol>
  );
}
