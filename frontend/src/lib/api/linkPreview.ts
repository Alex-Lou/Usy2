import { apiRequest, fetchBlobUrl } from "./client";

export interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
  hasImage: boolean;
}

// Small bounded caches, so scrolling back never refetches and memory stays flat.
const MAX_PREVIEWS = 100;
const MAX_IMAGES = 30;
const previews = new Map<string, Promise<LinkPreviewData>>();
const images = new Map<string, Promise<string>>();

function remember<V>(map: Map<string, Promise<V>>, key: string, max: number, load: () => Promise<V>, release?: (v: V) => void): Promise<V> {
  const hit = map.get(key);
  if (hit) {
    map.delete(key);
    map.set(key, hit); // recently used
    return hit;
  }
  const pending = load();
  map.set(key, pending);
  pending.catch(() => map.delete(key));
  while (map.size > max) {
    const [oldKey, old] = map.entries().next().value as [string, Promise<V>];
    map.delete(oldKey);
    if (release) old.then(release).catch(() => {});
  }
  return pending;
}

/** Title, description and thumbnail of a link, fetched by the server (the phone never contacts the site). */
export function getLinkPreview(url: string): Promise<LinkPreviewData> {
  return remember(previews, url, MAX_PREVIEWS, () =>
    apiRequest<LinkPreviewData>(`/api/link-preview?url=${encodeURIComponent(url)}`),
  );
}

export function getLinkPreviewImage(url: string): Promise<string> {
  return remember(
    images,
    url,
    MAX_IMAGES,
    () => fetchBlobUrl(`/api/link-preview/image?url=${encodeURIComponent(url)}`),
    (objectUrl) => URL.revokeObjectURL(objectUrl),
  );
}
