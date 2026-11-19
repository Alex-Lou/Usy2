import { useEffect, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";
import { Loader } from "../../components/ui/states";
import { useAuth } from "../auth/useAuth";
import { getProfile } from "./api";
import { ProfileBody } from "./ProfileBody";
import { SpaceSwitcher } from "./SpaceSwitcher";
import type { Profile } from "./types";

/**
 * 👁 A profile, just to look at: its presentation and its wall of blocks in
 * its own look. On mine, « Modifier » opens the editor; our shared space is
 * "Notre profil" (see SpaceSwitcher).
 */
export function ProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [params] = useSearchParams();
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

  // Old links (notifications, bookmarks) to the "Nous" tab: it now has its own space.
  if (params.get("tab") === "nous") {
    const rest = new URLSearchParams(params);
    rest.delete("tab");
    const query = rest.toString();
    return <Navigate to={`/profile/nous${query ? `?${query}` : ""}`} replace />;
  }
  if (error) return <div className="p-8 text-danger">{error}</div>;
  if (!profile) return <Loader />;

  const own = user?.id === profile.userId;
  return (
    <div className="flex flex-col gap-4">
      {own && <SpaceSwitcher />}
      <ProfileBody
        profile={profile}
        theme={profile.theme}
        widgets={profile.widgets}
        handle={own ? `@${user?.username}` : "@profil"}
        own={own}
        backdrop="page"
        action={own && (
          <Link to="/profile/moi" className="flex items-center gap-1.5 rounded-full bg-surface-2 px-4 py-2 text-sm font-semibold press hover:text-primary">
            <Icon name="sliders" size={16} /> Modifier
          </Link>
        )}
      />
    </div>
  );
}
