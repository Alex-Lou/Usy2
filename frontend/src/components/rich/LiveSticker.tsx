import type { ReactNode } from "react";
import { useInView } from "../../hooks/useInView";

/** Plays a sticker's animation only while it is on screen (paused otherwise). */
export function LiveSticker({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  return (
    <span ref={ref} className={`mc-live ${inView ? "" : "mc-paused"} ${className}`}>
      {children}
    </span>
  );
}
