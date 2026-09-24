import { AssetImage } from "../../../components/AssetImage";

// Displays an uploaded image (persisted in DB) with an optional caption.
// `fill`: the widget has a set height on the profile grid, the photo fills it.
export function ImageWidget({ assetId, label, fill = false }: { assetId: number; label?: string; fill?: boolean }) {
  return (
    <figure className="flex flex-col overflow-hidden rounded-token border border-border bg-surface">
      <AssetImage assetId={assetId} className={fill ? "min-h-0 w-full flex-1 object-cover" : "max-h-80 w-full object-cover"} />
      {label && <figcaption className="px-3 py-2 text-center text-sm text-text-muted">{label}</figcaption>}
    </figure>
  );
}
