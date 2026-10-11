import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { uploadImage, type Asset } from "../../lib/api/assets";
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
  const [uploading, setUploading] = useState(false);
  const keyboardZone = useRef<HTMLDivElement>(null);

  /** A GIF (or photo) of the phone: the gallery, or the keyboard's GIF button. Sent like a photo. */
  async function fromPhone(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/") || file.type === "image/svg+xml" || uploading) return;
    setUploading(true);
    setError(null);
    try {
      onPick(await uploadImage(file));
      onClose();
    } catch {
      setError("Ce GIF n'a pas pu être envoyé, réessaie.");
    } finally {
      setUploading(false);
    }
  }

  // The keyboard's GIF button (Gboard…) only offers its GIFs to a rich text zone (not a plain text
  // box): it then hands the GIF over as a paste, or as an image put into the zone.
  async function fromKeyboardZone() {
    const zone = keyboardZone.current;
    if (!zone) return;
    const img = zone.querySelector("img");
    const src = img?.getAttribute("src");
    zone.innerHTML = ""; // nothing typed stays there
    if (!src) return;
    try {
      const blob = await (await fetch(src)).blob();
      await fromPhone(new File([blob], "clavier.gif", { type: blob.type || "image/gif" }));
    } catch {
      setError("Ce GIF du clavier n'a pas pu être lu : essaie depuis la galerie.");
    }
  }

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

        {/* The phone's own GIFs: the keyboard's GIF button, or the gallery. */}
        <div className="flex shrink-0 gap-2 px-3 pb-2">
          <div
            ref={keyboardZone}
            contentEditable={!uploading}
            suppressContentEditableWarning
            role="textbox"
            aria-label="GIF du clavier : touche ici, puis le bouton GIF de ton clavier"
            data-placeholder="⌨️ Touche ici puis GIF du clavier"
            onPaste={(e) => {
              const items = Array.from(e.clipboardData.items);
              const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"))
                ?? items.find((i) => i.kind === "file" && i.type.startsWith("image/"))?.getAsFile();
              if (file) {
                e.preventDefault();
                void fromPhone(file);
              }
            }}
            onInput={() => void fromKeyboardZone()}
            className="min-w-0 flex-1 truncate rounded-full border border-dashed border-primary/60 px-3 py-2 text-sm text-text-muted outline-none focus:border-primary empty:before:text-text-muted empty:before:content-[attr(data-placeholder)]"
          />
          <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-2 text-sm font-semibold text-text press hover:border-primary/60">
            <Icon name="images" size={16} className="text-primary" />
            Galerie
            <input
              type="file"
              accept="image/gif,image/*"
              className="hidden"
              onChange={(e) => {
                void fromPhone(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {uploading && <p className="px-3 pb-2 text-center text-sm text-text-muted">Envoi du GIF…</p>}

        {enabled === false ? (
          <>
            <p className="px-6 py-8 text-center text-sm text-text-muted">
              La recherche parmi des milliers de GIFs n'est pas encore activée sur le serveur (il lui faut une clé GIPHY). En
              attendant, les GIFs de ton clavier et de ta galerie marchent avec les boutons juste au-dessus.
            </p>
            {error && <p role="alert" className="px-3 pb-1 text-center text-sm text-danger">{error}</p>}
          </>
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
