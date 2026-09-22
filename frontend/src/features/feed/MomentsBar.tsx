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

// A row of pre-made prompt cards so the feed never feels empty.
export function MomentsBar({ onPick }: { onPick: (m: Moment) => void }) {
  return (
    <div className="-mx-4 mb-4 px-4">
      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        {MOMENTS.map((m) => (
          <button
            key={m.key}
            onClick={() => onPick(m)}
            className="group flex w-24 shrink-0 flex-col items-center gap-2 rounded-token border border-border bg-surface p-3 text-center shadow-card transition press hover:border-primary/50"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full btn-brand transition group-hover:scale-105">
              <Icon name={m.icon} size={22} />
            </span>
            <span className="text-xs font-semibold leading-tight">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
