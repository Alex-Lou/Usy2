import { Link } from "react-router-dom";
import { Icon } from "../../../components/ui/Icon";
import type { Playlist, Track } from "../../music/types";
import { usePlaylists } from "../../music/usePlaylists";

/** The latest songs added to any shared playlist, newest first. */
function latest(playlists: Playlist[] | null, n: number): { track: Track; playlist: Playlist }[] {
  return (playlists ?? [])
    .flatMap((playlist) => playlist.tracks.map((track) => ({ track, playlist })))
    .sort((a, b) => b.track.createdAt.localeCompare(a.track.createdAt))
    .slice(0, n);
}

/** Latest songs of the shared playlists; opens "Musique". */
export function MusicWidget({ label }: { label?: string }) {
  const { playlists } = usePlaylists();
  const items = latest(playlists, 3);
  return (
    <Link to="/musique" className="block rounded-token border border-border bg-surface px-4 py-3 press hover:border-primary/50">
      <p className="mb-1 flex items-center gap-2 text-xs text-text-muted">
        <Icon name="music" size={14} className="text-primary" />
        {label || "Nos derniers morceaux"}
      </p>
      {playlists === null ? (
        <div className="h-10 animate-pulse rounded-token bg-border/50" />
      ) : items.length ? (
        <ul className="flex flex-col gap-1">
          {items.map(({ track, playlist }) => (
            <li key={track.id} className="flex items-center gap-2 text-sm">
              <span aria-hidden="true">{playlist.emoji || "🎵"}</span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold text-text">{track.title}</span>
                {track.artist && <span className="text-text-muted"> · {track.artist}</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-muted">Aucun morceau pour l'instant : on commence une playlist ?</p>
      )}
    </Link>
  );
}

/** Side-menu version: the two latest songs on one wide tile. */
export function MiniMusic({ label }: { label?: string }) {
  const { playlists } = usePlaylists();
  const items = latest(playlists, 2);
  return (
    <Link to="/musique" className="flex flex-col gap-1 rounded-2xl bg-surface-2/60 px-3 py-2 press hover:text-primary" aria-label={`${label || "Musique"} : ouvrir les playlists`}>
      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-text-muted">
        <Icon name="music" size={11} /> {label || "Musique"}
      </span>
      {items.length ? (
        items.map(({ track, playlist }) => (
          <span key={track.id} className="flex items-center gap-1.5 text-[11px] text-text">
            <span aria-hidden="true">{playlist.emoji || "🎵"}</span>
            <span className="min-w-0 flex-1 truncate">{track.title}</span>
          </span>
        ))
      ) : (
        <span className="text-[11px] text-text-muted">{playlists === null ? "…" : "Pas encore de morceau"}</span>
      )}
    </Link>
  );
}
