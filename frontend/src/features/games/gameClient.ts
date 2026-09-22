import { Client, type IMessage } from "@stomp/stompjs";
import { getToken } from "../../lib/api/client";
import type { GamesState } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

function wsUrl(): string {
  if (API_URL) {
    return API_URL.replace(/^http/, "ws") + "/ws";
  }
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws`;
}

/**
 * Opens a STOMP-over-WebSocket connection authenticated with the JWT, subscribes
 * to /topic/games (server broadcasts the full game + scoreboard on every move),
 * and auto-reconnects. Mirrors chatClient so both features stay consistent.
 */
export function createGameClient(
  onState: (s: GamesState) => void,
  onStatus: (connected: boolean) => void,
): Client {
  const token = getToken();
  const client = new Client({
    brokerURL: wsUrl(),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 3000,
    onConnect: () => {
      onStatus(true);
      client.subscribe("/topic/games", (frame: IMessage) => {
        onState(JSON.parse(frame.body) as GamesState);
      });
    },
    onWebSocketClose: () => onStatus(false),
    onStompError: () => onStatus(false),
  });
  client.activate();
  return client;
}

export function sendMove(client: Client, type: string, cell: number, species: string): void {
  client.publish({ destination: "/app/game.move", body: JSON.stringify({ type, cell, species }) });
}
