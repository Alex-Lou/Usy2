import { useEffect } from "react";
import { BACKGROUNDS, useSharedAppearance } from "../../features/couple/appearance";
import { AssetImage } from "../AssetImage";

/** Readable text on a colour: dark on light accents, white on dark ones. */
export function onColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 160 ? "var(--color-on-light)" : "var(--color-on-accent)";
}

/**
 * The shared look of the app (chosen by the two of us): the accent colour for
 * buttons, links and highlights, and the background behind everything.
 * Renders the background layer; without a shared background, the app's own
 * plain background shows.
 */
export function SharedLook() {
  const { accent, background, backgroundAssetId } = useSharedAppearance();

  useEffect(() => {
    if (!accent) return;
    const root = document.documentElement.style;
    root.setProperty("--color-primary", accent);
    root.setProperty("--color-primary-foreground", onColor(accent));
    root.setProperty("--grad", `linear-gradient(${accent}, ${accent})`); // flat, like the app's own accent
    return () => ["--color-primary", "--color-primary-foreground", "--grad"].forEach((v) => root.removeProperty(v));
  }, [accent]);

  const preset = BACKGROUNDS.find((b) => b.id === background);
  const hasBackground = !!preset || (background === "photo" && !!backgroundAssetId);
  // Tells the glass cards a background shows (see glass.css).
  useEffect(() => {
    if (!hasBackground) return;
    document.documentElement.dataset.sharedBg = "";
    return () => {
      delete document.documentElement.dataset.sharedBg;
    };
  }, [hasBackground]);

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
      ) : null}
    </div>
  );
}
