import { Client, type IMessage } from "@stomp/stompjs";
import { getToken } from "../../lib/api/client";
import { wsUrl } from "../../lib/api/ws";
import type { Message } from "../chat/types";
import type { CoupleActivity } from "../couple/types";
import type { CommentReactionsChange, FeedActivity, ReactionAdded } from "../feed/activity";
import type { GamesState } from "../games/types";
import type { LiveView } from "../live/api";

/**
 * One app-wide STOMP connection dedicated to notifications: it listens to the
 * broadcast topics (/topic/messages, /topic/games, /topic/feed, /topic/couple,
 * /topic/comment-reactions, /topic/reactions, /topic/live) so the bell can react to the other person's activity from
 * anywhere in the app. Auto-reconnects like the other clients.
 */
export function createNotifClient(
  onMessage: (m: Message) => void,
  onGames: (s: GamesState) => void,
  onFeed: (a: FeedActivity) => void,
  onCouple: (a: CoupleActivity) => void,
  onCommentReactions?: (c: CommentReactionsChange) => void,
  onReaction?: (r: ReactionAdded) => void,
  onLive?: (g: LiveView) => void,
): Client {
  const token = getToken();
  const client = new Client({
    brokerURL: wsUrl(),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 4000,
    onConnect: () => {
      client.subscribe("/topic/messages", (f: IMessage) => onMessage(JSON.parse(f.body) as Message));
      client.subscribe("/topic/games", (f: IMessage) => onGames(JSON.parse(f.body) as GamesState));
      client.subscribe("/topic/feed", (f: IMessage) => onFeed(JSON.parse(f.body) as FeedActivity));
      client.subscribe("/topic/couple", (f: IMessage) => onCouple(JSON.parse(f.body) as CoupleActivity));
      if (onCommentReactions) {
        client.subscribe("/topic/comment-reactions", (f: IMessage) => onCommentReactions(JSON.parse(f.body) as CommentReactionsChange));
      }
      if (onReaction) {
        client.subscribe("/topic/reactions", (f: IMessage) => onReaction(JSON.parse(f.body) as ReactionAdded));
      }
      if (onLive) {
        client.subscribe("/topic/live", (f: IMessage) => onLive(JSON.parse(f.body) as LiveView));
      }
      reportPresence(client);
    },
  });
  client.activate();
  return client;
}

/**
 * Tells the server whether this page is on screen: it only sends push
 * notifications to someone who isn't looking at the app.
 */
export function reportPresence(client: Client): void {
  if (!client.connected) return;
  client.publish({ destination: "/app/presence", body: JSON.stringify({ visible: document.visibilityState === "visible" }) });
}
