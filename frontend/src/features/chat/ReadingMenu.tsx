import { useEffect, useRef, useState } from "react";
import { FONT_GROUPS, FONTS, loadFont } from "../../lib/fonts";
import { READING_SIZES, type Reading } from "./reading";

/** "Aa": pick the font and size I read the messages in. */
export function ReadingMenu({ reading, onChange, error }: { reading: Reading; onChange: (r: Reading) => void; error: string | null }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Fonts are fetched only once the list is shown.
  useEffect(() => {
    if (open) FONT_GROUPS.forEach((g) => g.keys.forEach(loadFont));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const current = reading.font ?? "app";
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Police des messages"
        title="Police des messages"
        className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface font-serif text-sm font-bold text-text-muted press hover:border-primary/50 hover:text-text"
      >
        Aa
      </button>
      {open && (
        <div role="dialog" aria-label="Police des messages" className="absolute right-0 top-11 z-30 flex max-h-[60dvh] w-72 flex-col gap-3 overflow-y-auto rounded-token border border-border bg-surface p-3 shadow-card animate-pop">
          <p className="text-xs text-text-muted">Comment <strong>toi</strong> tu lis les messages (sur tous tes appareils).</p>
          <div className="grid grid-cols-4 gap-1" role="group" aria-label="Taille du texte">
            {READING_SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onChange({ ...reading, size: s.id })}
                aria-pressed={(reading.size ?? "m") === s.id}
                title={s.label}
                className={"rounded-token border py-1.5 font-semibold press " + ((reading.size ?? "m") === s.id ? "border-primary text-primary" : "border-border text-text-muted")}
                style={{ fontSize: s.px }}
              >
                A
              </button>
            ))}
          </div>
          {FONT_GROUPS.map((g) => (
            <div key={g.label} className="flex flex-col gap-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{g.label}</p>
              {g.keys.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChange({ ...reading, font: key === "app" ? null : key })}
                  aria-pressed={current === key}
                  className={"rounded-token px-2 py-1.5 text-left press " + (current === key ? "bg-primary/15 text-text ring-1 ring-primary" : "hover:bg-surface-2")}
                  style={{ fontFamily: FONTS[key].stack ?? undefined }}
                >
                  {FONTS[key].label} <span className="text-text-muted">· Coucou mon cœur</span>
                </button>
              ))}
            </div>
          ))}
          {error && <p role="alert" className="text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
