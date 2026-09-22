import type { Widget } from "../types";
import { ClockWidget } from "./ClockWidget";
import { CountdownWidget } from "./CountdownWidget";
import { ImageWidget } from "./ImageWidget";
import { RichText } from "./RichText";
import { SvgWidget } from "./SvgWidget";

// Renders a single widget. Plain text is rendered as text nodes (React escapes
// it) and richtext via a safe whitelist — stored content can never inject HTML.
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
    case "richtext":
      return <RichText text={widget.text} />;
    case "mood":
      return (
        <div className="flex items-center gap-2 rounded-token border border-border bg-surface px-4 py-3">
          <span className="text-2xl">{widget.emoji}</span>
          {widget.label && <span className="text-text-muted">Humeur : {widget.label}</span>}
        </div>
      );
    case "clock":
      return <ClockWidget label={widget.label} />;
    case "countdown":
      return <CountdownWidget date={widget.date} label={widget.label} />;
    case "image":
      return <ImageWidget assetId={widget.assetId} label={widget.label} />;
    case "svg":
      return <SvgWidget variant={widget.variant} label={widget.label} />;
    default:
      return null;
  }
}
