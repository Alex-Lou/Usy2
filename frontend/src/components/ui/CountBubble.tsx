/** A small red bubble with a count, over the corner of an icon (hidden at 0). */
export function CountBubble({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white ring-2 ring-bg animate-pop"
      aria-label={label}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
