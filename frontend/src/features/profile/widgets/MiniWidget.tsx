import { useEffect, useState } from "react";
import { SPECIES, type Species } from "../../../app/companion";
import { AssetImage } from "../../../components/AssetImage";
import { Animal } from "../../../components/ui/animals";
import { HeartMark, SparkleMarks } from "../../../components/ui/decor";
import { useCouple } from "../../couple/useCouple";
import type { Widget } from "../types";
import { domainOf, isWebAddress } from "./pinSuggestions";
import { SCENES } from "./scenes";

/** Text-like widgets take the whole row; the others are small square-ish tiles. */
export function isWideMini(widget: Widget): boolean {
  return ["marquee", "quote", "richtext", "pins"].includes(widget.type);
}

const TILE = "flex h-full min-h-16 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-2xl bg-surface-2/60 p-1.5 text-center";

/**
 * A widget shrunk for the side menu: soft, tiny, no heavy borders. Text is
 * rendered as text nodes (escaped); rich text shows as plain text here.
 */
export function MiniWidget({ widget, ownerId }: { widget: Widget; ownerId?: number }) {
  switch (widget.type) {
    case "marquee":
    case "quote":
    case "richtext":
      return (
        <p className="line-clamp-2 rounded-2xl bg-surface-2/60 px-3 py-2 text-[11px] italic leading-snug text-text-muted">
          “{plain(widget.text)}”
        </p>
      );
    case "mood":
      return <MiniMood ownerId={ownerId} />;
    case "clock":
      return <MiniClock label={widget.label} />;
    case "countdown":
      return <MiniCountdown date={widget.date} label={widget.label} />;
    case "image":
      return <AssetImage assetId={widget.assetId} className="aspect-square w-full rounded-2xl object-cover" />;
    case "svg":
      return <MiniScene variant={widget.variant} />;
    case "pins": {
      const safe = widget.pins.filter((p) => isWebAddress(p.url));
      if (safe.length === 0) return null;
      return (
        <div className="flex flex-wrap gap-1">
          {safe.slice(0, 6).map((pin, i) => (
            <a
              key={`${pin.url}-${i}`}
              href={pin.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="max-w-full truncate rounded-full bg-surface-2/70 px-2 py-0.5 text-[11px] text-text-muted press hover:text-primary"
            >
              📌 {pin.label || domainOf(pin.url)}
            </a>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}

/** Rich text markers (**, _, ~…) are dropped for the one-line preview. */
function plain(text: string): string {
  return text.replace(/[*_~`#>[\]]/g, "").trim();
}

function MiniScene({ variant }: { variant: string }) {
  const Scene = SCENES[variant];
  if (Scene) {
    return (
      <div className={TILE}>
        <div className="w-full [&_svg]:max-w-none">
          <Scene />
        </div>
      </div>
    );
  }
  return (
    <div className={TILE}>
      {(SPECIES as readonly string[]).includes(variant) ? (
        <Animal species={variant as Species} size={40} />
      ) : variant === "heart" ? (
        <HeartMark size={34} />
      ) : (
        <SparkleMarks size={34} />
      )}
    </div>
  );
}

/** One person's live mood; without an owner (shared widgets) both moods side by side. */
function MiniMood({ ownerId }: { ownerId?: number }) {
  const { couple } = useCouple();
  if (ownerId === undefined) {
    const moods = couple?.moods ?? [];
    return (
      <div className={TILE} title={moods.map((m) => m.label).filter(Boolean).join(" · ") || undefined}>
        <span className="text-2xl leading-none">{moods.length ? moods.map((m) => m.emoji).join(" ") : "…"}</span>
      </div>
    );
  }
  const mood = couple?.moods.find((m) => m.userId === ownerId);
  return (
    <div className={TILE} title={mood?.label ?? undefined}>
      <span className="text-2xl leading-none">{mood?.emoji ?? "…"}</span>
      {mood?.label && <span className="w-full truncate text-[10px] text-text-muted">{mood.label}</span>}
    </div>
  );
}

function MiniClock({ label }: { label?: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className={TILE}>
      <span className="font-display text-base font-bold tabular-nums text-text">
        {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
      </span>
      {label && <span className="w-full truncate text-[10px] text-text-muted">{label}</span>}
    </div>
  );
}

function MiniCountdown({ date, label }: { date: string; label?: string }) {
  const target = new Date(date).getTime();
  if (Number.isNaN(target)) return null;
  const days = Math.ceil((target - Date.now()) / 86_400_000); // same count as the "Nous" banner
  const past = days < 0;
  return (
    <div className={TILE}>
      <span className="font-display text-base font-bold text-primary tabular-nums">{past ? `${-days} j` : `J-${days}`}</span>
      <span className="w-full truncate text-[10px] text-text-muted">{label || (past ? "Depuis" : "Bientôt")}</span>
    </div>
  );
}
