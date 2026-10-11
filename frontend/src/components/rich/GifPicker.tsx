import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Asset } from "../../lib/api/assets";
import { findGifs, getGifStatus, saveGif, type Gif } from "../../lib/api/gifs";
import { Icon } from "../ui/Icon";

/** Ready-made moods, one tap away (searched in French and English alike by GIPHY). */
const MOODS: { label: string; q: string }[] = [
  { label: "🔥 Tendances", q: "" },
  { label: "😂 Mdr", q: "lol" },
  { label: "❤️ Je t'aime", q: "love you" },
  { label: "😘 Bisou", q: "kiss" },
  { label: "🤗 Câlin", q: "hug" },
  { label: "🎉 Bravo", q: "congratulations" },
  { label: "🙏 Merci", q: "thank you" },
  { label: "😮 Wow", q: "wow" },
  { label: "🥺 Triste", q: "sad" },
  { label: "😴 Dodo", q: "good night" },
  { label: "☀️ Bonjour", q: "good morning" },
  { label: "🤤 Miam", q: "hungry" },
  { label: "🙄 Pfff", q: "eye roll" },
  { label: "👍 OK", q: "ok" },
  { label: "🐱 Chat", q: "cat" },
  { label: "🐶 Chien", q: "dog" },
  { label: "💃 Danse", q: "dance" },
  { label: "🥳 Fête", q: "party" },
];

/**
 * The GIF search (GIPHY), as a sheet over the page: trending GIFs first, ready-made moods, or any
 * search; more come in as one scrolls. The GIF picked is kept by our server, then handed over as
 * one of our images ({@code onPick}). Without a GIPHY key on the server, it says so: the phone's
 * GIFs (gallery, keyboard) still work wherever photos do.
 */
export function GifPicker({ onPick, onClose }: { onPick: (asset: Asset) => void; onClose: () => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState(""); // the search shown (typing settles first)
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [next, setNext] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const request = useRef(0); // a new search makes the answers still on their way stale

  useEffect(() => {
    getGifStatus()
      .then((s) => setEnabled(s.enabled))
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Typing settles a moment before searching (a beta key allows about 100 searches an hour).
  useEffect(() => {
    const t = window.setTimeout(() => setAsked(query.trim()), 400);
    return () => window.clearTimeout(t);
  }, [query]);

  // A new search: from the top.
  useEffect(() => {
    if (!enabled) return;
    request.current++;
    loadingRef.current = false;
    setLoading(false);
    setGifs([]);
    setNext(0);
    list.current?.scrollTo({ top: 0 });
  }, [asked, enabled]);

  // The next page, when the end of the list comes into view.
  useEffect(() => {
    if (!enabled || next === null) return;
    const el = end.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      const mine = ++request.current;
      findGifs(asked, next)
        .then((page) => {
          if (mine !== request.current) return;
          setGifs((g) => [...g, ...page.gifs.filter((x) => !g.some((y) => y.id === x.id))]);
          setNext(page.next);
          setError(null);
        })
        .catch(() => {
          if (mine !== request.current) return;
          setError("Les GIFs ne répondent pas pour l'instant.");
          setNext(null);
        })
        .finally(() => {
          if (mine !== request.current) return;
          loadingRef.current = false;
          setLoading(false);
        });
    }, { root: list.current, rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, asked, next]);

  async function pick(gif: Gif) {
    if (saving) return;
    setSaving(gif.id);
    setError(null);
    try {
      onPick(await saveGif(gif.id));
      onClose();
    } catch {
      setError("Ce GIF n'a pas pu être récupéré, essaie-en un autre.");
    } finally {
      setSaving(null);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label="Choisir un GIF">
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[78dvh] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-surface shadow-card animate-sheet-up sm:h-[70dvh] sm:rounded-2xl"
      >
        <div className="flex items-center gap-2 p-3">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-bg-2/60 px-3 py-2">
            <Icon name="search" size={16} className="text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher un GIF…"
              maxLength={50}
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
              aria-label="Chercher un GIF"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Effacer la recherche" className="text-text-muted press">
                <Icon name="x" size={14} />
              </button>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-full text-text-muted press hover:text-text">
            <Icon name="x" size={18} />
          </button>
        </div>

        {enabled === false ? (
          <p className="px-6 py-10 text-center text-sm text-text-muted">
            La recherche de GIFs n'est pas encore activée sur le serveur. En attendant, les GIFs de ta galerie et de ton clavier
            fonctionnent avec le bouton photo.
          </p>
        ) : (
          <>
            <div className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto px-3 pb-2">
              {MOODS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => setQuery(m.q)}
                  className={"chip shrink-0 whitespace-nowrap press " + (asked === m.q ? "seg-on" : "")}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div ref={list} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3">
              <div className="columns-2 gap-2 sm:columns-3">
                {gifs.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => void pick(g)}
                    disabled={saving !== null}
                    className="relative mb-2 block w-full overflow-hidden rounded-token bg-bg-2 press disabled:opacity-60"
                    style={{ aspectRatio: `${g.width} / ${g.height}` }}
                    aria-label={g.title || "GIF"}
                  >
                    <img src={g.preview} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    {saving === g.id && (
                      <span className="absolute inset-0 grid place-items-center bg-black/40 text-sm font-semibold text-white">Envoi…</span>
                    )}
                  </button>
                ))}
              </div>
              <div ref={end} className="py-4 text-center text-xs text-text-muted">
                {loading ? "Chargement…" : enabled && next === null && gifs.length === 0 && !error ? "Aucun GIF trouvé" : ""}
              </div>
            </div>
            {error && <p role="alert" className="px-3 pb-1 text-center text-sm text-danger">{error}</p>}
            <p className="shrink-0 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-text-muted">Powered by GIPHY</p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
