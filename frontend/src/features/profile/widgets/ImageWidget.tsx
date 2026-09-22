import { AssetImage } from "../../../components/AssetImage";

// Displays an uploaded image (persisted in DB) with an optional caption.
export function ImageWidget({ assetId, label }: { assetId: number; label?: string }) {
  return (
    <figure className="overflow-hidden rounded-token border border-border bg-surface">
      <AssetImage assetId={assetId} className="max-h-80 w-full object-cover" />
      {label && <figcaption className="px-3 py-2 text-center text-sm text-text-muted">{label}</figcaption>}
    </figure>
  );
}
