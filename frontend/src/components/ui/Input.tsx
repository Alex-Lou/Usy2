import type { InputHTMLAttributes } from "react";

// Reusable text input. Styling is token-driven only.
export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={
        "w-full rounded-token border border-border bg-surface px-3 py-2 text-text " +
        "outline-none focus:border-primary " +
        className
      }
      {...props}
    />
  );
}
