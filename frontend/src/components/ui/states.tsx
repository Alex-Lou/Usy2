import { useCompanion } from "../../app/companion";
import { Animal } from "./animals";

// Cute empty state featuring the chosen companion.
export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  const { companion } = useCompanion();
  return (
    <div className="card flex flex-col items-center gap-2 p-10 text-center">
      <Animal species={companion} size={84} className="animate-fade-up" />
      <p className="font-display text-xl font-bold">{title}</p>
      {subtitle && <p className="text-text-muted">{subtitle}</p>}
    </div>
  );
}

// Loading state with a bouncing companion.
export function Loader({ label = "Chargement…" }: { label?: string }) {
  const { companion } = useCompanion();
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-text-muted">
      <div className="animate-bounce">
        <Animal species={companion} size={64} />
      </div>
      <p className="text-sm">{label}</p>
    </div>
  );
}
