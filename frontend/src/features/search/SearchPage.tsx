import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AssetImage } from "../../components/AssetImage";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { search, type SearchHit, type SearchKind } from "./api";

const GROUPS: { kind: SearchKind; label: string }[] = [
  { kind: "message", label: "💬 Messages" },
  { kind: "post", label: "📝 Posts" },
  { kind: "comment", label: "💭 Commentaires" },
  { kind: "photo", label: "🖼️ Photos" },
  { kind: "album", label: "📚 Albums" },
  { kind: "note", label: "💌 Mots" },
];

/** The word found, highlighted, with a bit of text around it (a date search: the whole text). */
function Excerpt({ text, q }: { text: string; q: string }) {
  const at = text.toLowerCase().indexOf(q.toLowerCase());
  if (!q || at < 0) return <>{text}</>;
  const start = Math.max(0, at - 40);
  return (
    <>
      {start > 0 && "…"}
      {text.slice(start, at)}
      <mark className="rounded bg-primary/25 px-0.5 text-text">{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}

function when(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/** « Recherche partout »: a word or a date, results grouped by kind; the search stays in the URL. */
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") ?? "";
  const [text, setText] = useState(initial);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const latest = useRef(0); // ignores the answer to an older search

  const q = text.trim();
  useEffect(() => {
    const t = window.setTimeout(() => {
      setParams(q ? { q } : {}, { replace: true });
      if (q.length < 2) {
        setHits(null);
        return;
      }
      const id = ++latest.current;
      setLoading(true);
      setError(false);
      search(q)
        .then((found) => id === latest.current && setHits(found))
        .catch(() => id === latest.current && setError(true))
        .finally(() => id === latest.current && setLoading(false));
    }, 300);
    return () => window.clearTimeout(t);
  }, [q, setParams]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Recherche" />
      <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 shadow-card focus-within:border-primary/70">
        <Icon name="search" size={18} className="shrink-0 text-text-muted" />
        <input
          autoFocus
          type="text"
          inputMode="search"
          enterKeyHint="search"
          role="searchbox"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Un mot, ou une date : 12/03/2025, mars 2025…"
          aria-label="Rechercher"
          maxLength={200}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-text-muted"
        />
        {text && (
          <button type="button" onClick={() => setText("")} aria-label="Effacer" className="text-text-muted press hover:text-text">
            <Icon name="x" size={16} />
          </button>
        )}
      </label>

      {error ? (
        <p className="text-center text-sm text-danger">La recherche n'a pas abouti. Réessaie dans un instant.</p>
      ) : q.length < 2 ? (
        <p className="text-center text-sm text-text-muted">Messages, posts, commentaires, légendes, albums et mots doux.</p>
      ) : hits === null || (loading && hits.length === 0) ? (
        <p className="text-center text-sm text-text-muted">Recherche…</p>
      ) : hits.length === 0 ? (
        <p className="text-center text-sm text-text-muted">Rien trouvé pour « {q} ».</p>
      ) : (
        GROUPS.map(({ kind, label }) => {
          const group = hits.filter((h) => h.kind === kind);
          if (group.length === 0) return null;
          return (
            <section key={kind} className="flex flex-col gap-2 animate-fade-up">
              <h2 className="text-sm font-semibold text-text-muted">
                {label} <span className="font-normal">· {group.length === 20 ? "20+" : group.length}</span>
              </h2>
              <ul className="card divide-y divide-border overflow-hidden p-0">
                {group.map((h) => (
                  <li key={h.id}>
                    <Link to={h.link} className="flex items-center gap-3 px-3 py-2.5 press hover:bg-surface-2/60">
                      {h.assetId != null && (
                        <span className="h-12 w-12 shrink-0 overflow-hidden rounded-token-sm bg-surface-2">
                          <AssetImage assetId={h.assetId} className="h-full w-full object-cover" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 break-words text-sm">
                          {h.text ? <Excerpt text={h.text} q={q} /> : <span className="text-text-muted">{kind === "photo" ? "Photo" : "Pièce jointe"}</span>}
                        </span>
                        <span className="mt-0.5 block text-xs text-text-muted">
                          {h.authorName} · {when(h.createdAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
