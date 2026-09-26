/**
 * Options to tick (several at once), each one a toggle; the caller saves the
 * selection with its own button ("Valider", "Deviner").
 */
export function Ticks({ options, ticked, color, disabled, onToggle, label }: {
  options: string[];
  ticked: number[];
  color: string;
  disabled?: boolean;
  onToggle: (i: number) => void;
  label: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label={label}>
      {options.map((o, i) => {
        const on = ticked.includes(i);
        return (
          <button
            key={o}
            type="button"
            role="checkbox"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onToggle(i)}
            className={"press flex items-center gap-2 rounded-token border-2 px-3 py-2 text-left text-sm font-semibold transition " + (on ? "text-white" : "border-border hover:-translate-y-0.5")}
            style={on ? { background: color, borderColor: color } : undefined}
          >
            <span aria-hidden="true" className={"grid h-4 w-4 shrink-0 place-items-center rounded border-2 text-[10px] " + (on ? "border-white bg-white/25" : "border-current opacity-50")}>{on ? "✓" : ""}</span>
            <span>{o}</span>
          </button>
        );
      })}
    </div>
  );
}
