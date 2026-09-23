import { useEffect } from "react";
import { AssetImage } from "../../components/AssetImage";
import { Icon } from "../../components/ui/Icon";
import type { Asset } from "../../lib/api/assets";
import { downloadAsset } from "./attachments";

/** Full-screen photo/GIF viewer with a download button. Esc or tap outside closes. */
export function ImageViewer({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      className="fixed inset-0 z-50 flex flex-col bg-black/90 animate-fade-up"
      onClick={onClose}
    >
      <div className="flex justify-end gap-2 px-4 pb-2 pt-[calc(var(--safe-top)+0.75rem)]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void downloadAsset(asset);
          }}
          aria-label="Enregistrer"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white press hover:bg-white/20"
        >
          <Icon name="download" size={20} />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white press hover:bg-white/20"
        >
          <Icon name="x" size={20} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full">
          <AssetImage assetId={asset.id} className="max-h-[80dvh] max-w-full rounded-token object-contain" />
        </div>
      </div>
    </div>
  );
}
