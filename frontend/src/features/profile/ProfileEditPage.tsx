import { useEffect, useState } from "react";
import { SharedAppearancePanel } from "../couple/SharedAppearancePanel";
import { GlassSetting } from "./GlassSetting";
import { Link, useNavigate } from "react-router-dom";
import { AssetImage } from "../../components/AssetImage";
import { FramingEditor } from "../../components/photo/FramingEditor";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { ApiError } from "../../lib/api/client";
import type { Framing } from "../../lib/framing";
import { useAuth } from "../auth/useAuth";
import { uploadImage } from "../../lib/api/assets";
import { getMyProfile, updateMyProfile } from "./api";
import { useFonts } from "../../lib/fonts";
import { emitMyThemeSaved } from "./AppFonts";
import { fillOf, partFonts, partsOf, pageVars, skin, widgetStyle } from "./partStyle";
import { fontVars, withFontChoice } from "./theme";
import type { Theme, Widget } from "./types";
import { WidgetRenderer } from "./widgets/WidgetRenderer";
import { cleanWidget, missingImage, WidgetListEditor } from "./widgets/WidgetEditor";

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
  useFonts(theme?.font, theme?.headingFont, ...(theme ? partFonts(partsOf(theme), widgets) : [])); // the preview shows the chosen fonts

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

  async function handleSave() {
    if (!theme) return;
    if (missingImage(widgets)) {
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
  const parts = partsOf(theme);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-bold animate-fade-up">Contenu de mon profil</h1>
        <p className="-mt-2 text-sm text-text-muted">
          Couleurs, fond, polices et style de chaque cadre : bouton <strong>« Personnaliser »</strong> directement sur ton profil.
        </p>

        <SharedAppearancePanel />
        <GlassSetting />

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
          <h2 className="mb-1 font-semibold">Widgets</h2>
          <p className="mb-3 text-xs text-text-muted">
            Ceux de ton profil sont à toi. « Aussi dans la barre latérale » l'y montre à vous deux, tant qu'il est sur ton profil : le couper ou supprimer le widget l'en retire pour vous deux.
          </p>
          <Link to="/widgets" className="chip press mb-3 inline-flex items-center gap-1 text-sm hover:border-primary/50">
            <Icon name="sliders" size={14} /> Gérer toute ma barre latérale
          </Link>
          <WidgetListEditor
            widgets={widgets}
            onChange={setWidgets}
            onError={setError}
            footer={(w, i) => (
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!w.sidebar}
                  onChange={(e) => setWidgets((list) => list.map((x, j) => (j === i ? { ...x, sidebar: e.target.checked || undefined } : x)))}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                Aussi dans la barre latérale <span className="text-xs text-text-muted">(visible par vous deux)</span>
              </label>
            )}
          />
        </section>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          <Button variant="surface" onClick={() => navigate(-1)}>Annuler</Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-8 lg:self-start">
        <p className="mb-2 text-sm text-text-muted">Aperçu</p>
        <div style={{ ...fontVars(theme), ...pageVars(parts.page ?? {}), background: fillOf(parts.page ?? {}) ?? undefined }} className="card bg-bg p-4 font-sans text-text">
          <div className="flex flex-col gap-3">
            {widgets.length === 0 ? (
              <p className="text-text-muted">L'aperçu apparaîtra ici.</p>
            ) : (
              widgets.map((w, i) => {
                const look = skin(widgetStyle(parts, w));
                return (
                  <div key={i} className={look.className} style={look.style}>
                    <WidgetRenderer widget={w} ownerId={user?.id} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
