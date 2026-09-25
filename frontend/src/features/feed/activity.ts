/** Feed activity broadcast by the server on /topic/feed (see FeedActivity.java). */
export interface FeedActivity {
  kind: "post" | "comment" | "reaction";
  actorId: number;
  actorName: string;
  postId: number;
  postAuthorId: number;
  emoji: string | null;
}

/**
 * The other person reacted to one of my chat messages or comments, broadcast
 * on /topic/reactions (see ReactionAdded.java). refId: message or comment id.
 */
export interface ReactionAdded {
  target: "message" | "comment";
  actorId: number;
  actorName: string;
  ownerId: number;
  emoji: string;
  refId: number;
  postId: number | null;
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

/** A comment's reactions changed (broadcast on /topic/comment-reactions). */
export interface CommentReactionsChange {
  commentId: number;
  reactions: { userId: number; emoji: string }[];
}

const REACTIONS_EVENT = "memocat:comment-reactions";

export function emitCommentReactions(change: CommentReactionsChange): void {
  window.dispatchEvent(new CustomEvent<CommentReactionsChange>(REACTIONS_EVENT, { detail: change }));
}

export function onCommentReactions(listener: (change: CommentReactionsChange) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<CommentReactionsChange>).detail);
  window.addEventListener(REACTIONS_EVENT, handler);
  return () => window.removeEventListener(REACTIONS_EVENT, handler);
}
