import { Client, type IMessage } from "@stomp/stompjs";
import { getToken } from "../../lib/api/client";
import type { Message } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function wsUrl(): string {
  // Cross-origin dev: derive from the configured API URL.
  if (API_URL) {
    return API_URL.replace(/^http/, "ws") + "/ws";
  }
  // Same-origin production (VITE_API_URL=""): derive from the current page.
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws`;
}

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
