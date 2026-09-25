import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AssetImage } from "../../components/AssetImage";
import { FramingEditor } from "../../components/photo/FramingEditor";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { uploadImage } from "../../lib/api/assets";
import { ApiError } from "../../lib/api/client";
import type { Framing } from "../../lib/framing";
import { useAuth } from "../auth/useAuth";
import { getMyProfile, updateMyProfile } from "./api";
import { emitMyThemeSaved } from "./AppFonts";
import { DangerZone } from "./DangerZone";
import { GlassSetting } from "./GlassSetting";
import { NewsSetting } from "./NewsSetting";
import { compact, partsOf, PRESETS, type Parts } from "./partStyle";
import { ProfileBody } from "./ProfileBody";
import { GAPS, ProfileGrid } from "./ProfileGrid";
import { SpaceSwitcher } from "./SpaceSwitcher";
import { FontRow, StyleControls } from "./StyleControls";
import { withFontChoice } from "./theme";
import type { PartKey, PartStyle, Profile, Theme, Widget } from "./types";
import { WIDGET_LABELS } from "./widgets/registry";
import { cleanWidget, missingImage, WidgetListEditor } from "./widgets/WidgetEditor";

type Tab = "identite" | "widgets" | "disposition" | "apparence" | "moi";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "identite", label: "Identité", icon: "🪪" },
  { id: "widgets", label: "Widgets", icon: "🧩" },
  { id: "disposition", label: "Disposition", icon: "📐" },
  { id: "apparence", label: "Apparence", icon: "🎨" },
  { id: "moi", label: "Pour moi", icon: "🙂" },
];

/** What the Apparence tab is styling: the ready-made looks, a part, or one frame (by index). */
type Target = "presets" | PartKey | number;
const PART_TARGETS: { id: PartKey; label: string; icon: string }[] = [
  { id: "page", label: "Fond de page", icon: "🖼️" },
  { id: "header", label: "Présentation", icon: "🪪" },
  { id: "widgets", label: "Tous les cadres", icon: "🧩" },
];

interface Draft {
  theme: Theme;
  widgets: Widget[];
  avatarAssetId: number | null;
  coverAssetId: number | null;
  avatarFraming: Framing | null;
  coverFraming: Framing | null;
  bio: string;
}

function draftOf(p: Profile): Draft {
  return {
    theme: { ...withFontChoice(p.theme), parts: partsOf(p.theme) },
    widgets: p.widgets,
    avatarAssetId: p.avatarAssetId ?? null,
    coverAssetId: p.coverAssetId ?? null,
    avatarFraming: p.avatarFraming ?? null,
    coverFraming: p.coverFraming ?? null,
    bio: p.bio ?? "",
  };
}

/**
 * ✏️ "Mon profil": everything about my profile, calmly, one tab at a time —
 * identity, widgets, their layout, the look (with a live preview) and my own
 * settings. One draft for all tabs, saved with one button.
 */
