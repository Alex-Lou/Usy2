import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AssetImage } from "../../components/AssetImage";
import { FramingEditor } from "../../components/photo/FramingEditor";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Input } from "../../components/ui/Input";
import { ApiError } from "../../lib/api/client";
import type { Framing } from "../../lib/framing";
import { useAuth } from "../auth/useAuth";
import { uploadImage } from "../../lib/api/assets";
import { getMyProfile, updateMyProfile } from "./api";
import { FONT_GROUPS, FONTS, useFonts } from "../../lib/fonts";
import { emitMyThemeSaved } from "./AppFonts";
import { buildThemeStyle, LAYOUT_LABELS } from "./theme";
import type { FontKey, LayoutKey, Theme, ThemeColors, ThemeMode, Widget, WidgetType } from "./types";
import { WidgetRenderer } from "./widgets/WidgetRenderer";
import { PinsEditor } from "./widgets/PinsEditor";
import { normalizePinUrl } from "./widgets/pinSuggestions";
import { SVG_GROUPS, SVG_LABELS, WIDGET_LABELS } from "./widgets/registry";

const COLOR_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: "bg", label: "Fond" },
  { key: "surface", label: "Cartes" },
  { key: "primary", label: "Accent" },
  { key: "text", label: "Texte" },
];

const WIDGET_TYPES: WidgetType[] = [
  "richtext", "quote", "marquee", "mood", "clock", "countdown", "image", "svg", "pins",
];

function defaultWidget(type: WidgetType): Widget {
  switch (type) {
    case "marquee":
      return { type: "marquee", text: "Bienvenue sur mon espace 💕" };
    case "quote":
      return { type: "quote", text: "Une citation" };
    case "richtext":
      return { type: "richtext", text: "**Coucou** mon amour 💕\nUn *petit* mot ici." };
    case "mood":
      return { type: "mood" };
    case "clock":
      return { type: "clock", label: "" };
    case "countdown":
      return { type: "countdown", date: "2026-12-25", label: "" };
    case "image":
      return { type: "image", assetId: 0, label: "" };
    case "svg":
      return { type: "svg", variant: "heart", label: "" };
    case "pins":
      return { type: "pins", label: "Accès rapides", pins: [{ label: "Pinterest", url: "https://www.pinterest.com" }] };
  }
}

const selectClass =
  "w-full rounded-token border border-border bg-bg-2/60 px-3 py-2.5 text-text outline-none focus:border-primary/70";

