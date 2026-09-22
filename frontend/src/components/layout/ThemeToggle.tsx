import { useAppTheme } from "../../app/theme";
import { Icon } from "../ui/Icon";

// Segmented toggle between the two app themes.
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useAppTheme();
  const base =
    "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition press";
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-bg-2/60 p-1">
      <button
        type="button"
        onClick={() => setTheme("neo")}
        className={base + (theme === "neo" ? " btn-brand" : " text-text-muted hover:text-text")}
        aria-pressed={theme === "neo"}
      >
        <Icon name="moon" size={16} />
        {!compact && "Néon"}
      </button>
      <button
        type="button"
        onClick={() => setTheme("scrapbook")}
        className={base + (theme === "scrapbook" ? " btn-brand" : " text-text-muted hover:text-text")}
        aria-pressed={theme === "scrapbook"}
      >
        <Icon name="sun" size={16} />
        {!compact && "Papier"}
      </button>
    </div>
  );
}
