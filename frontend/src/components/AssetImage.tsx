import { useEffect, useState } from "react";
import { fetchBlobUrl } from "../lib/api/client";

// Loads a protected image via authenticated fetch -> object URL.
export function AssetImage({ assetId, className }: { assetId: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    fetchBlobUrl(`/api/assets/${assetId}`)
      .then((u) => {
        url = u;
        if (!cancelled) setSrc(u);
      })
      .catch(() => {
        /* leave placeholder */
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [assetId]);

  if (!src) {
    return <div className={`animate-pulse bg-border ${className ?? ""}`} />;
  }
  return <img src={src} alt="" className={className} />;
}
