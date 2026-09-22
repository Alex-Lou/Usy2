import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Loader } from "../../components/ui/states";
import { useAuth } from "../auth/useAuth";
import { getProfile } from "./api";
import { buildThemeStyle } from "./theme";
import type { Profile } from "./types";
import { WidgetRenderer } from "./widgets/WidgetRenderer";

export function ProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
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
  const widgets = profile.widgets.map((w, i) => <WidgetRenderer key={i} widget={w} />);

  return (
    <div className="flex flex-col gap-4">
      {isOwn && (
        <div className="flex justify-end animate-fade-up">
          <Link to="/profile/edit">
            <Button variant="surface">
              <Icon name="sliders" size={16} />
              Personnaliser
            </Button>
          </Link>
        </div>
      )}

      {/* Themed panel: the profile's own colors/font scoped to this container. */}
      <div style={buildThemeStyle(profile.theme)} className="card overflow-hidden bg-bg p-6 font-sans text-text animate-fade-up">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={profile.displayName} size={64} />
          <div>
            <h1 className="font-display text-3xl font-bold text-primary">{profile.displayName}</h1>
            <p className="text-text-muted">@{isOwn ? user?.username : "profil"}</p>
          </div>
        </div>

        {profile.theme.layout === "sidebar-left" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[220px_1fr]">
            <aside className="flex flex-col gap-4">{widgets}</aside>
            <main className="rounded-token border border-border bg-surface p-6 text-text-muted">
              Le fil de {profile.displayName} vit dans l'Accueil 💌
            </main>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {widgets.length > 0 ? widgets : <p className="text-text-muted">Aucun widget pour l'instant.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
