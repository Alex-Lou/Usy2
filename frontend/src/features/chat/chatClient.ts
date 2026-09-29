import { Client, type IMessage } from "@stomp/stompjs";
import { getToken } from "../../lib/api/client";
import { wsUrl } from "../../lib/api/ws";
import type { PetActivity } from "../pet/types";
import type { ChatDelivered, ChatRead, Message, MessageReactions, Typing } from "./types";
import { NO_LOOK, type MessageLook } from "./looks";

/**
 * Opens a STOMP-over-WebSocket connection authenticated with the JWT (sent in
 * the CONNECT frame), subscribes to /topic/messages (and reactions, the cat,
 * the ✓✓ of received and read messages, "… écrit"), and auto-reconnects.
 */
export function createChatClient(
  onMessage: (m: Message) => void,
  onStatus: (connected: boolean) => void,
  onPet?: (a: PetActivity) => void,
  onReactions?: (r: MessageReactions) => void,
  onRead?: (r: ChatRead) => void,
  onTyping?: (t: Typing) => void,
  onDelivered?: (d: ChatDelivered) => void,
): Client {
  const token = getToken();
  const client = new Client({
    brokerURL: wsUrl(),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 3000,
    onConnect: () => {
      onStatus(true);
      client.subscribe("/topic/messages", (frame: IMessage) => {
        onMessage(JSON.parse(frame.body) as Message);
      });
      if (onPet) client.subscribe("/topic/pet", (frame: IMessage) => onPet(JSON.parse(frame.body) as PetActivity));
      if (onReactions) {
        client.subscribe("/topic/message-reactions", (frame: IMessage) => onReactions(JSON.parse(frame.body) as MessageReactions));
      }
      if (onRead) client.subscribe("/topic/chat-read", (frame: IMessage) => onRead(JSON.parse(frame.body) as ChatRead));
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
 * `attachmentAssetId`: a photo/GIF/document uploaded first (see attachments.ts);
 * `replyToId`: the earlier message this one answers.
 */
export function sendMessage(
  client: Client,
  content: string,
  attachmentAssetId: number | null = null,
  replyToId: number | null = null,
  look: MessageLook = NO_LOOK,
): void {
  client.publish({ destination: "/app/chat.send", body: JSON.stringify({ content, attachmentAssetId, replyToId, style: look.style, effect: look.effect }) });
}

/** The conversation is on screen up to this message: the other one sees it read (✓✓ in colour). */
export function sendRead(client: Client, upToId: number): void {
  if (client.connected) client.publish({ destination: "/app/chat.read", body: JSON.stringify({ upToId }) });
}

/** I am typing (the server passes it on at most once a second). */
export function sendTyping(client: Client): void {
  if (client.connected) client.publish({ destination: "/app/chat.typing", body: "{}" });
}