export function MyProfilePage() {
  const { user, refreshUser } = useAuth();
  const [base, setBase] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<Tab>("identite");
  const [target, setTarget] = useState<Target>("presets");
  const [framing, setFraming] = useState<"avatar" | "cover" | null>(null); // editor open
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then((p) => {
        if (cancelled) return;
        setBase(p);
        setDraft(draftOf(p));
      })
      .catch(() => !cancelled && setError("Impossible de charger le profil."));
    return () => {
      cancelled = true;
    };
  }, []);

  // Every change goes through here: the draft moves on, and "Enregistrer" shows.
  const update = (change: (d: Draft) => Draft) => {
    setDraft((d) => d && change(d));
    setDirty(true);
    setSavedOnce(false);
  };
  const edit = (patch: Partial<Draft>) => update((d) => ({ ...d, ...patch }));
  const setTheme = (patch: Partial<Theme>) => update((d) => ({ ...d, theme: { ...d.theme, ...patch } }));
  const setPart = (part: PartKey, s: PartStyle | undefined) =>
    update((d) => ({ ...d, theme: { ...d.theme, parts: { ...d.theme.parts, [part]: s } } }));
  const setWidgetStyle = (index: number, s: PartStyle | undefined) =>
    update((d) => ({ ...d, widgets: d.widgets.map((w, i) => (i === index ? { ...w, style: s } : w)) }));

  async function upload(file: File, which: "avatar" | "cover") {
    setError(null);
    try {
      const asset = await uploadImage(file);
      if (which === "avatar") edit({ avatarAssetId: asset.id, avatarFraming: null });
      else edit({ coverAssetId: asset.id, coverFraming: null });
      setFraming(which); // a new photo: choose its part right away
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Envoi de la photo impossible.");
    }
  }

  async function save() {
    if (!draft) return;
    if (missingImage(draft.widgets)) {
      setError("Un widget Image n'a pas encore de photo. Ajoute une image ou supprime le widget.");
      setTab("widgets");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const parts = Object.fromEntries(
        Object.entries(draft.theme.parts ?? {}).flatMap(([k, v]) => (compact(v) ? [[k, compact(v)]] : [])),
      ) as Parts;
      const saved = await updateMyProfile(
        { ...draft.theme, mode: "app", parts }, // the old custom colours now live in the parts
        draft.widgets.map((w) => ({ ...cleanWidget(w), style: compact(w.style) })),
        draft.avatarAssetId,
        draft.bio.trim() || null,
        draft.coverAssetId,
        draft.avatarFraming,
        draft.coverFraming,
      );
      setBase(saved);
      setDraft(draftOf(saved));
      setDirty(false);
      setSavedOnce(true);
      emitMyThemeSaved(saved.theme); // "Toute l'app" fonts change right away
      await refreshUser(); // header/avatar reflect the new photo
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (!draft || !base) return <div className="p-8 text-text-muted">{error ?? "Chargement…"}</div>;

  const preview: Profile = {
    ...base,
    theme: draft.theme,
    widgets: draft.widgets,
    avatarAssetId: draft.avatarAssetId,
    coverAssetId: draft.coverAssetId,
    avatarFraming: draft.avatarFraming,
    coverFraming: draft.coverFraming,
    bio: draft.bio.trim() || null,
  };
  const withPreview = tab !== "disposition" && tab !== "moi";

  return (
    <div className="flex flex-col gap-4">
      <SpaceSwitcher />
      <div>
        <h1 className="font-display text-2xl font-bold">Mon profil</h1>
        <p className="text-sm text-text-muted">Ce que tu montres, et comment. Rien n'est visible avant « Enregistrer ».</p>
      </div>

      <div role="tablist" aria-label="Rubriques" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={"chip press flex shrink-0 items-center gap-1.5 text-sm " + (tab === t.id ? "border-primary bg-surface-2 font-semibold text-primary" : "text-text-muted hover:border-primary/50")}
          >
            <span className="mc-emoji" aria-hidden="true">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div className={withPreview ? "grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : ""}>
        {withPreview && (
          <div className="lg:order-2">
            <div className="lg:sticky lg:top-8">
              <p className="mb-2 text-sm text-text-muted">Aperçu en direct</p>
              <div className="pointer-events-none max-h-[46dvh] overflow-y-auto rounded-token border border-border lg:max-h-[78dvh]" aria-label="Aperçu du profil">
                <div style={{ zoom: 0.62 }}>
                  <ProfileBody profile={preview} theme={draft.theme} widgets={draft.widgets} handle={`@${user?.username ?? ""}`} own backdrop="inline" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-4 lg:order-1">
          {tab === "identite" && (
            <section className="card p-4">
              <div className="flex items-center gap-4">
                <Avatar key={draft.avatarAssetId ?? 0} name={user?.displayName ?? "?"} size={64} assetId={draft.avatarAssetId} framing={draft.avatarFraming} species={user?.companion} />
                <div className="flex flex-wrap gap-2">
                  <label className="chip cursor-pointer press hover:border-primary/50">
                    <Icon name="camera" size={14} /> {draft.avatarAssetId ? "Changer la photo" : "Ajouter une photo"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "avatar")} />
                  </label>
                  {draft.avatarAssetId && (
                    <button type="button" onClick={() => setFraming("avatar")} className="chip press hover:border-primary/50">
                      <Icon name="sliders" size={14} /> Recadrer
                    </button>
                  )}
                  {draft.avatarAssetId && (
                    <button type="button" onClick={() => edit({ avatarAssetId: null })} className="chip press text-danger hover:border-danger/50">
                      Retirer
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <span className="mb-1 block text-sm text-text-muted">Photo de couverture</span>
                <div className="relative h-24 overflow-hidden rounded-token border border-border" style={{ backgroundImage: "var(--grad)" }}>
                  {draft.coverAssetId && <AssetImage key={draft.coverAssetId} assetId={draft.coverAssetId} framing={draft.coverFraming} className="h-full w-full object-cover" />}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <label className="chip cursor-pointer press hover:border-primary/50">
                    <Icon name="images" size={14} /> {draft.coverAssetId ? "Changer la couverture" : "Ajouter une couverture"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "cover")} />
                  </label>
                  {draft.coverAssetId && (
                    <button type="button" onClick={() => setFraming("cover")} className="chip press hover:border-primary/50">
                      <Icon name="sliders" size={14} /> Recadrer
                    </button>
                  )}
                  {draft.coverAssetId && (
                    <button type="button" onClick={() => edit({ coverAssetId: null })} className="chip press text-danger hover:border-danger/50">
                      Retirer la couverture
                    </button>
                  )}
                </div>
              </div>
              {framing === "avatar" && draft.avatarAssetId && (
                <FramingEditor
                  assetId={draft.avatarAssetId}
                  aspect={1}
                  round
                  initial={draft.avatarFraming}
                  title="Cadrer ta photo de profil"
                  onCancel={() => setFraming(null)}
                  onSave={(f) => {
                    edit({ avatarFraming: f });
                    setFraming(null);
                  }}
                />
              )}
              {framing === "cover" && draft.coverAssetId && (
                <FramingEditor
                  assetId={draft.coverAssetId}
                  aspect={3.2} // the banner on a phone (it gets wider on a computer)
                  initial={draft.coverFraming}
                  title="Cadrer ta couverture"
                  onCancel={() => setFraming(null)}
                  onSave={(f) => {
                    edit({ coverFraming: f });
                    setFraming(null);
                  }}
                />
              )}
              <label className="mt-3 block text-sm">
                <span className="mb-1 block text-text-muted">Bio</span>
                <textarea
                  value={draft.bio}
                  maxLength={200}
                  rows={2}
                  placeholder="Un mot sur toi… 💫"
                  onChange={(e) => edit({ bio: e.target.value })}
                  className="w-full resize-none rounded-token border border-border bg-bg-2/60 px-3 py-2 text-text outline-none focus:border-primary/70"
                />
              </label>
            </section>
          )}

          {tab === "widgets" && (
            <section className="card p-4">
              <p className="mb-3 text-xs text-text-muted">
                Ceux de ton profil sont à toi. « Aussi dans la barre latérale » l'y montre à vous deux, tant qu'il est sur ton profil.{" "}
                <Link to="/profile/barre" className="text-primary underline-offset-2 hover:underline">Gérer toute ma barre latérale</Link>
              </p>
              <WidgetListEditor
                widgets={draft.widgets}
                onChange={(change) => update((d) => ({ ...d, widgets: change(d.widgets) }))}
                onError={setError}
                footer={(w, i) => (
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!w.sidebar}
                      onChange={(e) => {
                        const on = e.target.checked || undefined;
                        update((d) => ({ ...d, widgets: d.widgets.map((x, j) => (j === i ? { ...x, sidebar: on } : x)) }));
                      }}
                      className="h-4 w-4 accent-[var(--color-primary)]"
                    />
                    Aussi dans la barre latérale <span className="text-xs text-text-muted">(visible par vous deux)</span>
                  </label>
                )}
              />
            </section>
          )}

          {tab === "disposition" && (
            <section className="flex flex-col gap-3">
              <div className="card flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="text-text-muted">Tire le coin <strong>↘</strong> d'un cadre pour l'agrandir ou le rétrécir.</span>
                <span className="ml-auto flex items-center gap-1 text-text-muted" role="group" aria-label="Écart entre les cadres">
                  Écart :
                  {GAPS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setTheme({ widgetGap: g.id === "m" ? null : g.id })}
                      aria-pressed={(draft.theme.widgetGap ?? "m") === g.id}
                      className={"chip press !py-0.5 text-xs " + ((draft.theme.widgetGap ?? "m") === g.id ? "border-primary text-primary" : "")}
                    >
                      {g.label}
                    </button>
                  ))}
                </span>
              </div>
              {draft.widgets.length === 0 ? (
                <p className="card p-6 text-center text-text-muted">Ajoute d'abord des widgets (onglet Widgets).</p>
              ) : (
                <ProfileGrid
                  widgets={draft.widgets}
                  ownerId={base.userId}
                  gap={draft.theme.widgetGap}
                  arranging
                  onResize={(index, size) => update((d) => ({ ...d, widgets: d.widgets.map((w, i) => (i === index ? { ...w, w: size.w, h: size.h } : w)) }))}
                />
              )}
            </section>
          )}

          {tab === "apparence" && (
            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Morceau à régler">
                {[{ id: "presets" as const, label: "Thèmes prêts", icon: "✨" }, ...PART_TARGETS].map((t) => (
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
                {draft.widgets.length > 0 && (
                  <select
                    aria-label="Un seul cadre"
                    value={typeof target === "number" ? String(target) : ""}
                    onChange={(e) => e.target.value !== "" && setTarget(Number(e.target.value))}
                    className={"chip press text-sm " + (typeof target === "number" ? "border-primary font-semibold text-primary" : "text-text-muted")}
                  >
                    <option value="">Un seul cadre…</option>
                    {draft.widgets.map((w, i) => (
                      <option key={i} value={i}>
                        {i + 1}. {WIDGET_LABELS[w.type]}
                        {w.style ? " (style à lui)" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {target === "presets" && (
                <div className="card p-4">
                  <p className="mb-3 text-xs text-text-muted">Un thème change le fond, la présentation et tous les cadres. Les cadres stylés un par un gardent leur style.</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setTheme({ parts: { ...p.parts, page: { ...p.parts.page, photoAssetId: draft.theme.parts?.page?.photoAssetId, veil: draft.theme.parts?.page?.veil } } })}
                        className="flex flex-col overflow-hidden rounded-token border border-border text-left press hover:border-primary/60"
                      >
                        <span className="h-14" style={{ background: p.swatch }} />
                        <span className="px-3 py-2 text-sm font-semibold">{p.label}</span>
                      </button>
                    ))}
                    <button type="button" onClick={() => setTheme({ parts: {} })} className="flex flex-col overflow-hidden rounded-token border border-dashed border-border text-left press hover:border-primary/60">
                      <span className="grid h-14 place-items-center text-2xl" style={{ background: "var(--app-bg)" }}>🌙</span>
                      <span className="px-3 py-2 text-sm font-semibold">Celui de l'app</span>
                    </button>
                  </div>
                </div>
              )}

              {typeof target === "string" && target !== "presets" && (
                <StyleControls
                  key={target}
                  title={PART_TARGETS.find((p) => p.id === target)!.label}
                  page={target === "page"}
                  value={draft.theme.parts?.[target] ?? {}}
                  onChange={(s) => setPart(target, s)}
                  onReset={() => setPart(target, undefined)}
                  pageText={target === "page" ? <PageFonts theme={draft.theme} onChange={setTheme} /> : undefined}
                  footer={target === "widgets" && <p className="text-xs text-text-muted">Pour un seul cadre : « Un seul cadre… » au-dessus.</p>}
                />
              )}

              {typeof target === "number" && draft.widgets[target] && (
                <StyleControls
                  key={`w${target}`}
                  title={`Cadre ${target + 1} · ${WIDGET_LABELS[draft.widgets[target].type]}`}
                  value={draft.widgets[target].style ?? {}}
                  inherited={draft.theme.parts?.widgets}
                  onChange={(s) => setWidgetStyle(target, s)}
                  onReset={() => setWidgetStyle(target, undefined)}
                />
              )}
            </section>
          )}

          {tab === "moi" && (
            <div className="flex flex-col gap-4">
              <GlassSetting />
              <NewsSetting />
              <p className="text-xs text-text-muted">
                Tes polices pour toute l'app : Apparence › Fond de page › Texte › « Toute l'app (pour moi) ». La police de lecture des messages : bouton « Aa » dans Messages.
              </p>
              <DangerZone />
            </div>
          )}

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
      </div>

      {(dirty || savedOnce) && (
        <div className="sticky bottom-[calc(var(--tabbar-h)+0.5rem)] z-20 flex flex-wrap items-center gap-2 rounded-token border border-primary/40 bg-surface/95 p-2 shadow-card backdrop-blur lg:bottom-4">
          {dirty ? (
            <>
              <span className="px-1 text-sm text-text-muted">Modifications non enregistrées</span>
              <span className="ml-auto flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDraft(draftOf(base));
                    setDirty(false);
                  }}
                  className="!px-3 !py-1.5 text-sm"
                >
                  Annuler
                </Button>
                <Button onClick={save} disabled={saving} className="!px-3 !py-1.5 text-sm">{saving ? "…" : "Enregistrer"}</Button>
              </span>
            </>
          ) : (
            <>
              <span className="px-1 text-sm">Enregistré ✓</span>
              <Link to={`/profile/${base.userId}`} className="ml-auto chip press text-sm hover:border-primary/50">👁 Voir mon profil</Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Fond de page › Texte: the profile's fonts, for the profile or the whole app (for me). */
function PageFonts({ theme, onChange }: { theme: Theme; onChange: (patch: Partial<Theme>) => void }) {
  const scope = theme.fontScope ?? "profile";
  const own = (key: Theme["font"] | null | undefined) => (key && key !== "app" ? key : undefined);
  return (
    <>
      <FontRow label="Police du texte" value={own(theme.font)} defaultLabel="Celle de l'app" onChange={(font) => onChange({ font: font ?? "app", fontScope: scope })} />
      <FontRow
        label="Police des titres"
        value={own(theme.headingFont)}
        defaultLabel="Comme le texte"
        onChange={(headingFont) => onChange({ headingFont: headingFont ?? "app", fontScope: scope })}
      />
      <div className="flex flex-col gap-1.5 text-sm" role="group" aria-label="Appliquer ces polices à">
        <span className="text-text">Appliquer ces polices à</span>
        <div className="flex items-center gap-1 rounded-full border border-border bg-bg-2/60 p-1">
          {(["profile", "app"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ fontScope: s })}
              aria-pressed={scope === s}
              className={"flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition press " + (scope === s ? "btn-brand" : "text-text-muted hover:text-text")}
            >
              {s === "profile" ? "Mon profil" : "Toute l'app (pour moi)"}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-text-muted">
          {scope === "app" ? "Toute l'interface prend tes polices, sur tous tes appareils. Ton binôme garde les siennes." : "Seule ta page profil utilise ces polices (aussi quand ton binôme la regarde)."}
        </span>
      </div>
    </>
  );
}
