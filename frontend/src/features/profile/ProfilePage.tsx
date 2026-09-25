import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { SPECIES, type Species } from "../../app/companion";
import { AssetImage } from "../../components/AssetImage";
import { Animal } from "../../components/ui/animals";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Loader } from "../../components/ui/states";
import { useAuth } from "../auth/useAuth";
import { NousPanel } from "../couple/NousPanel";
import { getProfile, updateMyProfile } from "./api";
import { useFonts } from "../../lib/fonts";
import { emitMyThemeSaved } from "./AppFonts";
import { fontsApply, fontVars, withFontChoice } from "./theme";
import { compact, fillOf, pageVars, PART_LABELS, partFonts, partsOf, PRESETS, skin, widgetStyle, type Parts } from "./partStyle";
import { GAPS, ProfileGrid } from "./ProfileGrid";
import { FontRow, Sheet, StylePanel } from "./StylePanel";
import type { PartKey, PartStyle, Profile, Theme, Widget, WidgetGap } from "./types";

/** What the styling sheet is showing: a part, one frame, or the ready-made looks. */
type Target = { part: PartKey } | { widget: number } | "presets";

export function ProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "nous" ? "nous" : "profil";
  const id = Number(userId);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Arranging my widgets: a draft of their sizes and spacing, saved on demand.
  const [draft, setDraft] = useState<{ widgets: Widget[]; gap: WidgetGap } | null>(null);
  // Styling my profile: a draft of the theme (parts, fonts) and of each frame's look.
  const [styling, setStyling] = useState<{ theme: Theme; widgets: Widget[] } | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [sheetH, setSheetH] = useState(() => Math.round(window.innerHeight * 0.42));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setError(null);
    setDraft(null);
    setStyling(null);
    setTarget(null);
    getProfile(id)
      .then((p) => !cancelled && setProfile(p))
      .catch(() => !cancelled && setError("Profil introuvable."));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // The styled part scrolls to the top, above the sheet.
  useEffect(() => {
    if (!target || target === "presets") return;
    requestAnimationFrame(() => document.querySelector('[data-styled="true"]')?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }, [target]);

  const theme = styling?.theme ?? profile?.theme;
  const widgets = draft?.widgets ?? styling?.widgets ?? profile?.widgets ?? [];
  const parts: Parts = theme ? partsOf(theme) : {};
  const fontsOn = theme ? fontsApply(theme) : false;
  useFonts(fontsOn ? theme?.font : null, fontsOn ? theme?.headingFont : null, ...partFonts(parts, widgets));

  if (error) return <div className="p-8 text-danger">{error}</div>;
  if (!profile || !theme) return <Loader />;

  const isOwn = user?.id === profile.userId;
  const page = parts.page ?? {};

  async function save(nextTheme: Theme, nextWidgets: Widget[]) {
    if (!profile) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await updateMyProfile(
        nextTheme,
        nextWidgets,
        profile.avatarAssetId ?? null,
        profile.bio ?? null,
        profile.coverAssetId ?? null,
        profile.avatarFraming ?? null,
        profile.coverFraming ?? null,
      );
      setProfile(saved);
      setDraft(null);
      setStyling(null);
      setTarget(null);
      emitMyThemeSaved(saved.theme); // "Toute l'app" fonts follow right away
    } catch (e) {
      setSaveError(e instanceof Error && e.message ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  function saveLayout() {
    if (!profile || !draft) return;
    void save({ ...profile.theme, widgetGap: draft.gap === "m" ? null : draft.gap }, draft.widgets);
  }

  function saveStyle() {
    if (!styling) return;
    const cleanParts = Object.fromEntries(
      Object.entries(styling.theme.parts ?? {}).flatMap(([k, v]) => (compact(v) ? [[k, compact(v)]] : [])),
    ) as Parts;
    // "app" mode: the old custom colours now live in the parts.
    void save({ ...styling.theme, mode: "app", parts: cleanParts }, styling.widgets.map((w) => ({ ...w, style: compact(w.style) })));
  }

  function startStyling() {
    if (!profile) return;
    setSaveError(null);
    setStyling({ theme: { ...withFontChoice(profile.theme), parts: partsOf(profile.theme) }, widgets: profile.widgets });
  }

  function cancelStyling() {
    setStyling(null);
    setTarget(null);
    setSaveError(null);
  }

  const setPart = (part: PartKey, s: PartStyle | undefined) =>
    setStyling((d) => d && { ...d, theme: { ...d.theme, parts: { ...d.theme.parts, [part]: s } } });
  const setWidgetStyle = (index: number, s: PartStyle | undefined) =>
    setStyling((d) => d && { ...d, widgets: d.widgets.map((w, i) => (i === index ? { ...w, style: s } : w)) });
  const setTheme = (patch: Partial<Theme>) => setStyling((d) => d && { ...d, theme: { ...d.theme, ...patch } });

  const companion: Species =
    profile.companion && (SPECIES as readonly string[]).includes(profile.companion)
      ? (profile.companion as Species)
      : "cat";

  const headerBox = skin(parts.header ?? {}, { box: true, scope: true });
  const headerText = skin(parts.header ?? {}, { text: true });
  const tabsLook = parts.tabs ?? {};
  const tabsBox = skin(tabsLook);
  const tabsBoxed = !!(fillOf(tabsLook) || tabsLook.glass || tabsLook.border || tabsLook.shadow);
  const picking = !!styling;
  const pickedPart = target && target !== "presets" && "part" in target ? target.part : null;
  const pickedWidget = target && target !== "presets" && "widget" in target ? target.widget : null;
  const pencil = (part: PartKey, className = "") =>
    picking && (
      <button
        type="button"
        onClick={() => setTarget({ part })}
        aria-label={`Styliser : ${PART_LABELS[part]}`}
        className={"z-10 grid h-9 w-9 place-items-center rounded-full btn-brand shadow-card press " + className}
      >
        ✏️
      </button>
    );

  return (
    // The profile's look applies only inside this view (and its page background behind it).
    <div style={{ ...fontVars(theme), ...pageVars(page) }} className="flex flex-col gap-6 font-sans text-text">
      <PageBackdrop look={page} />

      {styling && (
        <div className="sticky top-[calc(var(--topbar-h)+0.5rem)] z-30 flex flex-col gap-2 rounded-token border border-primary/40 bg-surface/95 p-2 text-text shadow-card backdrop-blur lg:top-2">
          <p className="px-1 text-xs text-text-muted">Touche un ✏️ pour changer ce morceau. Rien n'est enregistré avant « Enregistrer ».</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setTarget({ part: "page" })} className="chip press text-sm hover:border-primary/50">
              🖼️ Fond de page
            </button>
            <button type="button" onClick={() => setTarget({ part: "widgets" })} className="chip press text-sm hover:border-primary/50">
              🧩 Tous les cadres
            </button>
            <button type="button" onClick={() => setTarget("presets")} className="chip press text-sm hover:border-primary/50">
              ✨ Thèmes prêts
            </button>
            <span className="ml-auto flex gap-2">
              <Button type="button" variant="ghost" onClick={cancelStyling} className="!px-3 !py-1.5 text-sm">Annuler</Button>
              <Button type="button" onClick={saveStyle} disabled={saving} className="!px-3 !py-1.5 text-sm">{saving ? "…" : "Enregistrer"}</Button>
            </span>
          </div>
          {saveError && <p role="alert" className="px-1 text-xs text-danger">{saveError}</p>}
        </div>
      )}

      {/* Hero: cover band + overlapping avatar, with room to breathe. */}
      <div data-styled={pickedPart === "header"} className={"relative scroll-mt-24 " + headerBox.className} style={headerBox.style}>
        <div className={"card overflow-hidden bg-bg animate-fade-up " + (pickedPart === "header" ? "outline-dashed outline-2 outline-offset-2 outline-primary/60" : "")}>
          <div className="relative h-28 overflow-hidden sm:h-36" style={{ backgroundImage: "var(--grad)" }}>
            {profile.coverAssetId && (
              <AssetImage assetId={profile.coverAssetId} framing={profile.coverFraming} className="absolute inset-0 h-full w-full object-cover" />
            )}
            {isOwn && !picking && !draft && (
              <div className="absolute right-3 top-3 flex gap-2">
                <Link to="/profile/edit">
                  <Button variant="surface" className="!px-3 !py-1.5 text-sm">
                    <Icon name="user" size={15} /> Contenu
                  </Button>
                </Link>
                <Button variant="surface" onClick={startStyling} className="!px-3 !py-1.5 text-sm">
                  <Icon name="sparkles" size={15} /> Personnaliser
                </Button>
              </div>
            )}
          </div>

          <div className="px-6 pb-6">
            <div className="-mt-12 mb-3 rounded-full ring-4 ring-bg inline-block">
              <Avatar name={profile.displayName} size={96} assetId={profile.avatarAssetId} framing={profile.avatarFraming} species={profile.companion} />
            </div>
            <div className={headerText.className} style={headerText.style}>
              <div>
                <h1 className="font-display text-3xl font-bold text-primary">{profile.displayName}</h1>
                <p className="text-text-muted">@{isOwn ? user?.username : "profil"}</p>
                {profile.bio && <p className="mt-2 max-w-prose text-text">{profile.bio}</p>}
              </div>
            </div>
          </div>
        </div>
        {pencil("header", "absolute right-3 top-3")}
      </div>

      {/* Profile / shared "Nous" space (same content on both profiles). */}
      <div data-styled={pickedPart === "tabs"} className="flex scroll-mt-24 items-center gap-2">
        <div className={tabsBox.className} style={tabsBox.style}>
          <div role="tablist" className={"flex gap-2 " + (tabsBoxed ? "rounded-token border border-border p-1.5" : "")}>
            {(["profil", "nous"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setParams(t === "nous" ? { tab: "nous" } : {}, { replace: true })}
                className={
                  "chip press " + (tab === t ? "border-primary bg-surface-2 font-semibold text-text" : "text-text-muted hover:border-primary/50")
                }
              >
                {t === "profil" ? "Profil" : "Nous"}
              </button>
            ))}
          </div>
        </div>
        {pencil("tabs")}
      </div>

      {tab === "nous" ? (
        <NousPanel myId={user?.id} />
      ) : (
      /* Widgets — a grid; each widget has its own size (see ProfileGrid). */
      <section className="flex flex-col gap-3 animate-fade-up">
        <div className="flex flex-wrap items-center gap-2 px-1">
          <h2 className="mr-auto text-xs font-semibold uppercase tracking-wide text-text-muted">
            {isOwn ? "Mon petit monde" : `Le monde de ${profile.displayName}`}
          </h2>
          {isOwn && profile.widgets.length > 0 && !draft && !picking && (
            <button type="button" onClick={() => setDraft({ widgets: profile.widgets, gap: profile.theme.widgetGap ?? "m" })} className="chip press inline-flex items-center gap-1 text-xs hover:border-primary/50">
              <Icon name="sliders" size={13} /> Arranger
            </button>
          )}
        </div>
        {draft && (
          <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-token border border-primary/40 bg-surface/95 p-2 shadow-card backdrop-blur">
            <span className="text-xs text-text-muted">Tire le coin <strong>↘</strong> d'un cadre pour l'agrandir ou le rétrécir.</span>
            <span className="flex items-center gap-1 text-xs text-text-muted" role="group" aria-label="Écart entre les cadres">
              Écart :
              {GAPS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setDraft({ ...draft, gap: g.id })}
                  aria-pressed={draft.gap === g.id}
                  className={"chip press !py-0.5 text-xs " + (draft.gap === g.id ? "border-primary text-primary" : "")}
                >
                  {g.label}
                </button>
              ))}
            </span>
            <span className="ml-auto flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setDraft(null)} className="!px-3 !py-1.5 text-sm">Annuler</Button>
              <Button type="button" onClick={saveLayout} disabled={saving} className="!px-3 !py-1.5 text-sm">{saving ? "…" : "Enregistrer"}</Button>
            </span>
            {saveError && <p role="alert" className="w-full text-xs text-danger">{saveError}</p>}
          </div>
        )}

        {widgets.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-8 text-center">
            <Animal species={companion} size={64} />
            <p className="text-text-muted">
              {isOwn ? "Ton espace est encore vide." : "Rien ici pour l'instant."}
            </p>
            {isOwn && (
              <Link to="/profile/edit">
                <Button>
                  <Icon name="sparkles" size={16} /> Ajouter des widgets
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <ProfileGrid
            widgets={widgets}
            ownerId={profile.userId}
            gap={draft?.gap ?? theme.widgetGap}
            arranging={!!draft}
            onResize={(index, size) =>
              setDraft((d) => d && { ...d, widgets: d.widgets.map((w, i) => (i === index ? { ...w, w: size.w, h: size.h } : w)) })
            }
            styleOf={(i) => widgetStyle(parts, widgets[i])}
            onStyle={picking ? (i) => setTarget({ widget: i }) : undefined}
            styled={pickedWidget}
          />
        )}
      </section>
      )}

      {/* Room to scroll the last parts above the open sheet. */}
      {styling && target && <div aria-hidden="true" style={{ height: sheetH }} />}

      {styling && target === "presets" && (
        <Sheet title="Thèmes prêts" height={sheetH} onHeight={setSheetH} onClose={() => setTarget(null)}>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <p className="mb-3 text-xs text-text-muted">Un thème change la page, la présentation, les onglets et tous les cadres. Les cadres stylés un par un gardent leur style.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setTheme({ parts: { ...p.parts, page: { ...p.parts.page, photoAssetId: styling.theme.parts?.page?.photoAssetId, veil: styling.theme.parts?.page?.veil } } })}
                  className="flex flex-col overflow-hidden rounded-token border border-border text-left press hover:border-primary/60"
                >
                  <span className="h-16" style={{ background: p.swatch }} />
                  <span className="px-3 py-2 text-sm font-semibold">{p.label}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTheme({ parts: {} })}
                className="flex flex-col overflow-hidden rounded-token border border-dashed border-border text-left press hover:border-primary/60"
              >
                <span className="grid h-16 place-items-center text-2xl" style={{ background: "var(--app-bg)" }}>🌙</span>
                <span className="px-3 py-2 text-sm font-semibold">Celui de l'app</span>
              </button>
            </div>
          </div>
        </Sheet>
      )}

      {styling && pickedPart && (
        <StylePanel
          key={pickedPart}
          title={PART_LABELS[pickedPart]}
          page={pickedPart === "page"}
          value={styling.theme.parts?.[pickedPart] ?? {}}
          height={sheetH}
          onHeight={setSheetH}
          onChange={(s) => setPart(pickedPart, s)}
          onReset={() => setPart(pickedPart, undefined)}
          onClose={() => setTarget(null)}
          pageText={pickedPart === "page" ? <PageFonts theme={styling.theme} onChange={setTheme} /> : undefined}
          footer={
            pickedPart === "widgets" && (
              <p className="text-xs text-text-muted">Ces réglages s'appliquent à tous les cadres. Pour un seul, touche son ✏️.</p>
            )
          }
        />
      )}

      {styling && pickedWidget !== null && styling.widgets[pickedWidget] && (
        <StylePanel
          key={`w${pickedWidget}`}
          title={`Ce cadre (${pickedWidget + 1})`}
          value={styling.widgets[pickedWidget].style ?? {}}
          inherited={parts.widgets}
          height={sheetH}
          onHeight={setSheetH}
          onChange={(s) => setWidgetStyle(pickedWidget, s)}
          onReset={() => setWidgetStyle(pickedWidget, undefined)}
          onClose={() => setTarget(null)}
          footer={
            <button type="button" onClick={() => setTarget({ part: "widgets" })} className="chip press self-start text-sm hover:border-primary/50">
              🧩 Régler tous les cadres à la fois
            </button>
          }
        />
      )}
    </div>
  );
}

