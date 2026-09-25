import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";
import { onCoupleActivity } from "../couple/activity";
import { getSharedWidgets } from "../couple/api";
import { copiesOfLinked } from "../couple/linked";
import type { Widget } from "../profile/types";
import { isWideMini, MiniWidget } from "../profile/widgets/MiniWidget";

/**
 * The side menu's widgets, shrunk to small tiles: the common ones (editable by
 * both in "Nos widgets"), then those each of us shows from their profile.
 * Kept in sync live.
 */
export function HomeWidgets() {
  const [widgets, setWidgets] = useState<{ widget: Widget; from?: string }[] | null>(null);

  const load = useCallback(() => {
    getSharedWidgets()
      .then((s) => {
        const linked = s.linked ?? [];
        const isCopy = copiesOfLinked(linked); // shown once, from the profile
        setWidgets([
          ...s.widgets.filter((w) => !isCopy(w)).map((widget) => ({ widget })),
          ...linked.map((l) => ({ widget: l.widget, from: l.ownerName })),
        ]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    return onCoupleActivity((a) => a.kind === "widgets" && load());
  }, [load]);

  if (!widgets) return null;
  return (
    <section aria-label="Nos widgets" className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-text-muted">Nos petits widgets</p>
        <Link to="/widgets" className="grid h-6 w-6 place-items-center rounded-full text-text-muted press hover:text-primary" aria-label="Modifier nos widgets" title="Modifier nos widgets">
          <Icon name={widgets.length ? "sliders" : "plus"} size={13} />
        </Link>
      </div>
      {widgets.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {widgets.map(({ widget, from }, i) => (
            <div key={i} title={from ? `Depuis le profil de ${from}` : undefined} className={`min-w-0 ${isWideMini(widget) ? "col-span-2" : ""}`}>
              <MiniWidget widget={widget} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
