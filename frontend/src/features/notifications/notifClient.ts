import { Client, type IMessage } from "@stomp/stompjs";
import { getToken } from "../../lib/api/client";
import { wsUrl } from "../../lib/api/ws";
import type { CoupleActivity } from "../couple/types";
import type { CommentReactionsChange, FeedActivity } from "../feed/activity";
import type { LiveView } from "../live/api";
import type { Ping as CrosswordPing } from "../crossword/api";
import type { NavalPing } from "../naval/api";
import type { Ping as PetitBacPing } from "../petitbac/api";
import type { NotificationEntry } from "./api";

interface Handlers {
  onNotification: (n: NotificationEntry) => void;
  onFeed: (a: FeedActivity) => void;
  onCouple: (a: CoupleActivity) => void;
  onCommentReactions: (c: CommentReactionsChange) => void;
  onLive: (g: LiveView) => void;
  onNaval: (p: NavalPing) => void;
  onCrossword: (p: CrosswordPing) => void;
  onPetitBac: (p: PetitBacPing) => void;
}

/**
 * One app-wide STOMP connection: my new bell entries (/user/queue/notifications,
 * written by the server, sent to me only) and the shared activity the open pages follow live
 * (/topic/feed, /topic/couple, /topic/comment-reactions, /topic/live,
 * /topic/naval, /topic/crossword, /topic/petit-bac). Auto-reconnects like the other clients.
 */
export function createNotifClient(h: Handlers): Client {
  const token = getToken();
  const client = new Client({
    brokerURL: wsUrl(),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 4000,
    onConnect: () => {
      const on = <T,>(topic: string, handle: (body: T) => void) =>
        client.subscribe(topic, (f: IMessage) => handle(JSON.parse(f.body) as T));
      on("/user/queue/notifications", h.onNotification);
      on("/topic/feed", h.onFeed);
      on("/topic/couple", h.onCouple);
      on("/topic/comment-reactions", h.onCommentReactions);
      on("/topic/live", h.onLive);
      on("/topic/naval", h.onNaval);
      on("/topic/crossword", h.onCrossword);
      on("/topic/petit-bac", h.onPetitBac);
      reportPresence(client);
    },
  });
  client.activate();
  return client;
}

/** Untouched for this long, a page left open (a computer at home) no longer counts as being looked at. */
const IDLE_MS = 2 * 60_000;
let lastActive = Date.now();
let lastReported: boolean | null = null;

/** Someone touched, typed or scrolled. */
export function markActive(): void {
  lastActive = Date.now();
}

/** On screen and used recently. */
export function isLooking(): boolean {
  return document.visibilityState === "visible" && Date.now() - lastActive < IDLE_MS;
}

/**
 * Tells the server whether this page is being looked at: it only sends push
 * notifications to someone who isn't (so the phone still rings while a
 * computer sits open and unused). `onlyIfChanged`: skip when nothing changed.
 */
export function reportPresence(client: Client, onlyIfChanged = false): void {
  if (!client.connected) return;
  const visible = isLooking();
  if (onlyIfChanged && visible === lastReported) return;
  lastReported = visible;
  client.publish({ destination: "/app/presence", body: JSON.stringify({ visible }) });
}
