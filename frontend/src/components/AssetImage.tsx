import { useEffect, useState } from "react";
import { useInView } from "../hooks/useInView";
import { getAssetUrl } from "../lib/api/blobCache";
import { framingStyle, type Framing } from "../lib/framing";

// Loads a protected image (authenticated fetch -> object URL) only once it
// comes near the screen, through the shared cache (see blobCache.ts).
// `framing`: which part shows in the frame (the parent must clip: overflow-hidden).
export function AssetImage({ assetId, className, framing }: { assetId: number; className?: string; framing?: Framing | null }) {
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
  return <img src={src} alt="" decoding="async" className={className} style={framingStyle(framing)} />;
}
