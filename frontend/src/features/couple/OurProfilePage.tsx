import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { SpaceSwitcher } from "../profile/SpaceSwitcher";
import { NousPanel } from "./NousPanel";
import { SharedAppearancePanel } from "./SharedAppearancePanel";

type Tab = "nous" | "reglages";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "nous", label: "Nous", icon: "💞" },
  { id: "reglages", label: "Réglages communs", icon: "🎛️" },
];

/**
 * 💞 "Notre profil": our shared space — since when, moods, notes, lists,
 * memories — and the app's look chosen by the two of us. Both can edit.
 */
export function OurProfilePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("onglet") === "reglages" ? "reglages" : "nous";

  return (
    <div className="flex flex-col gap-4">
      <SpaceSwitcher />
      <div>
        <h1 className="font-display text-2xl font-bold">Notre profil</h1>
        <p className="text-sm text-text-muted">À vous deux : ce que vous partagez, et l'allure commune de l'app.</p>
      </div>
      <div role="tablist" aria-label="Rubriques" className="flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              const next = new URLSearchParams(params);
              if (t.id === "nous") next.delete("onglet");
              else next.set("onglet", t.id);
              setParams(next, { replace: true });
            }}
            className={"chip press flex items-center gap-1.5 text-sm " + (tab === t.id ? "border-primary bg-surface-2 font-semibold text-primary" : "text-text-muted hover:border-primary/50")}
          >
            <span className="mc-emoji" aria-hidden="true">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>
      {tab === "nous" ? <NousPanel myId={user?.id} /> : <SharedAppearancePanel />}
    </div>
  );
}
