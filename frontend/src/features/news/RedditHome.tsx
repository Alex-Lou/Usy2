import { useEffect, useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { ApiError } from "../../lib/api/client";
import { getRedditHome, removeRedditHome, saveRedditHome } from "./api";

/**
 * My Reddit home feed, through its private RSS link: pasted once, kept sealed
 * on the server (only the account name comes back), no sign-in ever again.
 */
export function RedditHome() {
  const [user, setUser] = useState<string | null | undefined>(undefined);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRedditHome().then((r) => setUser(r.user ?? null)).catch(() => setUser(null));
  }, []);

  async function run(action: () => Promise<string | null>) {
    setBusy(true);
    setError(null);
    try {
      setUser(await action());
      setLink("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (link.trim()) void run(async () => (await saveRedditHome(link.trim())).user);
  };

  return (
    <section className="flex flex-col gap-2" aria-label="Mon fil Reddit">
      <h3 className="text-sm font-semibold">👽 Mon fil Reddit (accueil)</h3>
      {user === undefined ? null : user ? (
        <div className="flex items-center gap-2 rounded-token border border-border px-3 py-1.5 text-sm">
          <span className="min-w-0 flex-1 truncate">Branché : u/{user}</span>
          <button type="button" disabled={busy} onClick={() => void run(async () => (await removeRedditHome(), null))} className="text-xs text-text-muted press hover:text-danger">
            Retirer
          </button>
        </div>
      ) : (
        <form onSubmit={add} className="flex gap-2">
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://www.reddit.com/.rss?feed=…&user=…"
            aria-label="Lien RSS privé de ton fil Reddit"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-token border border-border bg-bg-2 px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={busy || !link.trim()} className="!px-3 !py-2 text-sm">Brancher</Button>
        </form>
      )}
      <p className="text-[11px] text-text-muted">
        Sur Reddit (connecté), ouvre reddit.com/prefs/feeds et copie le lien RSS de ton « fil d'accueil ». Colle-le ici une seule fois : il reste
        chiffré sur le serveur, ton téléphone et ton binôme ne le voient jamais. Si tu le réinitialises sur Reddit, recolle le nouveau.
      </p>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </section>
  );
}
