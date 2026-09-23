// Small decorative marks shared by profile widgets and chat/comment stickers.
// Colored with currentColor (token-driven via text-primary by default).

export function HeartMark({ size = 64, beating = true, className = "text-primary" }: { size?: number; beating?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`${beating ? "mc-heartbeat " : ""}${className}`} aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"
      />
    </svg>
  );
}

export function SparkleMarks({ size = 64, className = "text-primary" }: { size?: number; className?: string }) {
  return (
    <svg width={size * 1.125} height={size} viewBox="0 0 72 64" className={className} aria-hidden="true">
      <g fill="currentColor">
        <path className="mc-twinkle" d="M20 14l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
        <path className="mc-twinkle" style={{ animationDelay: "0.6s" }} d="M48 8l1.6 4 4 1.6-4 1.6L48 19l-1.6-4-4-1.6 4-1.6z" />
        <path className="mc-twinkle" style={{ animationDelay: "1.1s" }} d="M40 34l2.2 5.5L48 42l-5.8 2.5L40 50l-2.2-5.5L32 42l5.8-2.5z" />
      </g>
    </svg>
  );
}
