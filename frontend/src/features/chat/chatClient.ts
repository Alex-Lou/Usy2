import { Client, type IMessage } from "@stomp/stompjs";
import { getToken } from "../../lib/api/client";
import { wsUrl } from "../../lib/api/ws";
import type { PetActivity } from "../pet/types";
import type { Message, MessageReactions } from "./types";

/**
 * Opens a STOMP-over-WebSocket connection authenticated with the JWT (sent in
 * the CONNECT frame), subscribes to /topic/messages (and reactions, the cat),
 * and auto-reconnects.
 */
export function createChatClient(
  onMessage: (m: Message) => void,
  onStatus: (connected: boolean) => void,
  onPet?: (a: PetActivity) => void,
  onReactions?: (r: MessageReactions) => void,
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
    },
    onWebSocketClose: () => onStatus(false),
    onStompError: () => onStatus(false),
  });
  client.activate();
  return client;
}

/** `attachmentAssetId`: a photo/GIF/document uploaded first (see attachments.ts). */
export function sendMessage(client: Client, content: string, attachmentAssetId: number | null = null): void {
  client.publish({ destination: "/app/chat.send", body: JSON.stringify({ content, attachmentAssetId }) });
}
