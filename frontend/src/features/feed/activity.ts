/** Feed activity broadcast by the server on /topic/feed (see FeedActivity.java). */
export interface FeedActivity {
  kind: "post" | "comment" | "reaction";
  actorId: number;
  actorName: string;
  postId: number;
  postAuthorId: number;
  emoji: string | null;
}

// Tiny in-app bus: the app-wide notification socket re-emits the partner's feed
// activity so pages (e.g. the feed) can react without opening another socket.
const EVENT = "memocat:feed-activity";

export function emitFeedActivity(activity: FeedActivity): void {
  window.dispatchEvent(new CustomEvent<FeedActivity>(EVENT, { detail: activity }));
}

export function onFeedActivity(listener: (activity: FeedActivity) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<FeedActivity>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
