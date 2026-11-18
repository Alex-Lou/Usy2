import type { SVGProps } from "react";

/** The few line icons Messages needs beyond the shared set (same stroke style). */
const PATHS = {
  reply: "M10 8 4 13l6 5M4 13h11a5 5 0 0 1 5 5",
  edit: "M4 20h4L19 9l-4-4L4 16z",
} as const;

export function MsgIcon({ name, size = 20, ...rest }: { name: keyof typeof PATHS; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={PATHS[name]} />
    </svg>
  );
}
