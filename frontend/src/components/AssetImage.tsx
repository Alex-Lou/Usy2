import { useEffect, useState } from "react";
import { useInView } from "../hooks/useInView";
import { getAssetUrl } from "../lib/api/blobCache";

// Loads a protected image (authenticated fetch -> object URL) only once it
// comes near the screen, through the shared cache (see blobCache.ts).
export function AssetImage({ assetId, className }: { assetId: number; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!inView || src) return;
    let cancelled = false;
    getAssetUrl(assetId)
      .then((url) => !cancelled && setSrc(url))
      .catch(() => {
        /* leave placeholder */
      });
    return () => {
      cancelled = true;
    };
  }, [assetId, inView, src]);

  if (!src) return <div ref={ref} className={`animate-pulse bg-border ${className ?? ""}`} />;
  return <img src={src} alt="" decoding="async" className={className} />;
}