/** The page's own background, over the app's shared one, for as long as the profile is shown. */
function PageBackdrop({ look }: { look: PartStyle }) {
  const fill = fillOf(look);
  const shown = !!(look.photoAssetId || fill);
  // Tells the glass cards a background shows (see glass.css).
  useEffect(() => {
    if (!shown) return;
    document.documentElement.dataset.profileBg = "";
    return () => {
      delete document.documentElement.dataset.profileBg;
    };
  }, [shown]);
  if (!shown) return null;
  return createPortal(
    <div data-profile-backdrop="" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {look.photoAssetId ? (
        <>
          <AssetImage assetId={look.photoAssetId} className="h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: look.bg ?? "#000000", opacity: (look.veil ?? 0) / 100 }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: fill! }} />
      )}
    </div>,
    document.body,
  );
}

/** Page › Texte: the profile's fonts, for the profile or the whole app (for me). */
function PageFonts({ theme, onChange }: { theme: Theme; onChange: (patch: Partial<Theme>) => void }) {
  const scope = theme.fontScope ?? "profile";
  const own = (key: Theme["font"] | null | undefined) => (key && key !== "app" ? key : undefined);
  return (
    <>
      <FontRow
        label="Police du texte"
        value={own(theme.font)}
        defaultLabel="Celle de l'app"
        onChange={(font) => onChange({ font: font ?? "app", fontScope: scope })}
      />
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
