import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Input } from "../../components/ui/Input";
import { firstLink, takeForMusic } from "../feed/sharedContent";
import { domainOf, isWebAddress } from "../profile/widgets/pinSuggestions";
import { addTrack, createPlaylist, deletePlaylist, deleteTrack, renamePlaylist, reorderTracks, updateTrack } from "./api";
import { isAndroid, patotubeLink } from "./patotube";
import { TrackForm } from "./TrackForm";
import type { Playlist, Track, TrackInput } from "./types";
import { usePlaylists } from "./usePlaylists";

const EMOJIS = ["🎵", "💞", "🚗", "🌙", "🔥", "☀️", "🎉", "😌"];

/** "Musique": shared playlists; a song with a link opens in Patotube on Android. */
export function MusicPage() {
  const { playlists, setPlaylists, error: loadError, reload } = usePlaylists();
  const [params, setParams] = useSearchParams();
  const selectedId = Number(params.get("p")) || null;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sharedUrl, setSharedUrl] = useState<string | undefined>();

  // Arrived from another app's "Share" menu: the link waits in the add form.
  useEffect(() => {
    const shared = takeForMusic();
    const link = shared ? firstLink(shared.text) : null;
    if (link) setSharedUrl(link);
  }, []);

  const selected = playlists?.find((p) => p.id === selectedId) ?? playlists?.[0] ?? null;
  const select = (id: number) => setParams({ p: String(id) }, { replace: true });

  const replace = (updated: Playlist) =>
    setPlaylists((prev) => (prev ? (prev.some((p) => p.id === updated.id) ? prev.map((p) => (p.id === updated.id ? updated : p)) : [...prev, updated]) : prev));

  async function run<T>(action: () => Promise<T>, then: (result: T) => void) {
    setBusy(true);
    setError(null);
    try {
      then(await action());
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Action impossible.");
      reload(); // back to the server's state
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Musique</h1>
        <p className="text-sm text-text-muted">
          Vos playlists à deux.{" "}
          {isAndroid() ? "Un morceau avec un lien s'ouvre dans Patotube." : "Sur Android, un morceau avec un lien s'ouvre dans Patotube."}
        </p>
      </div>

      {(loadError || error) && (
        <p role="alert" className="text-sm text-danger">
          {error ?? loadError}{" "}
          {loadError && !error && (
            <button type="button" onClick={reload} className="underline">Réessayer</button>
          )}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Playlists" className="flex min-w-0 gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {playlists === null && !loadError && <div className="h-10 w-full animate-pulse rounded-token bg-border/50" />}
          {playlists?.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => select(p.id)}
              aria-current={selected?.id === p.id}
              className={
                "flex shrink-0 items-center gap-2 rounded-token border px-3 py-2 text-left text-sm font-semibold transition press " +
                (selected?.id === p.id ? "border-primary bg-surface-2 text-text" : "border-border bg-surface text-text-muted hover:border-primary/50")
              }
            >
              <span aria-hidden="true">{p.emoji || "🎵"}</span>
              <span className="max-w-[10rem] truncate lg:max-w-none lg:flex-1">{p.name}</span>
              <span className="text-xs font-normal text-text-muted tabular-nums">{p.tracks.length}</span>
            </button>
          ))}
          {creating ? (
            <PlaylistNameForm
              busy={busy}
              onSave={(name, emoji) =>
                run(() => createPlaylist(name, emoji), (p) => {
                  replace(p);
                  select(p.id);
                  setCreating(false);
                })
              }
              onCancel={() => setCreating(false)}
            />
          ) : (
            <button type="button" onClick={() => setCreating(true)} className="chip shrink-0 press self-center hover:border-primary/50 lg:self-start">
              + Nouvelle playlist
            </button>
          )}
        </nav>

        {selected ? (
          <PlaylistView
            key={selected.id}
            playlist={selected}
            busy={busy}
            seedUrl={sharedUrl}
            onSeedUsed={() => setSharedUrl(undefined)}
            onRename={(name, emoji) => run(() => renamePlaylist(selected.id, name, emoji), replace)}
            onDelete={() => {
              if (!window.confirm(`Supprimer la playlist « ${selected.name} » et ses ${selected.tracks.length} morceaux ?`)) return;
              void run(() => deletePlaylist(selected.id), () => {
                setPlaylists((prev) => prev?.filter((p) => p.id !== selected.id) ?? prev);
                setParams({}, { replace: true });
              });
            }}
            onAdd={(input) => run(() => addTrack(selected.id, input), replace)}
            onUpdate={(id, input) => run(() => updateTrack(id, input), replace)}
            onRemove={(id) => run(() => deleteTrack(id), replace)}
            onMove={(ids) => {
              // Instant, then confirmed (or rolled back) by the server.
              setPlaylists((prev) => prev?.map((p) => (p.id === selected.id ? { ...p, tracks: ids.map((id) => p.tracks.find((t) => t.id === id)!) } : p)) ?? prev);
              void run(() => reorderTracks(selected.id, ids), replace);
            }}
          />
        ) : (
          playlists && (
            <div className="card p-6 text-center text-sm text-text-muted">
              Pas encore de playlist. Créez-en une : « Road trip », « Notre chanson », « À écouter »…
              {sharedUrl && <p className="mt-2 text-text">Le lien partagé vous attend : créez une playlist pour l'y ajouter.</p>}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function PlaylistNameForm({
  initialName = "",
  initialEmoji = "🎵",
  busy,
  onSave,
  onCancel,
}: {
  initialName?: string;
  initialEmoji?: string | null;
  busy: boolean;
  onSave: (name: string, emoji: string | null) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [emoji, setEmoji] = useState(initialEmoji ?? "");
  return (
    <form
      className="flex w-72 max-w-full shrink-0 flex-col gap-2 rounded-token border border-border bg-surface p-2 lg:w-auto"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSave(name.trim(), emoji.trim() || null);
      }}
    >
      <Input value={name} maxLength={40} placeholder="Nom de la playlist" onChange={(e) => setName(e.target.value)} autoFocus aria-label="Nom de la playlist" />
      <div className="flex flex-wrap gap-1" role="group" aria-label="Emoji de la playlist">
        {EMOJIS.map((e) => (
          <button key={e} type="button" onClick={() => setEmoji(e)} aria-pressed={emoji === e} className={`grid h-8 w-8 place-items-center rounded-full press ${emoji === e ? "bg-primary/20 ring-2 ring-primary" : "bg-surface-2"}`}>
            {e}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={!name.trim() || busy} className="!py-1.5">OK</Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="!py-1.5">Annuler</Button>
      </div>
    </form>
  );
}

function PlaylistView({
  playlist,
  busy,
  seedUrl,
  onSeedUsed,
  onRename,
  onDelete,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
}: {
  playlist: Playlist;
  busy: boolean;
  seedUrl?: string;
  onSeedUsed: () => void;
  onRename: (name: string, emoji: string | null) => void;
  onDelete: () => void;
  onAdd: (input: TrackInput) => void;
  onUpdate: (id: number, input: TrackInput) => void;
  onRemove: (id: number) => void;
  onMove: (ids: number[]) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const android = isAndroid();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? playlist.tracks.filter((t) => `${t.title} ${t.artist ?? ""} ${t.note ?? ""}`.toLowerCase().includes(q)) : playlist.tracks;
  }, [playlist.tracks, query]);

  function move(index: number, by: number) {
    const ids = playlist.tracks.map((t) => t.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + by, 0, id);
    onMove(ids);
  }

  return (
    <section className="card flex min-w-0 flex-col gap-3 p-4" aria-label={playlist.name}>
      {renaming ? (
        <PlaylistNameForm
          initialName={playlist.name}
          initialEmoji={playlist.emoji}
          busy={busy}
          onSave={(name, emoji) => {
            onRename(name, emoji);
            setRenaming(false);
          }}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">{playlist.emoji || "🎵"}</span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-lg font-bold">{playlist.name}</h2>
            <p className="text-xs text-text-muted">{playlist.tracks.length} morceau{playlist.tracks.length > 1 ? "x" : ""}</p>
          </div>
          <button type="button" onClick={() => setRenaming(true)} className="chip press text-xs hover:border-primary/50">Renommer</button>
          <button type="button" onClick={onDelete} className="grid h-8 w-8 place-items-center rounded-full text-text-muted press hover:text-danger" aria-label="Supprimer la playlist">
            <Icon name="trash" size={16} />
          </button>
        </div>
      )}

      {playlist.tracks.length > 8 && (
        <Input value={query} placeholder="Chercher dans la playlist…" onChange={(e) => setQuery(e.target.value)} aria-label="Chercher" className="!py-2" />
      )}

      {playlist.tracks.length === 0 ? (
        <p className="text-sm text-text-muted">Playlist vide : ajoutez un premier morceau ci-dessous.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-border">
          {shown.map((track) => {
            const index = playlist.tracks.indexOf(track);
            return editingId === track.id ? (
              <li key={track.id} className="py-2">
                <TrackForm
                  initial={track}
                  busy={busy}
                  onSave={(input) => {
                    onUpdate(track.id, input);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <TrackRow
                key={track.id}
                track={track}
                number={index + 1}
                android={android}
                canUp={!query && index > 0}
                canDown={!query && index < playlist.tracks.length - 1}
                busy={busy}
                onUp={() => move(index, -1)}
                onDown={() => move(index, 1)}
                onEdit={() => setEditingId(track.id)}
                onRemove={() => onRemove(track.id)}
              />
            );
          })}
        </ol>
      )}

      <div className="border-t border-border pt-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Ajouter un morceau</h3>
        <TrackForm
          key={seedUrl ?? "empty"}
          initial={null}
          seedUrl={seedUrl}
          busy={busy}
          onSave={(input) => {
            onAdd(input);
            onSeedUsed();
          }}
        />
      </div>
    </section>
  );
}

function TrackRow({
  track,
  number,
  android,
  canUp,
  canDown,
  busy,
  onUp,
  onDown,
  onEdit,
  onRemove,
}: {
  track: Track;
  number: number;
  android: boolean;
  canUp: boolean;
  canDown: boolean;
  busy: boolean;
  onUp: () => void;
  onDown: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const url = track.url && isWebAddress(track.url) ? track.url : null; // server-checked; checked again before any href
  const pato = url && android ? patotubeLink(url) : null;
  const small = "grid h-8 w-8 shrink-0 place-items-center rounded-full text-text-muted press hover:text-primary disabled:opacity-30";
  return (
    <li className="flex items-center gap-2 py-2">
      <span className="w-6 shrink-0 text-right text-xs tabular-nums text-text-muted">{number}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-text">{track.title}</p>
        <p className="truncate text-xs text-text-muted">
          {[track.artist, track.url ? domainOf(track.url) : "sans lien"].filter(Boolean).join(" · ")}
        </p>
        {track.note && <p className="truncate text-xs italic text-text">{track.note}</p>}
      </div>
      {pato && (
        <a href={pato} className="flex h-9 shrink-0 items-center gap-1 rounded-full btn-brand px-2.5 text-xs font-semibold press sm:px-3" aria-label={`Ouvrir ${track.title} dans Patotube`} title="Ouvrir dans Patotube">
          <Icon name="play" size={14} /> <span className="hidden sm:inline">Patotube</span>
        </a>
      )}
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer nofollow" className={pato ? `${small} hidden sm:grid` : small} aria-label={`Ouvrir le lien de ${track.title}`} title="Ouvrir le lien">
          <Icon name="send" size={14} />
        </a>
      )}
      <button type="button" onClick={onUp} disabled={!canUp || busy} className={`${small} hidden sm:grid`} aria-label={`Monter ${track.title}`}>
        <Icon name="arrowUp" size={14} />
      </button>
      <button type="button" onClick={onDown} disabled={!canDown || busy} className={`${small} hidden sm:grid`} aria-label={`Descendre ${track.title}`}>
        <Icon name="arrowDown" size={14} />
      </button>
      <TrackMenu canUp={canUp} canDown={canDown} busy={busy} onUp={onUp} onDown={onDown} onEdit={onEdit} onRemove={onRemove} title={track.title} />
    </li>
  );
}

/** Edit / remove (and move, on phones) behind one small button. */
function TrackMenu({
  title,
  canUp,
  canDown,
  busy,
  onUp,
  onDown,
  onEdit,
  onRemove,
}: {
  title: string;
  canUp: boolean;
  canDown: boolean;
  busy: boolean;
  onUp: () => void;
  onDown: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const item = "w-full rounded-token px-3 py-2 text-left text-sm press hover:bg-surface-2 disabled:opacity-40";
  const pick = (f: () => void) => () => {
    setOpen(false);
    f();
  };
  return (
    <div className="relative shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`Actions pour ${title}`} className="grid h-8 w-8 place-items-center rounded-full text-text-muted press hover:text-text">
        <Icon name="sliders" size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div role="menu" className="absolute right-0 top-9 z-20 w-40 rounded-token border border-border bg-surface p-1 shadow-card animate-pop">
            <button type="button" role="menuitem" className={`${item} sm:hidden`} disabled={!canUp || busy} onClick={pick(onUp)}>Monter</button>
            <button type="button" role="menuitem" className={`${item} sm:hidden`} disabled={!canDown || busy} onClick={pick(onDown)}>Descendre</button>
            <button type="button" role="menuitem" className={item} onClick={pick(onEdit)}>Modifier</button>
            <button type="button" role="menuitem" className={`${item} text-danger`} disabled={busy} onClick={pick(onRemove)}>Retirer</button>
          </div>
        </>
      )}
    </div>
  );
}
