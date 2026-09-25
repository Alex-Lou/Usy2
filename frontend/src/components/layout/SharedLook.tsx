import { useEffect } from "react";
import { BACKGROUNDS, useSharedAppearance } from "../../features/couple/appearance";
import { AssetImage } from "../AssetImage";

/** Readable text on a colour: dark on light accents, white on dark ones. */
function onColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 160 ? "#12071a" : "#ffffff";
}

/**
 * The shared look of the app (chosen by the two of us): the accent colour for
 * buttons, links and highlights, and the background behind everything.
 * Renders the background layer; without a shared background, the app's own
 * aurora stays.
 */
export function SharedLook() {
  const { accent, background, backgroundAssetId } = useSharedAppearance();

  useEffect(() => {
    if (!accent) return;
    const root = document.documentElement.style;
    root.setProperty("--color-primary", accent);
    root.setProperty("--color-primary-foreground", onColor(accent));
    root.setProperty("--grad", `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 55%, #22d3ee) 100%)`);
    return () => ["--color-primary", "--color-primary-foreground", "--grad"].forEach((v) => root.removeProperty(v));
  }, [accent]);

  const preset = BACKGROUNDS.find((b) => b.id === background);
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {background === "photo" && backgroundAssetId ? (
        <>
          <AssetImage assetId={backgroundAssetId} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-bg/70" />
        </>
      ) : preset ? (
        <>
          <div className="absolute inset-0" style={{ background: preset.css }} />
          <div className="absolute inset-0 bg-bg/55" />
        </>
      ) : (
        <>
          {/* Decorative aurora (à fond) — purely visual, behind everything. */}
          <div
            className="absolute -left-24 -top-24 h-80 w-80 rounded-full opacity-40 blur-3xl"
            style={{ background: "var(--grad)", animation: "float-slow 12s ease-in-out infinite" }}
          />
          <div
            className="absolute -right-20 top-1/3 h-72 w-72 rounded-full opacity-25 blur-3xl"
            style={{ background: "var(--grad)", animation: "float-slow 16s ease-in-out infinite reverse" }}
          />
        </>
      )}
    </div>
  );
}
