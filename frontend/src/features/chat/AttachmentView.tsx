import { useState } from "react";
import { AssetImage } from "../../components/AssetImage";
import { Icon } from "../../components/ui/Icon";
import type { Asset } from "../../lib/api/assets";
import { formatSize, isImage, openDocument } from "./attachments";

/** A photo/GIF (tap to enlarge) or a document card (tap to open/download). */
export function AttachmentView({ asset, onOpenImage, mine }: { asset: Asset; onOpenImage: (a: Asset) => void; mine: boolean }) {
  const [error, setError] = useState(false);

  if (isImage(asset)) {
    return (
      <button type="button" onClick={() => onOpenImage(asset)} className="block overflow-hidden rounded-token press" aria-label="Agrandir la photo">
        <AssetImage assetId={asset.id} className="max-h-72 w-full min-w-40 object-cover" />
      </button>
    );
  }

  const ext = asset.originalFilename.split(".").pop()?.toUpperCase().slice(0, 4) ?? "";
  return (
    <button
      type="button"
      onClick={() => openDocument(asset).catch(() => setError(true))}
      className={
        "flex w-64 max-w-full items-center gap-3 rounded-token px-3 py-2.5 text-left press " +
        (mine ? "bg-black/15" : "border border-border bg-surface")
      }
    >
      <Icon name="file" size={34} strokeWidth={1.5} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{asset.originalFilename}</span>
        <span className={"block text-xs " + (mine ? "opacity-80" : "text-text-muted")}>
          {error ? "Ouverture impossible" : `${ext} · ${formatSize(asset.sizeBytes)} · ${asset.contentType === "application/pdf" ? "Ouvrir" : "Télécharger"}`}
        </span>
      </span>
      <Icon name="download" size={18} className="shrink-0 opacity-80" />
    </button>
  );
}
