import { useEffect, useState } from "react";
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
import { getProfile } from "./api";
import { buildThemeStyle } from "./theme";
import type { Profile } from "./types";
import { WidgetRenderer } from "./widgets/WidgetRenderer";

export function ProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "nous" ? "nous" : "profil";
  const id = Number(userId);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setError(null);
    getProfile(id)
      .then((p) => !cancelled && setProfile(p))
      .catch(() => !cancelled && setError("Profil introuvable."));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <div className="p-8 text-danger">{error}</div>;
  if (!profile) return <Loader />;

  const isOwn = user?.id === profile.userId;
  // "custom" applies the profile's saved colors; otherwise the panel follows the app theme.
  const custom = profile.theme.mode === "custom";
  const companion: Species =
    profile.companion && (SPECIES as readonly string[]).includes(profile.companion)
      ? (profile.companion as Species)
      : "cat";

  return (
    <div style={custom ? buildThemeStyle(profile.theme) : undefined} className="flex flex-col gap-6 font-sans">
      {/* Hero: cover band + overlapping avatar, with room to breathe. */}
      <div className="card overflow-hidden bg-bg animate-fade-up">
        <div className="relative h-28 overflow-hidden sm:h-36" style={{ backgroundImage: "var(--grad)" }}>
          {profile.coverAssetId && <AssetImage assetId={profile.coverAssetId} className="absolute inset-0 h-full w-full object-cover" />}
          {isOwn && (
            <Link to="/profile/edit" className="absolute right-3 top-3">
              <Button variant="surface" className="!px-3 !py-1.5 text-sm">
                <Icon name="sliders" size={15} /> Personnaliser
              </Button>
            </Link>
          )}
        </div>

        <div className="px-6 pb-6">
          <div className="-mt-12 mb-3 rounded-full ring-4 ring-bg inline-block">
            <Avatar name={profile.displayName} size={96} assetId={profile.avatarAssetId} species={profile.companion} />
          </div>
          <h1 className="font-display text-3xl font-bold text-primary">{profile.displayName}</h1>
          <p className="text-text-muted">@{isOwn ? user?.username : "profil"}</p>
          {profile.bio && <p className="mt-2 max-w-prose text-text">{profile.bio}</p>}
        </div>
      </div>

      {/* Profile / shared "Nous" space (same content on both profiles). */}
      <div role="tablist" className="flex gap-2">
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

      {tab === "nous" ? (
        <NousPanel myId={user?.id} />
      ) : (
      /* Widgets — a spacious grid, marquee spans full width. */
      <section className="flex flex-col gap-3 animate-fade-up">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
          {isOwn ? "Mon petit monde" : `Le monde de ${profile.displayName}`}
        </h2>

        {profile.widgets.length === 0 ? (
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {profile.widgets.map((w, i) => (
              <div key={i} className={w.type === "marquee" ? "sm:col-span-2" : ""}>
                <WidgetRenderer widget={w} ownerId={profile.userId} />
              </div>
            ))}
          </div>
        )}
      </section>
      )}
    </div>
  );
}
