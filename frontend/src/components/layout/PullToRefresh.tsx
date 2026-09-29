import { useEffect, useRef, useState } from "react";
import { feel } from "../../lib/feel";
import { Animal } from "../ui/animals";

const TRIGGER = 70; // px of pull (after damping) that reloads
const MAX = 110;

/** Somewhere a downward drag belongs to something else: an open sheet, an editor, a scrolled list. */
function busyTarget(target: EventTarget | null): boolean {
  let el = target instanceof Element ? target : null;
  if (el?.closest('[role="dialog"], .touch-none, [data-no-pull]')) return true;
  for (; el && el !== document.body; el = el.parentElement) {
    if (el.scrollTop > 0) return true; // a list scrolled down: the finger scrolls it back up
  }
  return false;
}

/**
 * Pull the page down from its top to reload the app (phones): Moka comes down
 * with the finger, turns as it passes the mark, and the app reloads with the
 * latest of everything (and the latest version). Scrolling stays native.
 */
export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [reloading, setReloading] = useState(false);
  const start = useRef<number | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      start.current = window.scrollY <= 0 && e.touches.length === 1 && !busyTarget(e.target) ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current === null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || window.scrollY > 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      pullRef.current = Math.min(MAX, dy * 0.5); // resists a little, like a spring
      setPull(pullRef.current);
    };
    const onEnd = () => {
      if (start.current === null) return;
      start.current = null;
      if (pullRef.current >= TRIGGER) {
        setReloading(true);
        feel.tap();
        window.setTimeout(() => window.location.reload(), 350);
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  if (pull === 0 && !reloading) return null;
  const ready = reloading || pull >= TRIGGER;
  const y = reloading ? TRIGGER : pull;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[var(--topbar-h)] z-[45] flex justify-center lg:hidden"
      style={{ transform: `translateY(${y - 44}px)`, transition: pull === 0 || reloading ? "transform 0.2s ease-out" : undefined }}
      role="status"
      aria-live="polite"
    >
      <span
        className={"grid h-11 w-11 place-items-center rounded-full border bg-surface shadow-card " + (ready ? "border-primary" : "border-border")}
        style={{ transform: reloading ? undefined : `rotate(${pull * 3}deg)`, opacity: Math.min(1, pull / 40 + (reloading ? 1 : 0)) }}
      >
        <span className={reloading ? "grid animate-spin place-items-center" : "grid place-items-center"}>
          <Animal species="cat" size={30} still />
        </span>
      </span>
      <span className="sr-only">{reloading ? "Actualisation…" : ready ? "Relâche pour actualiser" : "Tire pour actualiser"}</span>
    </div>
  );
}
