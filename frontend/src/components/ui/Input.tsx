import type { InputHTMLAttributes } from "react";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={
        "w-full rounded-token border border-border bg-bg-2/60 px-3.5 py-2.5 text-text " +
        "placeholder:text-text-muted outline-none transition focus:border-primary/70 " +
        "focus:ring-2 focus:ring-primary/25 " +
        className
      }
      {...props}
    />
  );
}
