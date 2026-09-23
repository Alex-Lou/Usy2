import type { CoupleActivity } from "./types";

// Same tiny bus as the feed: the app-wide notification socket re-emits "Nous"
// changes (from either person) so open views re-fetch without another socket.
const EVENT = "memocat:couple-activity";

export function emitCoupleActivity(activity: CoupleActivity): void {
  window.dispatchEvent(new CustomEvent<CoupleActivity>(EVENT, { detail: activity }));
}

export function onCoupleActivity(listener: (activity: CoupleActivity) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<CoupleActivity>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
