import type { Widget } from "../types";
import { CalendarWidget } from "./CalendarWidget";
import { ClockWidget } from "./ClockWidget";
import { CountdownWidget } from "./CountdownWidget";
import { ImageWidget } from "./ImageWidget";
import { MoodWidget } from "./MoodWidget";
import { MusicWidget } from "./MusicWidget";
import { PinsWidget } from "./PinsWidget";
import { RichText } from "./RichText";
import { SvgWidget } from "./SvgWidget";

// Renders a single widget. Plain text is rendered as text nodes (React escapes
// it) and richtext via a safe whitelist — stored content can never inject HTML.
// `ownerId` is the profile's user: the mood widget shows their live mood.
export function WidgetRenderer({ widget, ownerId }: { widget: Widget; ownerId?: number }) {
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
      return <MoodWidget ownerId={ownerId} />;
    case "clock":
      return <ClockWidget label={widget.label} />;
    case "countdown":
      return <CountdownWidget date={widget.date} label={widget.label} />;
    case "calendar":
      return <CalendarWidget label={widget.label} />;
    case "music":
      return <MusicWidget label={widget.label} />;
    case "image":
      return <ImageWidget assetId={widget.assetId} label={widget.label} />;
    case "svg":
      return <SvgWidget variant={widget.variant} label={widget.label} />;
    case "pins":
      return <PinsWidget pins={widget.pins} label={widget.label} />;
    default:
      return null;
  }
}
