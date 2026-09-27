export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-token bg-surface-2 ${className}`}>
      <div
        className="absolute inset-0 -translate-x-full"
        style={{
          animation: "shimmer 1.4s infinite",
          backgroundImage:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-text) 8%, transparent), transparent)",
        }}
      />
    </div>
  );
}
