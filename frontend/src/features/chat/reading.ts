import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../../lib/api/client";
import { fontStack, loadFont } from "../../lib/fonts";
import type { FontKey } from "../profile/types";

/** How I read the messages (my screens only; see ReadingService.java). */
export interface Reading {
  font: FontKey | null; // null = the app's font
  size: ReadingSize | null; // null = "m"
}

export type ReadingSize = "s" | "m" | "l" | "xl";

export const READING_SIZES: { id: ReadingSize; label: string; px: number }[] = [
  { id: "s", label: "Petit", px: 14 },
  { id: "m", label: "Normal", px: 16 },
  { id: "l", label: "Grand", px: 18 },
  { id: "xl", label: "Très grand", px: 21 },
];

const CACHE = "memocat.reading"; // this device's copy, so the chat opens in the right font at once

function cached(): Reading {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE) ?? "null") as Reading | null;
    return v && typeof v === "object" ? { font: v.font ?? null, size: v.size ?? null } : { font: null, size: null };
  } catch {
    return { font: null, size: null };
  }
}

function remember(r: Reading): void {
  try {
    localStorage.setItem(CACHE, JSON.stringify(r));
  } catch {
    /* private mode: the server copy still applies */
  }
}

/** CSS for the message list: the chosen font and size. */
export function readingStyle(r: Reading): React.CSSProperties {
  const px = READING_SIZES.find((s) => s.id === (r.size ?? "m"))?.px ?? 16;
  return { fontFamily: fontStack(r.font) ?? undefined, fontSize: px };
}

/** My reading settings: the server's copy (every device), saved at once when changed. */
export function useReading() {
  const [reading, setReading] = useState<Reading>(cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<Reading>("/api/me/reading")
      .then((r) => {
        setReading(r);
        remember(r);
      })
      .catch(() => {});
  }, []);

  useEffect(() => loadFont(reading.font), [reading.font]);

  const current = useRef(reading);
  current.current = reading;

  const save = useCallback((next: Reading) => {
    const prev = current.current;
    setReading(next); // at once, then confirmed by the server
    setError(null);
    apiRequest<Reading>("/api/me/reading", { method: "PUT", body: next })
      .then((r) => remember(r))
      .catch(() => {
        setError("Réglage non enregistré, réessaie.");
        setReading(prev);
      });
  }, []);

  return { reading, save, error };
}
