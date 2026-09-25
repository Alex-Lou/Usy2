import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";
import { useAuth } from "../auth/useAuth";
import { onCoupleActivity } from "../couple/activity";
import { getSharedWidgets } from "../couple/api";
import { arrange, sidebarItems, useMySidebarPrefs, type SidebarItem } from "../couple/sidebar";
import { isWideMini, MiniWidget } from "../profile/widgets/MiniWidget";

/**
 * The side menu's widgets, shrunk to small tiles: the common ones and those
 * each of us shows from their profile, as I arranged them in "Ma barre
 * latérale" (hidden ones left out, my order, or the whole section off).
 * Kept in sync live.
 */
export function HomeWidgets() {
  const { user } = useAuth();
  const prefs = useMySidebarPrefs();
  const [items, setItems] = useState<SidebarItem[] | null>(null);

  const load = useCallback(() => {
    getSharedWidgets()
      .then((s) => setItems(sidebarItems(s, user?.id)))
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    load();
    return onCoupleActivity((a) => a.kind === "widgets" && load());
  }, [load]);

  if (!items || !prefs || prefs.off) return null;
  const { shown } = arrange(items, prefs);
  return (
    <section aria-label="Nos widgets" className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-text-muted">Nos petits widgets</p>
        <Link to="/widgets" className="grid h-6 w-6 place-items-center rounded-full text-text-muted press hover:text-primary" aria-label="Gérer ma barre latérale" title="Gérer ma barre latérale">
          <Icon name={shown.length ? "sliders" : "plus"} size={13} />
        </Link>
      </div>
      {shown.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {shown.map((it, i) => (
            <div key={`${it.key}-${i}`} title={it.ownerName ? `Depuis le profil de ${it.ownerName}` : undefined} className={`min-w-0 ${isWideMini(it.widget) ? "col-span-2" : ""}`}>
              <MiniWidget widget={it.widget} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
