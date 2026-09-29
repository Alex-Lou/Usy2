import type { ReactNode } from "react";

/**
 * The top of a page, the same everywhere: a title, an optional one-line
 * subtitle and, on the right, the page's action. `leading` sits before the
 * title (e.g. a companion).
 */
export function PageHeader({
  title,
  subtitle,
  action,
  leading,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-3">
      {leading}
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-2xl font-bold leading-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
