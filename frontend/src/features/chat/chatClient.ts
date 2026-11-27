import { Client, type IMessage } from "@stomp/stompjs";
import { getToken } from "../../lib/api/client";
import { wsUrl } from "../../lib/api/ws";
import type { ChatDelivered, ChatRead, Message, MessageReactions, Typing } from "./types";
import { NO_LOOK, type MessageLook } from "./looks";

/**
 * Opens a STOMP-over-WebSocket connection authenticated with the JWT (sent in
 * the CONNECT frame), subscribes to /topic/messages (and reactions,
 * the ✓✓ of received and read messages, "… écrit"), and auto-reconnects.
 */
export function createChatClient(
  onMessage: (m: Message) => void,
  onStatus: (connected: boolean) => void,
  onReactions?: (r: MessageReactions) => void,
  onRead?: (r: ChatRead) => void,
  onTyping?: (t: Typing) => void,
  onDelivered?: (d: ChatDelivered) => void,
  onEdited?: (m: Message) => void,
): Client {
  const token = getToken();
  const client = new Client({
    brokerURL: wsUrl(),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 1000, // back quickly: the conversation is useless while it waits
    onConnect: () => {
      onStatus(true);
      client.subscribe("/topic/messages", (frame: IMessage) => {
        onMessage(JSON.parse(frame.body) as Message);
      });
      if (onReactions) {
        client.subscribe("/topic/message-reactions", (frame: IMessage) => onReactions(JSON.parse(frame.body) as MessageReactions));
      }
      if (onRead) client.subscribe("/topic/chat-read", (frame: IMessage) => onRead(JSON.parse(frame.body) as ChatRead));
      if (onEdited) client.subscribe("/topic/message-edited", (frame: IMessage) => onEdited(JSON.parse(frame.body) as Message));
      if (onDelivered) client.subscribe("/topic/chat-delivered", (frame: IMessage) => onDelivered(JSON.parse(frame.body) as ChatDelivered));
      if (onTyping) client.subscribe("/topic/chat-typing", (frame: IMessage) => onTyping(JSON.parse(frame.body) as Typing));
    },
    onWebSocketClose: () => onStatus(false),
    onStompError: () => onStatus(false),
  });
  client.activate();
  return client;
}

/**
 * `attachmentIds`: up to 10 photos/GIFs/files uploaded first, in order (see attachments.ts);
 * `replyToId`: the earlier message this one answers.
 */
export function sendMessage(
  client: Client,
  content: string,
  attachmentIds: number[] = [],
  replyToId: number | null = null,
  look: MessageLook = NO_LOOK,
): void {
  const body = { content, attachmentAssetId: attachmentIds[0] ?? null, attachmentAssetIds: attachmentIds, replyToId, style: look.style, effect: look.effect };
  client.publish({ destination: "/app/chat.send", body: JSON.stringify(body) });
}

/** The conversation is on screen up to this message: the other one sees it read (✓✓ in colour). */
export function sendRead(client: Client, upToId: number): void {
  if (client.connected) client.publish({ destination: "/app/chat.read", body: JSON.stringify({ upToId }) });
}

/** I am typing (the server passes it on at most once a second). */
export function sendTyping(client: Client): void {
  if (client.connected) client.publish({ destination: "/app/chat.typing", body: "{}" });
}
