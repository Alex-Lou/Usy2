import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Input } from "../../components/ui/Input";
import { ThemeToggle } from "../../components/layout/ThemeToggle";
import { ApiError } from "../../lib/api/client";
import { useAuth } from "./useAuth";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
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
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Identifiant ou mot de passe incorrect."
          : "Connexion impossible. Réessaie plus tard.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full opacity-40 blur-3xl" style={{ background: "var(--grad)" }} />
      </div>

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

        <div className="mt-6 flex justify-center">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
