import { fetchBlobUrl } from "./client";

/**
 * Shared, bounded cache of protected images as object URLs: each file is
 * downloaded once (parallel requests for the same id share one download) and
 * the least recently used ones are released beyond MAX_ENTRIES, so memory
 * stays flat however many photos/GIFs a conversation holds.
 */
const MAX_ENTRIES = 60;
const cache = new Map<number, Promise<string>>(); // insertion order = recency

export function getAssetUrl(assetId: number): Promise<string> {
  const hit = cache.get(assetId);
  if (hit) {
    cache.delete(assetId);
    cache.set(assetId, hit); // mark as recently used
    return hit;
  }
  const pending = fetchBlobUrl(`/api/assets/${assetId}`);
  cache.set(assetId, pending);
  pending.catch(() => cache.delete(assetId)); // retry next time
  while (cache.size > MAX_ENTRIES) {
    const [oldestId, oldest] = cache.entries().next().value as [number, Promise<string>];
    cache.delete(oldestId);
    oldest.then((url) => URL.revokeObjectURL(url)).catch(() => {});
  }
  return pending;
}
