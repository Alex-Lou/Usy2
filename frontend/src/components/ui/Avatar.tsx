import type { Framing } from "../../lib/framing";
import { AssetImage } from "../AssetImage";

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

/** Identity avatar: the profile photo when there is one, else a gradient with initials. */
export function Avatar({
  name,
  size = 40,
  className = "",
  assetId,
  framing,
}: {
  name: string;
  size?: number;
  className?: string;
  assetId?: number | null;
  /** Which part of the photo shows in the circle (null: centred). */
  framing?: Framing | null;
}) {
  const h = hash(name || "?");
  const hue1 = h % 360;
  const hue2 = (hue1 + 60) % 360;

  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      {assetId ? (
        <span className="block h-full w-full overflow-hidden rounded-full">
          <AssetImage assetId={assetId} framing={framing} className="h-full w-full rounded-full object-cover" />
        </span>
      ) : (
        <span
          className="grid h-full w-full place-items-center rounded-full font-display font-semibold text-white"
          style={{
            fontSize: size * 0.4,
            backgroundImage: `linear-gradient(135deg, hsl(${hue1} 80% 60%), hsl(${hue2} 75% 50%))`,
            boxShadow: "inset 0 0 0 1px var(--avatar-ring)",
          }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}
