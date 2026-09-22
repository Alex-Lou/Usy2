import { Button } from "../../components/ui/Button";
import { useAuth } from "../auth/useAuth";

// Placeholder home for Tranche 1: confirms auth works end to end.
export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="rounded-token border border-border bg-surface p-6">
        <h1 className="mb-2 text-2xl font-bold text-primary">
          Bienvenue, {user?.displayName} 💕
        </h1>
        <p className="mb-6 text-text-muted">
          Tu es connecté·e à MemoCat. Le reste arrive bientôt.
        </p>
        <Button onClick={logout}>Se déconnecter</Button>
      </div>
    </div>
  );
}
