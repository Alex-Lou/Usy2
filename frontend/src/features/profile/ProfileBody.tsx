import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { SPECIES, type Species } from "../../app/companion";
import { AssetImage } from "../../components/AssetImage";
import { ImageViewer } from "../../components/photo/ImageViewer";
import { ZoomableImage } from "../../components/photo/ZoomableImage";
import { Animal } from "../../components/ui/animals";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { useFonts } from "../../lib/fonts";
import { filled } from "../../lib/framing";
import { fillOf, pageVars, partFonts, partsOf, skin, widgetStyle } from "./partStyle";
import { ProfileGrid } from "./ProfileGrid";
import { WidgetRenderer } from "./widgets/WidgetRenderer";
import { fontsApply, fontVars } from "./theme";
import type { PartStyle, Profile, Theme, Widget } from "./types";

/**
 * A profile as everyone sees it — the presentation card and the frames, in
 * the profile's own look. `backdrop`: "page" paints the page background behind
 * the whole screen (the profile view); "inline" paints it inside this block
 * (the preview in "Mon profil").
 */
export function ProfileBody({
  profile,
  theme,
  widgets,
  handle,
  own,
  backdrop,
}: {
  profile: Profile;
  theme: Theme;
  widgets: Widget[];
  /** Shown under the name (e.g. "@lou"). */
  handle: string;
  own: boolean;
  backdrop: "page" | "inline";
}) {
  const parts = partsOf(theme);
  const page = parts.page ?? {};
  const fontsOn = fontsApply(theme);
  useFonts(fontsOn ? theme.font : null, fontsOn ? theme.headingFont : null, ...partFonts(parts, widgets));

  const companion: Species =
    profile.companion && (SPECIES as readonly string[]).includes(profile.companion) ? (profile.companion as Species) : "cat";
  const [isAvatarZoomed, setIsAvatarZoomed] = useState(false);
  const headerBox = skin(parts.header ?? {}, { box: true, scope: true });
  const headerText = skin(parts.header ?? {}, { text: true });

  // Separate pinned widgets for featured display
  const pinnedWidgets = widgets.filter(w => w.type === "pins");
  const otherWidgets = widgets.filter(w => w.type !== "pins");

  return (
    <div style={{ ...fontVars(theme), ...pageVars(page) }} className={"relative flex flex-col gap-6 font-sans text-text " + (backdrop === "inline" ? "isolate overflow-hidden rounded-token p-4" : "")}>
      {backdrop === "page" ? <PageBackdrop look={page} /> : <InlineBackdrop look={page} />}

      <div className={headerBox.className} style={headerBox.style}>
        <div className="card overflow-hidden bg-bg animate-fade-up">
          <div className="relative h-56 overflow-hidden sm:h-72" style={{ backgroundImage: "var(--grad)" }}>
            {profile.coverAssetId && (
              <ZoomableImage
                assetId={profile.coverAssetId}
                framing={filled(profile.coverFraming)}
                className="absolute inset-0 overflow-hidden"
                imgClassName="h-full w-full object-cover"
              />
            )}
          </div>
          <div className="px-6 pb-6">
            <div
              className="-mt-12 mb-3 inline-block rounded-full ring-4 ring-bg cursor-pointer"
              onClick={() => profile.avatarAssetId != null && setIsAvatarZoomed(true)}
            >
              <Avatar name={profile.displayName} size={96} assetId={profile.avatarAssetId} framing={profile.avatarFraming} species={profile.companion} />
            </div>
            <div className={headerText.className} style={headerText.style}>
              <div>
                <h1 className="font-display text-3xl font-bold text-primary">{profile.displayName}</h1>
                <p className="text-text-muted">{handle}</p>
                {profile.bio && <p className="mt-2 max-w-prose text-text">{profile.bio}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured pinned widgets */}
      {pinnedWidgets.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-4 text-xl font-bold text-primary">Épinglés</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pinnedWidgets.map((widget, index) => {
              const dressed = skin(widgetStyle(parts, widget));
              return (
                <div key={`pinned-${index}`} className={dressed.className} style={dressed.style}>
                  <WidgetRenderer widget={widget} ownerId={profile.userId} />
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 animate-fade-up">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
          {own ? "Mon petit monde" : `Le monde de ${profile.displayName}`}
        </h2>
        {otherWidgets.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 p-8 text-center">
            <Animal species={companion} size={64} />
            <p className="text-text-muted">{own ? "Ton espace est encore vide." : "Rien ici pour l'instant."}</p>
            {own && backdrop === "page" && (
              <Link to="/profile/moi">
                <Button>
                  <Icon name="sparkles" size={16} /> Ajouter des widgets
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <ProfileGrid
            widgets={otherWidgets}
            ownerId={profile.userId}
            gap={theme.widgetGap}
            styleOf={(i) => widgetStyle(parts, otherWidgets[i])}
          />
        )}
      </section>

      {isAvatarZoomed && profile.avatarAssetId != null && (
        <ImageViewer
          asset={{ id: profile.avatarAssetId, originalFilename: `memocat-${profile.avatarAssetId}.jpg` }}
          badge={<Animal species={companion} size={64} />}
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