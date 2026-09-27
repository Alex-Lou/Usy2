import { useEffect } from "react";
import { HomeWidgets } from "../../features/feed/HomeWidgets";
import { CompanionPicker } from "../ui/CompanionPicker";

/**
 * 🖥️ The desktop right rail: our little widgets and the companion. Always
 * shown from xl; between lg and xl it is a drawer opened from the top bar
 * (closed by Escape, a new page or the top bar button again).
 */
export function RightRail({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <aside
      aria-label="Nos widgets et le compagnon"
      className={
        "fixed bottom-0 right-0 top-desk-bar z-30 w-shell-right flex-col gap-5 overflow-y-auto overflow-x-hidden border-l border-border glass px-4 py-5 "
        + (open ? "hidden shadow-card lg:flex" : "hidden xl:flex")
      }
    >
      <HomeWidgets />
      <section aria-label="Notre compagnon" className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold text-text-muted">Notre compagnon</p>
        <CompanionPicker compact />
      </section>
    </aside>
  );
}
