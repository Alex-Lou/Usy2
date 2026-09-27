import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { useInView } from "../../hooks/useInView";
import { getAssetUrl } from "../../lib/api/blobCache";
import type { Asset } from "../../lib/api/assets";
import { formatDuration } from "./useVoiceRecorder";

/**
 * A voice message bubble: play/pause, progress and duration. The file is
 * fetched (authenticated) once the bubble comes near the screen. Starting one
 * voice message pauses any other.
 */
export function VoiceNote({ asset, mine }: { asset: Asset; mine: boolean }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState(false);
  const probing = useRef(false);

  useEffect(() => {
    if (!inView || src) return;
    let cancelled = false;
    getAssetUrl(asset.id)
      .then((url) => !cancelled && setSrc(url))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [asset.id, inView, src]);

  // Browser recordings (WebM) carry no duration: seeking far forward makes the
  // browser compute it, then we rewind.
  function onMetadata() {
    const a = audioRef.current;
    if (!a) return;
    if (Number.isFinite(a.duration)) setDuration(a.duration);
    else {
      probing.current = true;
      a.currentTime = 1e7;
    }
  }

  function onDurationChange() {
    const a = audioRef.current;
    if (!a || !probing.current || !Number.isFinite(a.duration)) return;
    probing.current = false;
    setDuration(a.duration);
    a.currentTime = 0;
  }

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (!a.paused) {
      a.pause();
      return;
    }
    document.querySelectorAll("audio").forEach((other) => other !== a && other.pause());
    a.play().catch(() => setError(true));
  }

  const progress = duration ? Math.min(1, current / duration) : 0;

  return (
    <div
      ref={ref}
      className={
        "flex w-60 max-w-full items-center gap-3 rounded-token px-3 py-2.5 " +
        (mine ? "btn-brand" : "border border-border bg-surface-2")
      }
    >
      <button
        type="button"
        onClick={toggle}
        disabled={!src || error}
        aria-label={playing ? "Mettre en pause" : "Écouter le message vocal"}
        className={
          "grid h-10 w-10 shrink-0 place-items-center rounded-full press disabled:opacity-50 " +
          (mine ? "bg-white/25" : "bg-primary text-white")
        }
      >
        <Icon name={playing ? "pause" : "play"} size={18} />
      </button>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className={"block h-1.5 overflow-hidden rounded-full " + (mine ? "bg-white/30" : "bg-border")}>
          <span
            className={"block h-full rounded-full " + (mine ? "bg-white" : "bg-primary")}
            style={{ width: `${progress * 100}%` }}
          />
        </span>
        <span className={"text-xs tabular-nums " + (mine ? "opacity-90" : "text-text-muted")}>
          {error ? "Lecture impossible" : `🎤 ${formatDuration(playing || current > 0 ? current : duration ?? 0)}`}
        </span>
      </span>
      {src && (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onLoadedMetadata={onMetadata}
          onDurationChange={onDurationChange}
          onTimeUpdate={(e) => !probing.current && setCurrent(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setCurrent(0);
          }}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}
