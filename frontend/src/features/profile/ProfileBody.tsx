import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AssetImage } from "../../components/AssetImage";
import { ImageViewer } from "../../components/photo/ImageViewer";
import { ZoomableImage } from "../../components/photo/ZoomableImage";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { useFonts } from "../../lib/fonts";
import { filled } from "../../lib/framing";
import { fillOf, pageVars, partFonts, partsOf, skin, widgetStyle } from "./partStyle";
import { ProfileGrid, type GridEditing } from "./ProfileGrid";
import { fontsApply, fontVars } from "./theme";
import type { PartStyle, Profile, Theme, Widget } from "./types";

/** Editing in place ("Mon profil"): the photos and the bio are touchable, the wall can be arranged. */
export interface ProfileEditing {
  grid: GridEditing;
  bio: string;
  onBio: (bio: string) => void;
  onPhoto: (which: "cover" | "avatar") => void;
}

/**
 * A profile as everyone sees it — the presentation card and the wall of
 * blocks, in the profile's own look. `backdrop`: "page" paints the page
 * background behind the whole screen (the profile view); "inline" paints it
 * inside this block (the editor). With `editing`, the same profile is edited
 * in place: what you arrange is what is shown.
 */
export function ProfileBody({
  profile,
  theme,
  widgets,
  handle,
  own,
  backdrop,
  editing,
  action,
}: {
  profile: Profile;
  theme: Theme;
  widgets: Widget[];
  /** Shown under the name (e.g. "@lou"). */
  handle: string;
  own: boolean;
  backdrop: "page" | "inline";
  editing?: ProfileEditing;
  /** Next to the name (e.g. « Modifier » on my own profile). */
  action?: ReactNode;
}) {
  const parts = partsOf(theme);
  const page = parts.page ?? {};
  const fontsOn = fontsApply(theme);
  useFonts(fontsOn ? theme.font : null, fontsOn ? theme.headingFont : null, ...partFonts(parts, widgets));

  const [isAvatarZoomed, setIsAvatarZoomed] = useState(false);
  const headerBox = skin(parts.header ?? {}, { box: true, scope: true });
  const headerText = skin(parts.header ?? {}, { text: true });

  return (
    <div style={{ ...fontVars(theme), ...pageVars(page) }} className={"relative flex flex-col gap-6 font-sans text-text " + (backdrop === "inline" ? "isolate overflow-hidden rounded-token p-4" : "")}>
      {backdrop === "page" ? <PageBackdrop look={page} /> : <InlineBackdrop look={page} />}

      <div className={headerBox.className} style={headerBox.style}>
        <div className="card overflow-hidden bg-bg animate-fade-up">
          <div className="relative h-56 overflow-hidden bg-surface-2 sm:h-72">
            {profile.coverAssetId && (
              <ZoomableImage
                assetId={profile.coverAssetId}
                framing={filled(profile.coverFraming)}
                className="absolute inset-0 overflow-hidden"
                imgClassName="h-full w-full object-cover"
              />
            )}
            {editing && (
              <button type="button" onClick={() => editing.onPhoto("cover")} className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-bg/80 px-3 py-1.5 text-sm font-semibold text-text shadow-card backdrop-blur press">
                <Icon name="camera" size={16} /> Couverture
              </button>
            )}
          </div>
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between gap-3">
              {editing ? (
                <button type="button" onClick={() => editing.onPhoto("avatar")} className="relative -mt-12 mb-3 rounded-full ring-4 ring-bg press" aria-label="Changer ma photo">
                  <Avatar name={profile.displayName} size={96} assetId={profile.avatarAssetId} framing={profile.avatarFraming} />
                  <span className="absolute bottom-0.5 right-0.5 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground shadow-card">
                    <Icon name="camera" size={16} />
                  </span>
                </button>
              ) : (
                <div
                  className="-mt-12 mb-3 inline-block cursor-pointer rounded-full ring-4 ring-bg"
                  onClick={() => profile.avatarAssetId != null && setIsAvatarZoomed(true)}
                >
                  <Avatar name={profile.displayName} size={96} assetId={profile.avatarAssetId} framing={profile.avatarFraming} />
                </div>
              )}
              {action && <div className="mb-3">{action}</div>}
            </div>
            <div className={headerText.className} style={headerText.style}>
              <div>
                <h1 className="font-display text-3xl font-bold text-text">{profile.displayName}</h1>
                <p className="text-text-muted">{handle}</p>
                {editing ? (
                  <textarea
                    value={editing.bio}
                    maxLength={200}
                    rows={2}
                    placeholder="Un mot sur toi…"
                    aria-label="Bio"
                    onChange={(e) => editing.onBio(e.target.value)}
                    className="mt-2 w-full max-w-prose resize-none rounded-token border border-dashed border-border bg-transparent px-3 py-2 text-text outline-none placeholder:text-text-muted focus:border-primary"
                  />
                ) : (
                  profile.bio && <p className="mt-2 max-w-prose text-text">{profile.bio}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-3 animate-fade-up">
        {widgets.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-text-muted">
              {editing ? "Ton mur est vide : ajoute un premier bloc avec « Ajouter »." : own ? "Ton mur est encore vide." : "Rien ici pour l'instant."}
            </p>
            {own && !editing && backdrop === "page" && (
              <Link to="/profile/moi">
                <Button>
                  <Icon name="plus" size={16} /> Ajouter des blocs
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <ProfileGrid
            widgets={widgets}
            ownerId={profile.userId}
            gap={theme.widgetGap}
            editing={editing?.grid}
            styleOf={(i) => widgetStyle(parts, widgets[i])}
          />
        )}
      </section>

      {isAvatarZoomed && profile.avatarAssetId != null && (
        <ImageViewer
          asset={{ id: profile.avatarAssetId, originalFilename: `memocat-${profile.avatarAssetId}.jpg` }}
          onClose={() => setIsAvatarZoomed(false)}
        />
      )}
    </div>
  );
}

/** The page's own background, over the app's shared one, for as long as the profile is shown. */
export function PageBackdrop({ look }: { look: PartStyle }) {
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
      <Backdrop look={look} />
    </div>,
    document.body,
  );
}

/** The same background, inside a preview box. */
export function InlineBackdrop({ look }: { look: PartStyle }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <Backdrop look={look} fallback={<div className="absolute inset-0 bg-bg" />} />
    </div>
  );
}

function Backdrop({ look, fallback = null }: { look: PartStyle; fallback?: ReactNode }) {
  const fill = fillOf(look);
  if (look.photoAssetId) {
    return (
      <>
        <AssetImage assetId={look.photoAssetId} className="h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: look.bg ?? "var(--profile-veil)", opacity: (look.veil ?? 0) / 100 }} />
      </>
    );
  }
  return fill ? <div className="absolute inset-0" style={{ background: fill }} /> : <>{fallback}</>;
}