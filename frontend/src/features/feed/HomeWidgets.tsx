import { useEffect, useState } from "react";
import { getAllProfiles } from "../profile/api";
import type { Profile, Widget } from "../profile/types";
import { isWideMini, MiniWidget } from "../profile/widgets/MiniWidget";

/**
 * The widgets both people chose to show outside their profile ("Dans le menu
 * latéral" in the profile editor), shrunk to small tiles for the side menu,
 * each with its owner's first name.
 */
export function HomeWidgets() {
  const [items, setItems] = useState<{ owner: Profile; widget: Widget; key: string }[]>([]);

  useEffect(() => {
    getAllProfiles()
      .then((all) =>
        setItems(all.flatMap((p) => p.widgets.map((w, i) => ({ owner: p, widget: w, key: `${p.userId}-${i}` })).filter((x) => x.widget.home))),
      )
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;
  return (
    <section aria-label="Nos widgets" className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-text-muted">Nos petits widgets</p>
      <div className="grid grid-cols-2 gap-2">
        {items.map(({ owner, widget, key }) => (
          <div key={key} className={`flex min-w-0 flex-col gap-0.5 ${isWideMini(widget) ? "col-span-2" : ""}`}>
            <MiniWidget widget={widget} ownerId={owner.userId} />
            <span className="px-1 text-[9px] uppercase tracking-wide text-text-muted/80">{owner.displayName}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
