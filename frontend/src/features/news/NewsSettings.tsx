import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { ApiError } from "../../lib/api/client";
import { saveNewsPrefs, type Follow, type FollowKind, type NewsPrefs, type NewsSource } from "./api";

const KINDS: { id: FollowKind; label: string; icon: string; placeholder: string; hint: string }[] = [
  { id: "rss", label: "Site", icon: "📰", placeholder: "monsite.fr ou son flux RSS", hint: "L'adresse d'un site (son flux est trouvé tout seul) ou directement son flux RSS/Atom." },
  { id: "bluesky", label: "Bluesky", icon: "🦋", placeholder: "korben.info", hint: "Le pseudo du compte (ex. korben.info)." },
  { id: "mastodon", label: "Mastodon", icon: "🐘", placeholder: "Gargron@mastodon.social", hint: "pseudo@serveur" },
  { id: "reddit", label: "Reddit", icon: "👽", placeholder: "pcgaming", hint: "Le nom du subreddit, sans r/." },
  { id: "xpost", label: "Post X", icon: "𝕏", placeholder: "https://x.com/…/status/…", hint: "Colle le lien d'un post X : il s'affiche via FxTwitter, sans compte." },
];

/**
 * My "Actus" choices: news sites switched on one by one, and the public
 * accounts I follow. Saved at each change (only for me); nothing is on at first.
 */
export function NewsSettings({ sources, prefs, onSaved, onClose }: { sources: NewsSource[]; prefs: NewsPrefs; onSaved: (p: NewsPrefs) => void; onClose?: () => void }) {
  const [kind, setKind] = useState<FollowKind>("rss");
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(next: NewsPrefs): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      onSaved(await saveNewsPrefs(next));
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const toggle = (id: string) =>
    void save({ ...prefs, sources: prefs.sources.includes(id) ? prefs.sources.filter((s) => s !== id) : [...prefs.sources, id] });

  async function add(e: FormEvent) {
    e.preventDefault();
    const value = handle.trim();
    if (!value) return;
    if (await save({ ...prefs, follows: [...prefs.follows, { kind, handle: value }] })) setHandle("");
  }

  const remove = (f: Follow) => void save({ ...prefs, follows: prefs.follows.filter((x) => x !== f) });
  const current = KINDS.find((k) => k.id === kind)!;

  return (
    <div className="card flex flex-col gap-4 p-4 animate-pop" data-news-settings="">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Mes sources</h2>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-full text-text-muted press hover:text-text">
            <Icon name="x" size={18} />
          </button>
        )}
      </div>
      <p className="-mt-2 text-xs text-text-muted">Seulement pour toi. Rien n'est activé tant que tu ne le choisis pas ; aucun compte, aucune inscription.</p>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">📰 Sites</h3>
        <div className="flex flex-wrap gap-1.5">
          {sources.map((s) => {
            const on = prefs.sources.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                disabled={busy}
                aria-pressed={on}
                className={"chip press text-sm " + (on ? "border-primary bg-surface-2 font-semibold text-primary" : "text-text-muted hover:border-primary/50")}
              >
                {on ? "✓ " : ""}
                {s.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">➕ Mes ajouts : sites, comptes publics</h3>
        {prefs.follows.length > 0 && (
          <ul className="flex flex-col gap-1">
            {prefs.follows.map((f) => (
              <li key={`${f.kind}:${f.handle}`} className="flex items-center gap-2 rounded-token border border-border px-3 py-1.5 text-sm">
                <span aria-hidden="true">{KINDS.find((k) => k.id === f.kind)?.icon}</span>
                <span className="min-w-0 flex-1 truncate">{f.kind === "rss" ? f.handle.replace(/^https?:\/\/(www\.)?/, "") : f.handle}</span>
                <button type="button" onClick={() => remove(f)} disabled={busy} aria-label={`Retirer ${f.handle}`} className="text-text-muted press hover:text-danger">
                  <Icon name="x" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Type de compte">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              aria-pressed={kind === k.id}
              className={"chip press text-xs " + (kind === k.id ? "border-primary bg-surface-2 font-semibold text-primary" : "text-text-muted")}
            >
              {k.icon} {k.label}
            </button>
          ))}
        </div>
        <form onSubmit={add} className="flex gap-2">
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder={current.placeholder}
            aria-label={`Ajouter ${current.label}`}
            maxLength={300}
            className="min-w-0 flex-1 rounded-token border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <Button type="submit" disabled={busy || !handle.trim()} className="!px-4 !py-2 text-sm">
            Ajouter
          </Button>
        </form>
        <p className="text-[11px] text-text-muted">{current.hint}</p>
      </section>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
