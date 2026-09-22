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

export function Avatar({
  name,
  size = 40,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const h = hash(name || "?");
  const hue1 = h % 360;
  const hue2 = (hue1 + 60) % 360;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        backgroundImage: `linear-gradient(135deg, hsl(${hue1} 80% 60%), hsl(${hue2} 75% 50%))`,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.25)",
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
