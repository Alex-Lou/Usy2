import type { Widget } from "../types";

// Renders a single widget. Text is rendered as text nodes (React escapes it),
// so stored content can never inject markup.
export function WidgetRenderer({ widget }: { widget: Widget }) {
  switch (widget.type) {
    case "marquee":
      return (
        <div className="mc-marquee rounded-token border border-border bg-surface py-2 text-primary">
          <span className="mc-marquee__inner font-semibold">{widget.text}</span>
        </div>
      );
    case "quote":
      return (
        <blockquote className="rounded-token border-l-4 border-primary bg-surface px-4 py-3 italic text-text">
          “{widget.text}”
        </blockquote>
      );
    case "mood":
      return (
        <div className="flex items-center gap-2 rounded-token border border-border bg-surface px-4 py-3">
          <span className="text-2xl">{widget.emoji}</span>
          {widget.label && <span className="text-text-muted">Humeur : {widget.label}</span>}
        </div>
      );
    default:
      return null;
  }
}
