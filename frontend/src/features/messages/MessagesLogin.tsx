import { useState, type FormEvent } from "react";
import { Icon } from "../../components/ui/Icon";
import { ApiError } from "../../lib/api/client";
import { useAuth } from "../auth/useAuth";

/**
 * Signing in to Messages, in its own look: the MemoCat account, once. Signed
 * in, the conversation comes straight away (and MemoCat is signed in too).
 */
export function MessagesLogin() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Identifiant ou mot de passe incorrect."
          : err instanceof ApiError && err.status === 429
            ? "Trop d'essais : réessaie dans quelques minutes."
            : "Connexion impossible. Réessaie plus tard.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="msg-app overflow-y-auto">
      <form onSubmit={submit} className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-3.5 px-6 py-10">
        <span className="msg-cta grid h-16 w-16 place-items-center rounded-[18px]" aria-hidden="true">
          <Icon name="chat" size={30} />
        </span>
        <h1 className="mt-1.5 text-[26px] font-bold tracking-tight">Messages</h1>
        <p className="text-text-muted">Votre conversation, à part. Ton compte MemoCat suffit.</p>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nom d'utilisateur"
          aria-label="Nom d'utilisateur"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          className="msg-field h-12 rounded-xl px-3.5 text-[15px] outline-none placeholder:text-text-muted focus:border-primary"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe"
          aria-label="Mot de passe"
          autoComplete="current-password"
          required
          className="msg-field h-12 rounded-xl px-3.5 text-[15px] outline-none placeholder:text-text-muted focus:border-primary"
        />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={busy} className="msg-cta mt-1 h-[50px] rounded-[14px] text-[15.5px] font-bold press disabled:opacity-60">
          {busy ? "Connexion…" : "Se connecter"}
        </button>
        <p className="text-center text-[12.5px] text-text-muted">À faire une seule fois : l'app reste connectée.</p>
      </form>
    </div>
  );
}
