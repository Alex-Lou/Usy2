import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { ApiError } from "../../lib/api/client";
import { useAuth } from "../auth/useAuth";
import { compact, pageVars, PRESETS, skin } from "../profile/partStyle";
import { InlineBackdrop, PageBackdrop } from "../profile/ProfileBody";
import { SpaceSwitcher } from "../profile/SpaceSwitcher";
import { StyleControls } from "../profile/StyleControls";
import type { PartStyle } from "../profile/types";
import { onCoupleActivity } from "./activity";
import { getNousTheme, saveNousTheme } from "./api";
import { NousPanel } from "./NousPanel";
import { SharedAppearancePanel } from "./SharedAppearancePanel";

type Tab = "nous" | "allure" | "reglages";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "nous", label: "Nous", icon: "💞" },
  { id: "allure", label: "Allure", icon: "🎨" },
  { id: "reglages", label: "Réglages communs", icon: "🎛️" },
];

type NousParts = { page?: PartStyle; cards?: PartStyle };
type Target = "presets" | "page" | "cards";
const TARGETS: { id: Target; label: string; icon: string }[] = [
  { id: "presets", label: "Thèmes prêts", icon: "✨" },
  { id: "page", label: "Fond", icon: "🖼️" },
  { id: "cards", label: "Cartes", icon: "🗂️" },
];

/** Our space in its own look: its background behind the page, its cards dressed. */
function NousSpace({ parts, myId, inline = false }: { parts: NousParts; myId: number | undefined; inline?: boolean }) {
  const page = parts.page ?? {};
  return (
    <div style={pageVars(page)} className={"relative text-text " + (inline ? "isolate overflow-hidden rounded-token p-4" : "")}>
      {inline ? <InlineBackdrop look={page} /> : <PageBackdrop look={page} />}
      <NousPanel myId={myId} look={skin(parts.cards ?? {})} />
    </div>
  );
}

/**
 * 💞 "Notre profil": our shared space — since when, moods, notes, lists,
 * memories — in a look of its own that we choose together, and the app's
 * look chosen by the two of us. Both can edit everything here.
 */
export function OurProfilePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab: Tab = (["allure", "reglages"] as const).find((t) => t === params.get("onglet")) ?? "nous";
  const [saved, setSaved] = useState<NousParts>({});
  const [draft, setDraft] = useState<NousParts | null>(null); // the look being edited
  const [target, setTarget] = useState<Target>("presets");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getNousTheme()
      .then((t) => setSaved(t.parts ?? {}))
      .catch(() => {});
  }, []);

  // Either of us may change it: follow, without touching a look being edited.
  useEffect(() => {
    load();
    return onCoupleActivity((a) => a.kind === "appearance" && load());
  }, [load]);

  function go(next: Tab) {
    const q = new URLSearchParams(params);
    if (next === "nous") q.delete("onglet");
    else q.set("onglet", next);
    setParams(q, { replace: true });
  }

  const parts = draft ?? saved;
  const set = (change: (p: NousParts) => NousParts) => setDraft((d) => change(d ?? saved));

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const clean = Object.fromEntries(Object.entries(draft).flatMap(([k, v]) => (compact(v) ? [[k, compact(v)]] : [])));
      const t = await saveNousTheme({ parts: clean });
      setSaved(t.parts ?? {});
      setDraft(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SpaceSwitcher />
      <div>
        <h1 className="font-display text-2xl font-bold">Notre profil</h1>
        <p className="text-sm text-text-muted">À vous deux : ce que vous partagez, son allure, et celle de l'app.</p>
      </div>
      <div role="tablist" aria-label="Rubriques" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => go(t.id)}
            className={"chip press flex shrink-0 items-center gap-1.5 text-sm " + (tab === t.id ? "border-primary bg-surface-2 font-semibold text-primary" : "text-text-muted hover:border-primary/50")}
          >
            <span className="mc-emoji" aria-hidden="true">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {tab === "nous" && <NousSpace parts={saved} myId={user?.id} />}

      {tab === "allure" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="lg:order-2">
            <div className="lg:sticky lg:top-8">
              <p className="mb-2 text-sm text-text-muted">Aperçu en direct</p>
              <div className="pointer-events-none max-h-[46dvh] overflow-y-auto rounded-token border border-border lg:max-h-[78dvh]" aria-label="Aperçu de notre espace">
                <div style={{ zoom: 0.62 }}>
                  <NousSpace parts={parts} myId={user?.id} inline />
                </div>
              </div>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-3 lg:order-1">
            <p className="text-xs text-text-muted">L'allure de cet espace seulement, choisie à deux. Vos profils et l'app gardent la leur.</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Morceau à régler">
              {TARGETS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={target === t.id}
                  onClick={() => setTarget(t.id)}
                  className={"chip press flex items-center gap-1.5 text-sm " + (target === t.id ? "border-primary bg-surface-2 font-semibold text-primary" : "text-text-muted hover:border-primary/50")}
                >
                  <span className="mc-emoji" aria-hidden="true">{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
            {target === "presets" ? (
              <div className="card p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => set((cur) => ({ page: { ...p.parts.page, photoAssetId: cur.page?.photoAssetId, veil: cur.page?.veil }, cards: p.parts.widgets }))}
                      className="flex flex-col overflow-hidden rounded-token border border-border text-left press hover:border-primary/60"
                    >
                      <span className="h-14" style={{ background: p.swatch }} />
                      <span className="px-3 py-2 text-sm font-semibold">{p.label}</span>
                    </button>
                  ))}
                  <button type="button" onClick={() => set(() => ({}))} className="flex flex-col overflow-hidden rounded-token border border-dashed border-border text-left press hover:border-primary/60">
                    <span className="grid h-14 place-items-center text-2xl" style={{ background: "var(--app-bg)" }}>🌙</span>
                    <span className="px-3 py-2 text-sm font-semibold">Celui de l'app</span>
                  </button>
                </div>
              </div>
            ) : (
              <StyleControls
                key={target}
                title={target === "page" ? "Fond" : "Cartes"}
                page={target === "page"}
                value={parts[target] ?? {}}
                onChange={(s) => set((cur) => ({ ...cur, [target]: s }))}
                onReset={() => set((cur) => ({ ...cur, [target]: undefined }))}
              />
            )}
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          </div>
        </div>
      )}

      {tab === "reglages" && <SharedAppearancePanel />}

      {draft && (
        <div className="sticky bottom-[calc(var(--tabbar-h)+0.5rem)] z-20 flex flex-wrap items-center gap-2 rounded-token border border-primary/40 bg-surface/95 p-2 shadow-card backdrop-blur lg:bottom-4">
          <span className="px-1 text-sm text-text-muted">Allure modifiée (pour vous deux)</span>
          <span className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)} className="!px-3 !py-1.5 text-sm">Annuler</Button>
            <Button onClick={save} disabled={saving} className="!px-3 !py-1.5 text-sm">{saving ? "…" : "Enregistrer"}</Button>
          </span>
        </div>
      )}
    </div>
  );
}
