import { useEffect, useState } from "react";
import { getAllProfiles } from "../profile/api";
import type { Profile, Widget } from "../profile/types";
import { WidgetRenderer } from "../profile/widgets/WidgetRenderer";

/**
 * Widgets both people chose to also show on the home feed ("Aussi sur
 * l'accueil" in their profile editor), each with its owner's name.
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
    <section aria-label="Widgets de l'accueil" className="grid gap-3 sm:grid-cols-2 animate-fade-up">
      {items.map(({ owner, widget, key }) => (
        <div key={key} className="flex min-w-0 flex-col gap-1">
          <WidgetRenderer widget={widget} ownerId={owner.userId} />
          <span className="px-1 text-[11px] text-text-muted">{owner.displayName}</span>
        </div>
      ))}
    </section>
  );
}