export function ProfileEditPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [theme, setTheme] = useState<Theme | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [avatarAssetId, setAvatarAssetId] = useState<number | null>(null);
  const [coverAssetId, setCoverAssetId] = useState<number | null>(null);
  const [avatarFraming, setAvatarFraming] = useState<Framing | null>(null);
  const [coverFraming, setCoverFraming] = useState<Framing | null>(null);
  const [framing, setFraming] = useState<"avatar" | "cover" | null>(null); // editor open
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useFonts(theme?.font, theme?.headingFont); // previews show the chosen fonts

  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then((p) => {
        if (!cancelled) {
          setTheme(withFontChoice({ ...p.theme, mode: p.theme.mode ?? "app" }));
          setWidgets(p.widgets);
          setAvatarAssetId(p.avatarAssetId ?? null);
          setCoverAssetId(p.coverAssetId ?? null);
          setAvatarFraming(p.avatarFraming ?? null);
          setCoverFraming(p.coverFraming ?? null);
          setBio(p.bio ?? "");
        }
      })
      .catch(() => !cancelled && setError("Impossible de charger le profil."));
    return () => {
      cancelled = true;
    };
  }, []);

  async function uploadCover(file: File) {
    setError(null);
    try {
      const asset = await uploadImage(file);
      setCoverAssetId(asset.id);
      setCoverFraming(null);
      setFraming("cover"); // a new photo: choose its part right away
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Envoi de la photo impossible.");
    }
  }

  async function uploadAvatar(file: File) {
    setError(null);
    try {
      const asset = await uploadImage(file);
      setAvatarAssetId(asset.id);
      setAvatarFraming(null);
      setFraming("avatar");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Envoi de la photo impossible.");
    }
  }

  function setColor(key: keyof ThemeColors, value: string) {
    setTheme((t) => (t ? { ...t, colors: { ...t.colors, [key]: value } } : t));
  }

  function setMode(mode: ThemeMode) {
    setTheme((t) => (t ? { ...t, mode } : t));
  }

  function moveWidget(index: number, dir: -1 | 1) {
    setWidgets((list) => {
      const next = [...list];
      const target = index + dir;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateWidget(index: number, patch: Partial<Widget>) {
    setWidgets((list) => list.map((w, i) => (i === index ? ({ ...w, ...patch } as Widget) : w)));
  }

  async function uploadForWidget(index: number, file: File) {
    setError(null);
    try {
      const asset = await uploadImage(file);
      updateWidget(index, { assetId: asset.id });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Envoi de l'image impossible.");
    }
  }

  async function handleSave() {
    if (!theme) return;
    if (widgets.some((w) => w.type === "image" && (!w.assetId || w.assetId <= 0))) {
      setError("Un widget Image n'a pas encore de photo. Ajoute une image ou supprime le widget.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await updateMyProfile(
        theme,
        widgets.map(cleanWidget),
        avatarAssetId,
        bio.trim() || null,
        coverAssetId,
        avatarFraming,
        coverFraming,
      );
      await refreshUser(); // header/avatar reflect the new photo
      navigate(`/profile/${saved.userId}`, { replace: true });
      emitMyThemeSaved(saved.theme); // "Toute l'app" fonts change right away
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (!theme) return <div className="p-8 text-text-muted">{error ?? "Chargement…"}</div>;

  const custom = theme.mode === "custom";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-bold animate-fade-up">Personnaliser mon profil</h1>

        <section className="card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Icon name="user" size={18} /> Identité</h2>
          <div className="flex items-center gap-4">
            <Avatar key={avatarAssetId ?? 0} name={user?.displayName ?? "?"} size={64} assetId={avatarAssetId} framing={avatarFraming} species={user?.companion} />
            <div className="flex flex-wrap gap-2">
              <label className="chip cursor-pointer press hover:border-primary/50">
                <Icon name="camera" size={14} /> {avatarAssetId ? "Changer la photo" : "Ajouter une photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAvatar(f);
                  }}
                />
              </label>
              {avatarAssetId && (
                <button type="button" onClick={() => setFraming("avatar")} className="chip press hover:border-primary/50">
                  <Icon name="sliders" size={14} /> Recadrer
                </button>
              )}
              {avatarAssetId && (
                <button type="button" onClick={() => setAvatarAssetId(null)} className="chip press text-danger hover:border-danger/50">
                  Retirer
                </button>
              )}
            </div>
          </div>
          <div className="mt-4">
            <span className="mb-1 block text-sm text-text-muted">Photo de couverture</span>
            <div className="relative h-24 overflow-hidden rounded-token border border-border" style={{ backgroundImage: "var(--grad)" }}>
              {coverAssetId && <AssetImage key={coverAssetId} assetId={coverAssetId} framing={coverFraming} className="h-full w-full object-cover" />}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="chip cursor-pointer press hover:border-primary/50">
                <Icon name="images" size={14} /> {coverAssetId ? "Changer la couverture" : "Ajouter une couverture"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadCover(f);
                  }}
                />
              </label>
              {coverAssetId && (
                <button type="button" onClick={() => setFraming("cover")} className="chip press hover:border-primary/50">
                  <Icon name="sliders" size={14} /> Recadrer
                </button>
              )}
              {coverAssetId && (
                <button type="button" onClick={() => setCoverAssetId(null)} className="chip press text-danger hover:border-danger/50">
                  Retirer la couverture
                </button>
              )}
            </div>
          </div>
          {framing === "avatar" && avatarAssetId && (
            <FramingEditor
              assetId={avatarAssetId}
              aspect={1}
              round
              initial={avatarFraming}
              title="Cadrer ta photo de profil"
              onCancel={() => setFraming(null)}
              onSave={(f) => {
                setAvatarFraming(f);
                setFraming(null);
              }}
            />
          )}
          {framing === "cover" && coverAssetId && (
            <FramingEditor
              assetId={coverAssetId}
              aspect={3.2} // the banner on a phone (it gets wider on a computer)
              initial={coverFraming}
              title="Cadrer ta couverture"
              onCancel={() => setFraming(null)}
              onSave={(f) => {
                setCoverFraming(f);
                setFraming(null);
              }}
            />
          )}
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-text-muted">Bio</span>
            <textarea
              value={bio}
              maxLength={200}
              rows={2}
              placeholder="Un mot sur toi… 💫"
              onChange={(e) => setBio(e.target.value)}
              className="w-full resize-none rounded-token border border-border bg-bg-2/60 px-3 py-2 text-text outline-none focus:border-primary/70"
            />
          </label>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><Icon name="sparkles" size={18} /> Apparence</h2>
          <div className="mb-3 flex items-center gap-1 rounded-full border border-border bg-bg-2/60 p-1">
            <button
              type="button"
              onClick={() => setMode("app")}
              aria-pressed={!custom}
              className={"flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition press " + (!custom ? "btn-brand" : "text-text-muted hover:text-text")}
            >
              Suivre le thème
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              aria-pressed={custom}
              className={"flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition press " + (custom ? "btn-brand" : "text-text-muted hover:text-text")}
            >
              Couleurs perso
            </button>
          </div>
          {custom ? (
            <div className="grid grid-cols-2 gap-3">
              {COLOR_FIELDS.map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between gap-2 rounded-token-sm border border-border bg-bg-2/40 px-3 py-2 text-sm">
                  <span>{label}</span>
                  <input type="color" value={theme.colors[key]} onChange={(e) => setColor(key, e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent" />
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">Ton profil suit automatiquement le thème clair/sombre de l'app. 🌙</p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-semibold">Style</h2>
          <div className="grid grid-cols-2 gap-3">
            <FontSelect label="Police du texte" value={theme.font} onChange={(font) => setTheme({ ...theme, font })} />
            <FontSelect
              label="Police des titres"
              value={theme.headingFont ?? "app"}
              appLabel="Comme le texte"
              onChange={(headingFont) => setTheme({ ...theme, headingFont })}
            />
            <div className="col-span-2 rounded-token-sm border border-border bg-bg-2/40 px-3 py-2" style={buildThemeStyle({ ...theme, mode: "app" })}>
              <p className="font-display text-lg font-bold text-text">Nos souvenirs ✨</p>
              <p className="font-sans text-sm text-text">Un petit mot doux, écrit avec ta police : é, à, ç, œ… 💕</p>
            </div>
            <div className="col-span-2 text-sm">
              <span className="mb-1 block text-text-muted">Appliquer ces polices à</span>
              <div className="flex items-center gap-1 rounded-full border border-border bg-bg-2/60 p-1">
                {(["profile", "app"] as const).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setTheme({ ...theme, fontScope: scope })}
                    aria-pressed={theme.fontScope === scope}
                    className={"flex-1 rounded-full px-3 py-1.5 text-sm font-semibold transition press " + (theme.fontScope === scope ? "btn-brand" : "text-text-muted hover:text-text")}
                  >
                    {scope === "profile" ? "Mon profil" : "Toute l'app (pour moi)"}
                  </button>
                ))}
              </div>
              <span className="mt-1 block text-[11px] text-text-muted">
                {theme.fontScope === "app"
                  ? "Toute l'interface prend tes polices, sur tous tes appareils. Ton binôme garde les siennes."
                  : "Seule ta page profil utilise ces polices (aussi quand ton binôme la regarde)."}
              </span>
            </div>
            <label className="text-sm">
              <span className="mb-1 block text-text-muted">Disposition</span>
              <select value={theme.layout} onChange={(e) => setTheme({ ...theme, layout: e.target.value as LayoutKey })} className={selectClass}>
                {(Object.keys(LAYOUT_LABELS) as LayoutKey[]).map((l) => <option key={l} value={l}>{LAYOUT_LABELS[l]}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Widgets</h2>
            <div className="flex flex-wrap justify-end gap-1">
              {WIDGET_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => setWidgets([...widgets, defaultWidget(t)])} className="chip press hover:border-primary/50">
                  + {WIDGET_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {widgets.length === 0 && <p className="text-sm text-text-muted">Aucun widget. Ajoutes-en un ci-dessus.</p>}
            {widgets.map((w, i) => (
              <div key={i} className="rounded-token border border-border bg-bg-2/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{WIDGET_LABELS[w.type]}</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveWidget(i, -1)} aria-label="Monter" className="grid h-7 w-7 place-items-center rounded-token-sm border border-border press"><Icon name="arrowUp" size={14} /></button>
                    <button type="button" onClick={() => moveWidget(i, 1)} aria-label="Descendre" className="grid h-7 w-7 place-items-center rounded-token-sm border border-border press"><Icon name="arrowDown" size={14} /></button>
                    <button type="button" onClick={() => setWidgets(widgets.filter((_, j) => j !== i))} aria-label="Supprimer" className="grid h-7 w-7 place-items-center rounded-token-sm text-danger press"><Icon name="x" size={14} /></button>
                  </div>
                </div>
                <WidgetEditor widget={w} onPatch={(p) => updateWidget(i, p)} onUpload={(f) => uploadForWidget(i, f)} />
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-text-muted">
                  <input
                    type="checkbox"
                    checked={!!w.home}
                    onChange={(e) => updateWidget(i, { home: e.target.checked })}
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  Dans le menu latéral
                </label>
              </div>
            ))}
          </div>
        </section>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          <Button variant="surface" onClick={() => navigate(-1)}>Annuler</Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <p className="mb-2 text-sm text-text-muted">Aperçu</p>
        <div style={buildThemeStyle(theme)} className="card bg-bg p-4 font-sans text-text">
          <div className="flex flex-col gap-3">
            {widgets.length === 0 ? (
              <p className="text-text-muted">L'aperçu apparaîtra ici.</p>
            ) : (
              widgets.map((w, i) => <WidgetRenderer key={i} widget={w} ownerId={user?.id} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Pins: complete "site.fr" into https://site.fr, drop empty rows and empty names before saving. */
/**
 * A theme saved before fonts had a scope shows its font only with custom
 * colors: in the editor it becomes an explicit choice with the same result
 * (its font on the profile with custom colors, the app's font otherwise).
 * With no font of its own yet, a new choice applies to the whole app.
 */
function withFontChoice(theme: Theme): Theme {
  if (theme.fontScope) return { ...theme, headingFont: theme.headingFont ?? "app" };
  if (theme.mode === "custom") return { ...theme, headingFont: "app", fontScope: "profile" };
  return { ...theme, font: "app", headingFont: "app", fontScope: "app" };
}

function FontSelect({
  label,
  value,
  appLabel,
  onChange,
}: {
  label: string;
  value: FontKey;
  /** Name of the "no font of its own" choice (titles follow the text font). */
  appLabel?: string;
  onChange: (font: FontKey) => void;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-text-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as FontKey)} className={selectClass}>
        {FONT_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.keys.map((key) => (
              <option key={key} value={key}>
                {key === "app" && appLabel ? appLabel : FONTS[key].label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function cleanWidget(w: Widget): Widget {
  if (w.type !== "pins") return w;
  const pins = w.pins
    .map((p) => ({ url: normalizePinUrl(p.url), label: p.label?.trim() || undefined }))
    .filter((p) => p.url);
  return { ...w, label: w.label?.trim() || undefined, pins };
}

function WidgetEditor({
  widget,
  onPatch,
  onUpload,
}: {
  widget: Widget;
  onPatch: (patch: Partial<Widget>) => void;
  onUpload: (file: File) => void;
}) {
  switch (widget.type) {
    case "marquee":
      return (
        <div>
          <Input value={widget.text} maxLength={280} onChange={(e) => onPatch({ text: e.target.value })} />
          <p className="mt-1 text-[11px] text-text-muted">Petit bandeau qui défile en haut de ton profil (mot de bienvenue, humeur du moment…).</p>
        </div>
      );
    case "quote":
      return <Input value={widget.text} maxLength={280} onChange={(e) => onPatch({ text: e.target.value })} />;
    case "richtext":
      return (
        <div>
          <textarea
            value={widget.text}
            maxLength={1000}
            rows={3}
            onChange={(e) => onPatch({ text: e.target.value })}
            className="w-full resize-none rounded-token border border-border bg-bg-2/60 px-3 py-2 text-text outline-none focus:border-primary/70"
          />
          <p className="mt-1 text-[11px] text-text-muted">**gras** · *italique* · [lien](https://…) · retours à la ligne</p>
        </div>
      );
    case "mood":
      return <p className="text-xs text-text-muted">Affiche ton humeur du moment. Elle se change en un geste depuis le bandeau « Nous » du fil.</p>;
    case "clock":
      return <Input value={widget.label ?? ""} maxLength={40} placeholder="titre (optionnel)" onChange={(e) => onPatch({ label: e.target.value })} />;
    case "countdown":
      return (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input type="date" value={widget.date} onChange={(e) => onPatch({ date: e.target.value })} className={selectClass + " sm:w-44"} />
          <Input value={widget.label ?? ""} maxLength={40} placeholder="titre (ex. Vacances)" onChange={(e) => onPatch({ label: e.target.value })} />
        </div>
      );
    case "image":
      return (
        <div className="flex flex-col gap-2">
          {widget.assetId > 0 ? (
            <AssetImage assetId={widget.assetId} className="max-h-40 w-full rounded-token object-cover" />
          ) : (
            <p className="text-xs text-text-muted">Aucune image choisie.</p>
          )}
          <div className="flex items-center gap-2">
            <label className="chip cursor-pointer press hover:border-primary/50">
              <Icon name="camera" size={14} /> {widget.assetId > 0 ? "Changer" : "Ajouter une image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                }}
              />
            </label>
          </div>
          <Input value={widget.label ?? ""} maxLength={40} placeholder="légende (optionnel)" onChange={(e) => onPatch({ label: e.target.value })} />
        </div>
      );
    case "svg":
      return (
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={widget.variant} onChange={(e) => onPatch({ variant: e.target.value })} className={selectClass + " sm:w-44"}>
            {SVG_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((v) => <option key={v} value={v}>{SVG_LABELS[v] ?? v}</option>)}
              </optgroup>
            ))}
          </select>
          <Input value={widget.label ?? ""} maxLength={40} placeholder="légende (optionnel)" onChange={(e) => onPatch({ label: e.target.value })} />
        </div>
      );
    case "pins":
      return <PinsEditor label={widget.label} pins={widget.pins} onChange={(p) => onPatch(p)} />;
  }
}
