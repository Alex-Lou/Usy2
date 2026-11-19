// Empty state: a title and a hint.
export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-10 text-center">
      <p className="font-display text-xl font-bold">{title}</p>
      {subtitle && <p className="text-text-muted">{subtitle}</p>}
    </div>
  );
}

// Loading state: a quiet spinner.
export function Loader({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-12 text-text-muted">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
