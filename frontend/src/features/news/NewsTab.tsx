import { useCallback, useEffect, useMemo, useState } from "react";
import { Skeleton } from "../../components/ui/Skeleton";
import { getNews, getNewsPrefs, getNewsSources, type NewsItem, type NewsPrefs, type NewsSource } from "./api";
import { KIND_ICON, NewsCard } from "./NewsCard";
import { NewsSettings } from "./NewsSettings";

/**
 * 📰 "Actus": articles and posts from the sources I chose, newest first,
 * with a filter per source. Only mine: the other person has their own.
 */
export function NewsTab() {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [prefs, setPrefs] = useState<NewsPrefs | null>(null);
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [only, setOnly] = useState<string | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    setItems(null);
    getNews()
      .then(setItems)
      .catch(() => {
        setItems([]);
        setFailed(true);
      });
  }, []);

  useEffect(() => {
    getNewsSources().then(setSources).catch(() => {});
    getNewsPrefs()
      .then((p) => {
        setPrefs(p);
        if (p.sources.length + p.follows.length === 0) setEditing(true);
      })
      .catch(() => setPrefs({ sources: [], follows: [] }));
    load();
  }, [load]);

  const chips = useMemo(() => {
    const seen = new Map<string, NewsItem>();
    for (const i of items ?? []) if (!seen.has(i.source)) seen.set(i.source, i);
    return [...seen.values()];
  }, [items]);
  const shown = (items ?? []).filter((i) => !only || i.source === only);
  const chosen = prefs ? prefs.sources.length + prefs.follows.length : 0;

  return (
    <div className="flex flex-col gap-3" data-news-tab="">
      <div className="flex items-center gap-2">
        <p className="text-sm text-text-muted">{chosen ? `${chosen} source${chosen > 1 ? "s" : ""} choisie${chosen > 1 ? "s" : ""}` : "Aucune source pour l'instant"}</p>
        <button type="button" onClick={load} aria-label="Actualiser" className="chip press ml-auto text-sm text-text-muted hover:border-primary/50">
          ↻
        </button>
        <button type="button" onClick={() => setEditing((e) => !e)} aria-expanded={editing} className="chip press text-sm hover:border-primary/50">
          ⚙️ Mes sources
        </button>
      </div>

      {editing && prefs && (
        <NewsSettings
          sources={sources}
          prefs={prefs}
          onSaved={(p) => {
            setPrefs(p);
            load();
          }}
          onClose={() => setEditing(false)}
        />
      )}

      {chips.length > 1 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 no-scrollbar" role="group" aria-label="Filtrer par source">
          <button type="button" onClick={() => setOnly(null)} aria-pressed={only === null} className={"chip press shrink-0 text-xs " + (only === null ? "border-primary bg-surface-2 font-semibold text-primary" : "text-text-muted")}>
            Tout
          </button>
          {chips.map((c) => (
            <button
              key={c.source}
              type="button"
              onClick={() => setOnly(only === c.source ? null : c.source)}
              aria-pressed={only === c.source}
              className={"chip press shrink-0 text-xs " + (only === c.source ? "border-primary bg-surface-2 font-semibold text-primary" : "text-text-muted")}
            >
              {KIND_ICON[c.kind]} {c.sourceLabel}
            </button>
          ))}
        </div>
      )}

      {items === null ? (
        [0, 1, 2].map((i) => (
          <div key={i} className="card p-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </div>
        ))
      ) : shown.length === 0 ? (
        <div className="card p-6 text-center text-sm text-text-muted">
          {failed
            ? "Les actus ne répondent pas pour le moment. Réessaie dans un instant."
            : chosen
              ? "Rien de neuf pour le moment (ou les sources choisies ne répondent pas)."
              : "Choisis tes sites et comptes dans « Mes sources » : ils apparaîtront ici, rien que pour toi."}
        </div>
      ) : (
        shown.map((item) => <NewsCard key={`${item.source}-${item.url}`} item={item} />)
      )}
    </div>
  );
}
