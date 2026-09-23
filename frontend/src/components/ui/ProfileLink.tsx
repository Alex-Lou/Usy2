import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** Wraps a name/avatar so a tap opens that person's profile, wherever it appears. */
export function ProfileLink({ userId, children, className = "" }: { userId: number; children: ReactNode; className?: string }) {
  return (
    <Link to={`/profile/${userId}`} onClick={(e) => e.stopPropagation()} className={`press ${className}`}>
      {children}
    </Link>
  );
}
