/** A song of a shared playlist (see MusicService.java); `url` null = kept by name only. */
export interface Track {
  id: number;
  title: string;
  artist: string | null;
  url: string | null;
  note: string | null;
  addedById: number;
  createdAt: string;
}

export interface Playlist {
  id: number;
  name: string;
  emoji: string | null;
  createdAt: string;
  tracks: Track[];
}

export interface TrackInput {
  title: string;
  artist: string | null;
  url: string | null;
  note: string | null;
}
