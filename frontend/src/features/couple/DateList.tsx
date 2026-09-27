import { whenLabel, yearsLabel, type DateEntry } from "./dates";

/**
 * Dates as rows: emoji, title, when. Shared events open for editing when
 * `onEdit` is given; countdown widgets are shown but read-only.
 */
export function DateList({
  entries,
  onEdit,
  showWhen = true,
  compact = false,
}: {
  entries: DateEntry[];
  onEdit?: (entry: DateEntry) => void;
  showWhen?: boolean;
  compact?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {entries.map((entry) => {
        const editable = !!onEdit && entry.event !== null;
        const details = [
          showWhen ? whenLabel(entry.day) : null,
          showWhen ? entry.day.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : null,
          entry.time ? entry.time.replace(":", "h") : showWhen ? null : "toute la journée",
          yearsLabel(entry),
          entry.event === null ? "compte à rebours" : entry.yearly ? "chaque année" : null,
        ].filter(Boolean);
        const content = (
          <>
            <span className={`grid shrink-0 place-items-center rounded-full bg-surface-2 ${compact ? "h-8 w-8 text-base" : "h-10 w-10 text-xl"}`} aria-hidden="true">
              {entry.emoji || "📅"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-text">{entry.title}</span>
              <span className="block truncate text-xs text-text-muted">{details.join(" · ")}</span>
              {!compact && entry.event?.note && (
                <span className="mt-0.5 line-clamp-2 block whitespace-pre-line text-xs text-text">{entry.event.note}</span>
              )}
            </span>
          </>
        );
        return (
          <li key={entry.key}>
            {editable ? (
              <button
                type="button"
                onClick={() => onEdit!(entry)}
                className="flex w-full items-center gap-3 rounded-token p-1.5 text-left press hover:bg-surface-2/60"
                aria-label={`Modifier ${entry.title}`}
              >
                {content}
              </button>
            ) : (
              <div className="flex items-center gap-3 p-1.5">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
