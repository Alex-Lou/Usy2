import { useState } from "react";
import type { Framing } from "../../lib/framing";
import { AssetImage } from "../AssetImage";
import { ImageViewer } from "./ImageViewer";

/**
 * An uploaded photo that opens full screen on tap (see ImageViewer).
 * `className` places the tappable box, `imgClassName` sizes the photo inside.
 */
export function ZoomableImage({
  assetId,
  framing,
  className = "",
  imgClassName,
}: {
  assetId: number;
  framing?: Framing | null;
  className?: string;
  imgClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Agrandir la photo" className={`block cursor-zoom-in ${className}`}>
        <AssetImage assetId={assetId} framing={framing} className={imgClassName} />
      </button>
      {open && <ImageViewer asset={{ id: assetId, originalFilename: `memocat-${assetId}.jpg` }} onClose={() => setOpen(false)} />}
    </>
  );
}
