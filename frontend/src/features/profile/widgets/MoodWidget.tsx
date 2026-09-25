import { ago } from "../../couple/time";
import { useCouple } from "../../couple/useCouple";

/** The profile owner's live mood (set from the "Nous" banner). */
export function MoodWidget({ ownerId }: { ownerId?: number }) {
  const { couple } = useCouple();
  const mood = couple?.moods.find((m) => m.userId === ownerId);

  return (
    <div className="flex items-center gap-2 rounded-token border border-border bg-surface px-4 py-3">
      <span className="text-2xl">{mood?.emoji ?? "…"}</span>
      <span className="flex flex-col leading-tight">
        <span className="text-text">{mood?.label ?? "Humeur du moment"}</span>
        {mood && <span className="text-[11px] text-text-muted">{ago(mood.updatedAt)}</span>}
      </span>
    </div>
  );
}
