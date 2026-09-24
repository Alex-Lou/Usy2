import { useCallback, useEffect, useState } from "react";
import { onCoupleActivity } from "../couple/activity";
import { getPlaylists } from "./api";
import type { Playlist } from "./types";

/** The shared playlists, re-fetched when either person changes one. */
export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    getPlaylists()
      .then((all) => {
        setPlaylists(all);
        setError(null);
      })
      .catch(() => setError("Impossible de charger les playlists."));
  }, []);

  useEffect(() => {
    reload();
    return onCoupleActivity((a) => a.kind === "music" && reload());
  }, [reload]);

  return { playlists, setPlaylists, error, reload };
}
