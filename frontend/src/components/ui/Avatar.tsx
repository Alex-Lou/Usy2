import type { Framing } from "../../lib/framing";
import { AssetImage } from "../AssetImage";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Identity avatar: the profile photo when there is one, else the initials on a quiet disc. */
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
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      {assetId ? (
        <span className="block h-full w-full overflow-hidden rounded-full">
          <AssetImage assetId={assetId} framing={framing} className="h-full w-full rounded-full object-cover" />
        </span>
      ) : (
        <span
          className="grid h-full w-full place-items-center rounded-full bg-surface-2 font-semibold text-text"
          style={{ fontSize: size * 0.38, boxShadow: "inset 0 0 0 1px var(--color-border)" }}
        >
          {initials(name)}
        </span>
      )}
    </span>
  );
}
