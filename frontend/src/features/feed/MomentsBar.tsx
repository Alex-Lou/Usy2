import { useState } from "react";
import { Icon, type IconName } from "../../components/ui/Icon";

export interface Moment {
  key: string;
  label: string;
  icon: IconName;
  text: string;
  wantImage?: boolean;
}

export const MOMENTS: Moment[] = [
  { key: "mood", label: "Humeur", icon: "sparkles", text: "Mon humeur aujourd'hui : " },
  { key: "photo", label: "Photo du jour", icon: "camera", text: "", wantImage: true },
  { key: "love", label: "Petit mot", icon: "heart", text: "Un petit mot pour toi 💕 : " },
  { key: "question", label: "Une question", icon: "chat", text: "J'ai une question pour toi : " },
  { key: "memory", label: "Souvenir", icon: "clock", text: "Tu te souviens quand… " },
  { key: "gratitude", label: "Gratitude", icon: "gift", text: "Aujourd'hui je suis reconnaissant·e pour " },
];

/**
 * A collapsed "idée ?" button that expands into a grid of pre-made prompts.
 * Replaces the old always-visible carousel: cleaner, out of the way until
 * wanted. Picking a moment collapses the panel again.
 */
export function MomentsBar({ onPick }: { onPick: (m: Moment) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="animate-fade-up">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-token border border-border bg-surface px-4 py-2.5 font-semibold shadow-card transition press hover:border-primary/50"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full btn-brand">
          <Icon name="sparkles" size={16} />
        </span>
        Une idée pour un post ?
        <Icon name="chevronDown" size={18} className={"ml-auto transition-transform " + (open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 animate-pop">
          {MOMENTS.map((m) => (
            <button
              key={m.key}
              onClick={() => {
                onPick(m);
                setOpen(false);
              }}
              className="group flex items-center gap-2 rounded-token border border-border bg-surface p-3 text-left text-sm font-semibold transition press hover:border-primary/50"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full btn-brand transition group-hover:scale-105">
                <Icon name={m.icon} size={18} />
              </span>
              <span className="leading-tight">{m.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
