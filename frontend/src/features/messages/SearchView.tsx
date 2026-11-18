import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../../components/ui/Icon";
import { search, type SearchHit } from "../search/api";

const MIN_LENGTH = 2;

function day(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", ...(d.getFullYear() !== new Date().getFullYear() && { year: "numeric" }) });
}

/** The words found, marked (case and accents as typed). */
function marked(text: string, q: string): ReactNode {
  const at = text.toLowerCase().indexOf(q.toLowerCase());
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="msg-hl">{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}

/**
 * Search in the conversation: a word (or a date, as MemoCat's search
 * understands it), the latest matching messages; a tap goes to that message.
 */
export function SearchView({ myName, onBack, onOpen }: { myName: string; onBack: () => void; onOpen: (messageId: number) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  useEffect(() => {
    const value = q.trim();
    if (value.length < MIN_LENGTH) {
      setHits(null);
      return;
    }
    let stale = false;
    const t = window.setTimeout(() => {
      search(value)
        .then((all) => {
          if (stale) return;
          setHits(all.filter((h) => h.kind === "message" && h.text));
          setFailed(false);
        })
        .catch(() => !stale && setFailed(true));
    }, 250);
    return () => {
      stale = true;
      window.clearTimeout(t);
    };
  }, [q]);

  const value = q.trim();
  return (
    <>
      <header className="msg-bar flex shrink-0 items-center gap-2 px-2 py-2">
        <button type="button" onClick={onBack} aria-label="Retour" className="grid h-10 w-10 place-items-center rounded-full press">
          <Icon name="chevronLeft" size={22} />
        </button>
        <label className="msg-field flex h-10 flex-1 items-center gap-2 rounded-xl px-3">
          <Icon name="search" size={17} className="text-text-muted" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" aria-label="Rechercher dans les messages" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-text-muted" />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Effacer" className="text-text-muted press">
              <Icon name="x" size={16} />
            </button>
          )}
        </label>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {failed && <p className="p-6 text-center text-sm text-text-muted">La recherche ne répond pas. Réessaie.</p>}
        {!failed && value.length < MIN_LENGTH && <p className="p-6 text-center text-sm text-text-muted">Un mot, ou une date comme 12/03 ou mars 2025.</p>}
        {!failed && hits && hits.length === 0 && <p className="p-6 text-center text-sm text-text-muted">Aucun message trouvé.</p>}
        {!failed && hits && hits.length > 0 && (
          <>
            <p className="px-4 pb-1.5 pt-3 text-xs text-text-muted">{hits.length === 20 ? "Les 20 plus récents" : `${hits.length} message${hits.length > 1 ? "s" : ""}`}</p>
            <ul>
              {hits.map((h) => (
                <li key={h.id}>
                  <button type="button" onClick={() => onOpen(h.id)} className="flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left press hover:bg-surface">
                    <span className="flex justify-between text-[12.5px]">
                      <b className="font-bold">{h.authorName === myName ? "Toi" : h.authorName}</b>
                      <span className="text-text-muted">{day(h.createdAt)}</span>
                    </span>
                    <span className="line-clamp-2 text-[14.5px]">{marked(h.text ?? "", value)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
