import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ScreenEffectId } from "./looks";

const DURATION_MS = 5200; // the longest particle's delay + duration, then the overlay goes

// Scattered but fixed columns (no jumping between renders).
const COLUMNS = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 6.3 + (i % 3) * 2.1) % 96,
  delay: (i * 0.37) % 1.6,
  duration: 2.6 + (i % 4) * 0.4,
  size: 30 + (i % 3) * 10,
}));
const CONFETTI_COLORS = ["#ff4f7b", "#ffd45e", "#7cc6e8", "#9fe0a4", "#b18cff"];
const BURSTS = [
  { left: 22, top: 26, delay: 0, color: "#ffd45e" },
  { left: 72, top: 18, delay: 0.5, color: "#ff4f7b" },
  { left: 48, top: 48, delay: 1.1, color: "#7cc6e8" },
  { left: 80, top: 58, delay: 1.6, color: "#b18cff" },
  { left: 28, top: 66, delay: 2.1, color: "#9fe0a4" },
];
const PARTICLES: Partial<Record<ScreenEffectId, { chars: string[]; motion: "fall" | "rise" }>> = {
  hearts: { chars: ["💕", "❤️", "💖", "💗"], motion: "rise" },
  balloons: { chars: ["🎈", "🎈", "🎀"], motion: "rise" },
  stars: { chars: ["✨", "⭐", "🌟"], motion: "fall" },
  kisses: { chars: ["💋", "😘", "💋"], motion: "fall" },
};

/**
 * A message's full-screen effect, played once over the page (clicks go
 * through), then gone. Pure CSS, reusing the photo effects' animations;
 * nothing shows for reduced motion.
 */
export function ScreenEffect({ effect, onDone }: { effect: ScreenEffectId; onDone: () => void }) {
  // The latest onDone, without restarting the timer when the page re-renders.
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = window.setTimeout(() => done.current(), DURATION_MS);
    return () => window.clearTimeout(t);
  }, [effect]);

  const particle = PARTICLES[effect];
  return createPortal(
    <div data-screen-effect={effect} className="mc-screen-fx pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
      {particle &&
        COLUMNS.map((c, i) => (
          <span
            key={i}
            className={`fx-col fx-col--${particle.motion}`}
            style={{ left: `${c.left}%`, fontSize: c.size, animationDelay: `${c.delay}s`, animationDuration: `${c.duration}s` }}
          >
            <span className="mc-emoji block">{particle.chars[i % particle.chars.length]}</span>
          </span>
        ))}
      {effect === "confetti" &&
        COLUMNS.concat(COLUMNS.map((c) => ({ ...c, left: (c.left + 3) % 96, delay: c.delay + 0.6 }))).map((c, i) => (
          <span key={i} className="fx-col fx-col--fall" style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.duration}s` }}>
            <span className="fx-confetti block" style={{ width: 11, height: 16, background: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }} />
          </span>
        ))}
      {effect === "fireworks" &&
        BURSTS.map((b, i) => (
          <span key={i} className="absolute" style={{ left: `${b.left}%`, top: `${b.top}%`, transform: "scale(3)" }}>
            <span className="fx-burst" style={{ color: b.color, animationDelay: `${b.delay}s` }} />
          </span>
        ))}
    </div>,
    document.body,
  );
}
