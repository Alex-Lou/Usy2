import { useEffect } from "react";
import { SPECIES, type Species } from "../../app/companion";
import type { Framing } from "../../lib/framing";
import { AssetImage } from "../AssetImage";
import { Animal } from "./animals";

// Deterministic gradient avatar from a name (initials + hashed hue pair).
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function asSpecies(value?: string | null): Species | null {
  return value && (SPECIES as readonly string[]).includes(value) ? (value as Species) : null;
}

/**
 * Identity avatar: profile photo when available, else the chosen companion
 * animal, else a gradient with initials. When a photo is shown, the companion
 * appears as a small badge so the chosen animal is visible everywhere.
 */
// The companion badges' "hello": one shared beat for the whole page. Every 15 s
// (first one soon after they appear) the page gets the `mc-hello` class for 2 s,
// and each badge plays its little scene once (styles/companions.css). Between
// beats nothing runs, however many avatars are on screen.
const HELLO_EVERY_MS = 15_000;
const HELLO_FOR_MS = 2_000;
let badgesOnScreen = 0;
let beat: number | undefined;
let firstHello: number | undefined;

function hello() {
  if (document.hidden) return;
  const root = document.documentElement;
  root.classList.add("mc-hello");
  window.setTimeout(() => root.classList.remove("mc-hello"), HELLO_FOR_MS);
}

function useHelloBeat(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (badgesOnScreen++ === 0) {
      firstHello = window.setTimeout(hello, 4_000);
      beat = window.setInterval(hello, HELLO_EVERY_MS);
    }
    return () => {
      if (--badgesOnScreen === 0) {
        window.clearTimeout(firstHello);
        window.clearInterval(beat);
      }
    };
  }, [active]);
}

export function Avatar({
  name,
  size = 40,
  className = "",
  assetId,
  species,
  framing,
}: {
  name: string;
  size?: number;
  className?: string;
  assetId?: number | null;
  species?: string | null;
  /** Which part of the photo shows in the circle (null: centred). */
  framing?: Framing | null;
}) {
  const animal = asSpecies(species);
  useHelloBeat(!!animal && !!assetId);
  const h = hash(name || "?");
  const hue1 = h % 360;
  const hue2 = (hue1 + 60) % 360;

  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      {assetId ? (
        <span className="block h-full w-full overflow-hidden rounded-full">
          <AssetImage assetId={assetId} framing={framing} className="h-full w-full rounded-full object-cover" />
        </span>
      ) : animal ? (
        <span className="grid h-full w-full place-items-center rounded-full bg-surface-2" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,.15)" }}>
          <Animal species={animal} size={Math.round(size * 0.86)} />
        </span>
      ) : (
        <span
          className="grid h-full w-full place-items-center rounded-full font-display font-semibold text-white"
          style={{
            fontSize: size * 0.4,
            backgroundImage: `linear-gradient(135deg, hsl(${hue1} 80% 60%), hsl(${hue2} 75% 50%))`,
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,.25)",
          }}
        >
          {initials(name)}
        </span>
      )}

      {/* Companion badge — only when a photo is shown (otherwise the avatar IS the animal). */}
      {animal && assetId && (
        <span
          className="absolute -bottom-0.5 -right-0.5 grid place-items-center"
          style={{ width: Math.round(size * 0.42), height: Math.round(size * 0.42) }}
        >
          <Animal species={animal} size={Math.round(size * 0.42)} still={false} className="mc-badge-face" />
        </span>
      )}
    </span>
  );
}
