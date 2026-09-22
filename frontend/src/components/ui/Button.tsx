import type { ButtonHTMLAttributes } from "react";

// Reusable button. Colors come from tokens via Tailwind semantic names.
export function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={
        "rounded-token bg-primary px-4 py-2 font-semibold text-primary-foreground " +
        "transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 " +
        className
      }
      {...props}
    />
  );
}
