import { SPECIES, type Species } from "../../../app/companion";
import { Animal } from "../../../components/ui/animals";

function isSpecies(variant: string): variant is Species {
  return (SPECIES as readonly string[]).includes(variant);
}

function Decor({ variant }: { variant: string }) {
  if (variant === "heart") {
    return (
      <svg width="64" height="64" viewBox="0 0 24 24" className="mc-heartbeat text-primary" aria-hidden="true">
        <path
          fill="currentColor"
          d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"
        />
      </svg>
    );
  }
  // stars / sparkle
  return (
    <svg width="72" height="64" viewBox="0 0 72 64" className="text-primary" aria-hidden="true">
      <g fill="currentColor">
        <path className="mc-twinkle" d="M20 14l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
        <path className="mc-twinkle" style={{ animationDelay: "0.6s" }} d="M48 8l1.6 4 4 1.6-4 1.6L48 19l-1.6-4-4-1.6 4-1.6z" />
        <path className="mc-twinkle" style={{ animationDelay: "1.1s" }} d="M40 34l2.2 5.5L48 42l-5.8 2.5L40 50l-2.2-5.5L32 42l5.8-2.5z" />
      </g>
    </svg>
  );
}

// Animated decorative SVG: a beating heart, twinkling stars, or a chibi animal.
export function SvgWidget({ variant, label }: { variant: string; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-token border border-border bg-surface px-4 py-4">
      {isSpecies(variant) ? (
        <div className="mc-float">
          <Animal species={variant} size={72} />
        </div>
      ) : (
        <Decor variant={variant} />
      )}
      {label && <span className="text-sm text-text-muted">{label}</span>}
    </div>
  );
}
