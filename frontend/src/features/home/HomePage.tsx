import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../auth/useAuth";

// Home hub for Tranche 2: links to the profile view/edit.
export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="rounded-token border border-border bg-surface p-6">
        <h1 className="mb-2 text-2xl font-bold text-primary">
          Bienvenue, {user?.displayName} 💕
        </h1>
        <p className="mb-6 text-text-muted">Ton petit coin à deux.</p>

        <div className="flex flex-wrap gap-3">
          {user && (
            <>
              <Link to={`/profile/${user.id}`}>
                <Button>Mon profil</Button>
              </Link>
              <Link to="/profile/edit">
                <Button>Personnaliser</Button>
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={logout}
            className="rounded-token border border-border px-4 py-2 hover:bg-bg"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
