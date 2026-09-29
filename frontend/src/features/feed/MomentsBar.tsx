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

/** The pre-made prompts, shown inside the composer ("✨"). */
export function MomentsGrid({ onPick }: { onPick: (m: Moment) => void }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 animate-pop">
      {MOMENTS.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => onPick(m)}
          className="flex items-center gap-2 rounded-token border border-border bg-bg-2/40 p-2.5 text-left text-sm font-semibold transition press hover:border-primary/50"
        >
          <Icon name={m.icon} size={16} className="shrink-0 text-primary" />
          <span className="leading-tight">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
