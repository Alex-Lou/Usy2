import type { ButtonHTMLAttributes } from "react";

type Variant = "brand" | "ghost" | "surface";

const VARIANTS: Record<Variant, string> = {
  brand: "btn-brand hover:brightness-110",
  surface: "bg-surface-2 text-text border border-border hover:border-primary/50",
  ghost: "text-text hover:bg-surface-2",
};

export function Button({
  className = "",
  variant = "brand",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={
        "inline-flex items-center justify-center gap-2 rounded-token px-4 py-2.5 font-semibold press " +
        "transition disabled:cursor-not-allowed disabled:opacity-50 " +
        VARIANTS[variant] +
        " " +
        className
      }
      {...props}
    />
  );
}
