import { ZoomableImage } from "../../../components/photo/ZoomableImage";

// Displays an uploaded image (persisted in DB) with an optional caption.
// `fill`: the widget has a set height on the profile grid, the photo fills it.
export function ImageWidget({ assetId, label, fill = false }: { assetId: number; label?: string; fill?: boolean }) {
  return (
    <figure className="flex flex-col overflow-hidden rounded-token border border-border bg-surface">
      <ZoomableImage
        assetId={assetId}
        className={fill ? "min-h-0 w-full flex-1" : "w-full"}
        imgClassName={fill ? "h-full w-full object-cover" : "max-h-80 w-full object-cover"}
      />
      {label && <figcaption className="px-3 py-2 text-center text-sm text-text-muted">{label}</figcaption>}
    </figure>
  );
}
