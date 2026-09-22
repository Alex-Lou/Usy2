import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
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
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        if (!cancelled) setError("Profil introuvable.");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return <div className="p-8 text-danger">{error}</div>;
  }
  if (!profile) {
    return <div className="p-8 text-text-muted">Chargement…</div>;
  }

  const isOwn = user?.id === profile.userId;
  const widgets = profile.widgets.map((w, i) => <WidgetRenderer key={i} widget={w} />);

  return (
    // Scoped theme: overriding the tokens here themes only this subtree.
    <div style={buildThemeStyle(profile.theme)} className="min-h-screen bg-bg font-sans text-text">
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-sm text-text-muted hover:underline">
            ← Accueil
          </Link>
          {isOwn && (
            <Link to="/profile/edit">
              <Button>Personnaliser</Button>
            </Link>
          )}
        </div>

        <h1 className="mb-6 text-3xl font-bold text-primary">{profile.displayName}</h1>

        {profile.theme.layout === "sidebar-left" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[220px_1fr]">
            <aside className="flex flex-col gap-4">{widgets}</aside>
            <main className="rounded-token border border-border bg-surface p-6 text-text-muted">
              Le fil de {profile.displayName} arrivera bientôt. 💌
            </main>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {widgets.length > 0 ? (
              widgets
            ) : (
              <p className="text-text-muted">Aucun widget pour l'instant.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
