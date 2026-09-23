import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { MessageReaction } from "./types";

const HOLD_MS = 450;
const MOVE_TOLERANCE = 10; // px: more than this is a scroll, not a press

/**
 * Wraps a message: a long press (or right-click on a computer) opens the
 * reaction bar; the click that ends a long press is swallowed, so a photo
 * does not also open in full screen.
 */
export function LongPress({ onLongPress, children }: { onLongPress: (anchor: DOMRect) => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const cancel = () => {
    window.clearTimeout(timer.current);
    start.current = null;
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  function fire() {
    fired.current = true;
    navigator.vibrate?.(10);
    if (ref.current) onLongPress(ref.current.getBoundingClientRect());
  }

  return (
    <div
      ref={ref}
      className="[-webkit-touch-callout:none] select-none"
      onPointerDown={(e: PointerEvent) => {
        if (e.button !== 0) return;
        fired.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        timer.current = window.setTimeout(fire, HOLD_MS);
      }}
      onPointerMove={(e: PointerEvent) => {
        const s = start.current;
        if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > MOVE_TOLERANCE) cancel();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e: MouseEvent) => {
        e.preventDefault();
        cancel();
        fire();
      }}
      onClickCapture={(e: MouseEvent) => {
        if (!fired.current) return;
        fired.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {children}
    </div>
  );
}

/** The emoji bar shown above (or below) the pressed message, plus "Copier" for text. */
export function ReactionBar({
  anchor,
  mine,
  emojis,
  current,
  copyText,
  onPick,
  onClose,
}: {
  anchor: DOMRect;
  mine: boolean;
  emojis: string[];
  current: string | null;
  copyText: string | null;
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const openedAt = useRef(Date.now());
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const barH = 52;
  const width = Math.min(window.innerWidth - 16, emojis.length * 44 + (copyText ? 64 : 0) + 16);
  const above = anchor.top - barH - 8 > 72; // keep clear of the top bar
  const top = above ? anchor.top - barH - 8 : Math.min(window.innerHeight - barH - 8, anchor.bottom + 8);
  const left = Math.max(8, Math.min(window.innerWidth - width - 8, mine ? anchor.right - width : anchor.left));

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      // The finger that opened the bar is lifted right after: that release is not a "tap outside".
      onClick={() => Date.now() - openedAt.current > 400 && onClose()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        role="dialog"
        aria-label="Réagir au message"
        onClick={(e) => e.stopPropagation()}
        className="absolute flex items-center gap-0.5 rounded-full border border-border bg-surface px-2 shadow-lg animate-pop"
        style={{ top, left, width, height: barH }}
      >
        {emojis.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onPick(e)}
            aria-label={`Réagir ${e}`}
            aria-pressed={current === e}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-2xl leading-none press ${current === e ? "bg-primary/20" : "hover:bg-surface-2"}`}
          >
            {e}
          </button>
        ))}
        {copyText && (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(copyText).then(() => setCopied(true)).catch(() => {});
              window.setTimeout(onClose, 500);
            }}
            className="ml-auto shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-text-muted press hover:text-text"
          >
            {copied ? "Copié" : "Copier"}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** The emojis under a message, WhatsApp style (a count when both chose the same). */
export function ReactionPills({ reactions, myId, onOpen }: { reactions: MessageReaction[]; myId: number | undefined; onOpen: () => void }) {
  if (reactions.length === 0) return null;
  const counts = new Map<string, number>();
  for (const r of reactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
  const minePicked = reactions.some((r) => r.userId === myId);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Réactions : ${reactions.map((r) => r.emoji).join(" ")}`}
      className={`-mt-2 flex items-center gap-0.5 rounded-full border bg-surface px-1.5 py-0.5 text-sm leading-none shadow-sm press ${minePicked ? "border-primary/50" : "border-border"}`}
    >
      {[...counts].map(([emoji, n]) => (
        <span key={emoji} className="flex items-center">
          {emoji}
          {n > 1 && <span className="ml-0.5 text-[10px] font-semibold text-text-muted">{n}</span>}
        </span>
      ))}
    </button>
  );
}
