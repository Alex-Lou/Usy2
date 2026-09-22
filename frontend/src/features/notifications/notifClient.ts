import { Client, type IMessage } from "@stomp/stompjs";
import { getToken } from "../../lib/api/client";
import type { Message } from "../chat/types";
import type { GamesState } from "../games/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function wsUrl(): string {
  if (API_URL) {
    return API_URL.replace(/^http/, "ws") + "/ws";
  }
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws`;
}

/**
 * One app-wide STOMP connection dedicated to notifications: it listens to the
 * same broadcast topics as the chat and games pages (/topic/messages,
 * /topic/games) so the bell can react to the other person's activity from
 * anywhere in the app. Auto-reconnects like the other clients.
 */
export function createNotifClient(
  onMessage: (m: Message) => void,
  onGames: (s: GamesState) => void,
): Client {
  const token = getToken();
  const client = new Client({
    brokerURL: wsUrl(),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 4000,
    onConnect: () => {
      client.subscribe("/topic/messages", (f: IMessage) => onMessage(JSON.parse(f.body) as Message));
      client.subscribe("/topic/games", (f: IMessage) => onGames(JSON.parse(f.body) as GamesState));
    },
  });
  client.activate();
  return client;
}
