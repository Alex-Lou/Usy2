import { Client, type IMessage } from "@stomp/stompjs";
import { getToken } from "../../lib/api/client";
import { wsUrl } from "../../lib/api/ws";
import type { Message } from "./types";

/**
 * Opens a STOMP-over-WebSocket connection authenticated with the JWT (sent in
 * the CONNECT frame), subscribes to /topic/messages, and auto-reconnects.
 */
export function createChatClient(
  onMessage: (m: Message) => void,
  onStatus: (connected: boolean) => void,
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
    },
    onWebSocketClose: () => onStatus(false),
    onStompError: () => onStatus(false),
  });
  client.activate();
  return client;
}

export function sendMessage(client: Client, content: string): void {
  client.publish({ destination: "/app/chat.send", body: JSON.stringify({ content }) });
}
