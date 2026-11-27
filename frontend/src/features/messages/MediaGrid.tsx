import { AssetImage } from "../../components/AssetImage";
import type { Asset } from "../../lib/api/assets";

/**
 * Photos sent together, as one mosaic: 2 or 4 on two columns, otherwise three.
 * Each tile is square; tapping one opens the viewer on it (the others follow).
 */
export function MediaGrid({ photos, onOpen }: { photos: Asset[]; onOpen: (index: number) => void }) {
  const cols = photos.length === 2 || photos.length === 4 ? "grid-cols-2" : "grid-cols-3";
  return (
    <div className={`grid w-64 max-w-full gap-0.5 overflow-hidden rounded-token ${cols}`}>
      {photos.map((p, i) => (
        <button key={p.id} type="button" onClick={() => onOpen(i)} className="block aspect-square overflow-hidden press" aria-label={`Agrandir la photo ${i + 1} sur ${photos.length}`}>
          <AssetImage assetId={p.id} ratio={1} className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  );
}
