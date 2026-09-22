// A short, self-contained confetti burst. Purely decorative; renders 40 pieces
// that fall + spin once (see .animate-confetti in global.css) then disappear.
const COLORS = ["#ff86b8", "#ffb0d6", "#e6b354", "#86c96b", "#7aa2ff", "#c58bff"];

const PIECES = Array.from({ length: 40 }, (_, i) => ({
  left: (i * 97) % 100, // spread across the width, deterministic
  color: COLORS[i % COLORS.length],
  delay: (i % 10) * 0.08,
  size: 6 + (i % 4) * 2,
}));

export function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="animate-confetti absolute top-0 block rounded-[2px]"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
