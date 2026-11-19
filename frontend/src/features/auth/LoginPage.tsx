import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Input } from "../../components/ui/Input";
import { ApiError } from "../../lib/api/client";
import { useAuth } from "./useAuth";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      // Only a path of this app (never another site).
      navigate(from && from.startsWith("/") && !from.startsWith("//") ? from : "/", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Identifiant ou mot de passe incorrect."
          : err instanceof ApiError && err.status === 429
            ? "Trop d'essais : réessaie dans quelques minutes."
            : "Connexion impossible. Réessaie plus tard.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-token btn-brand animate-pop">
            <Icon name="heart" size={30} />
          </span>
          <h1 className="font-display text-4xl font-bold text-grad">MemoCat</h1>
          <p className="text-text-muted">Notre petit coin, rien qu'à nous deux 💫</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 shadow-glow">
          <label className="mb-1.5 block text-sm font-medium text-text-muted" htmlFor="username">
            Identifiant
          </label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            className="mb-4"
          />

          <label className="mb-1.5 block text-sm font-medium text-text-muted" htmlFor="password">
            Mot de passe
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="mb-5"
          />

          {error && (
            <p role="alert" className="mb-4 rounded-token-sm border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Connexion…" : "Entrer"}
          </Button>
        </form>

      </div>
    </div>
  );
}
