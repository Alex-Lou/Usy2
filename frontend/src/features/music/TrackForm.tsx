import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { getLinkPreview } from "../../lib/api/linkPreview";
import { isWebAddress, normalizePinUrl } from "../profile/widgets/pinSuggestions";
import type { Track, TrackInput } from "./types";

/** "Artist - Song | YouTube" → { artist, title }, dropping the site's suffix. */
export function splitTitle(raw: string): { title: string; artist: string | null } {
  const clean = raw.replace(/\s*[-|–]\s*(YouTube|YouTube Music|SoundCloud|Spotify|Deezer)\s*$/i, "").trim();
  const m = clean.match(/^(.{1,80}?)\s+[-–]\s+(.+)$/);
  return m ? { artist: m[1].trim(), title: m[2].trim() } : { title: clean, artist: null };
}

/**
 * Adds or changes a song. Pasting a link fills the title (and artist) from the
 * page, fetched by our server; a song can also be just a name, no link.
 */
export function TrackForm({
  initial,
  seedUrl,
  busy,
  onSave,
  onCancel,
}: {
  initial: Track | null;
  seedUrl?: string;
  busy: boolean;
  onSave: (input: TrackInput) => void;
  onCancel?: () => void;
}) {
  const [url, setUrl] = useState(initial?.url ?? seedUrl ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [artist, setArtist] = useState(initial?.artist ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [looking, setLooking] = useState(false);
  const touched = useRef(!!initial); // never overwrite what the person typed

  const link = normalizePinUrl(url);
  const badLink = link !== "" && !isWebAddress(link);

  // A pasted link fills the title from the page (once, if still empty).
  useEffect(() => {
    if (touched.current || !isWebAddress(link)) return;
    let alive = true;
    const t = setTimeout(() => {
      setLooking(true);
      getLinkPreview(link)
        .then((p) => {
          if (!alive || touched.current || !p.title) return;
          const found = splitTitle(p.title);
          setTitle(found.title.slice(0, 120));
          if (found.artist) setArtist(found.artist.slice(0, 80));
        })
        .catch(() => {})
        .finally(() => alive && setLooking(false));
    }, 400);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [link]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || badLink || busy) return;
    onSave({ title: title.trim(), artist: artist.trim() || null, url: link || null, note: note.trim() || null });
    if (!initial) {
      setUrl("");
      setTitle("");
      setArtist("");
      setNote("");
      touched.current = false;
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2" aria-label={initial ? "Modifier le morceau" : "Ajouter un morceau"}>
      <Input
        value={url}
        inputMode="url"
        maxLength={2048}
        placeholder="Lien YouTube, SoundCloud… (facultatif)"
        onChange={(e) => setUrl(e.target.value)}
        aria-label="Lien"
        aria-invalid={badLink}
      />
      {badLink && <p className="text-xs text-danger">Seules les adresses web (http ou https) sont acceptées.</p>}
      <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
        <Input
          value={title}
          maxLength={120}
          placeholder={looking ? "Je cherche le titre…" : "Titre"}
          onChange={(e) => {
            touched.current = true;
            setTitle(e.target.value);
          }}
          aria-label="Titre"
        />
        <Input
          value={artist}
          maxLength={80}
          placeholder="Artiste"
          onChange={(e) => {
            touched.current = true;
            setArtist(e.target.value);
          }}
          aria-label="Artiste"
        />
      </div>
      <Input value={note} maxLength={200} placeholder="Petite note (souvenir, « notre chanson »…)" onChange={(e) => setNote(e.target.value)} aria-label="Note" />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!title.trim() || badLink || busy}>
          {initial ? "Enregistrer" : "Ajouter"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>
    </form>
  );
}
