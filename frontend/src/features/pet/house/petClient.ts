import { Client, type IMessage } from "@stomp/stompjs";
import { getToken } from "../../../lib/api/client";
import { wsUrl } from "../../../lib/api/ws";
import type { PetActivity } from "../types";

/** Live cat events (/topic/pet) for the house page; auto-reconnects. */
export function createPetClient(onActivity: (a: PetActivity) => void): Client {
  const token = getToken();
  const client = new Client({
    brokerURL: wsUrl(),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 4000,
    onConnect: () => {
      client.subscribe("/topic/pet", (f: IMessage) => onActivity(JSON.parse(f.body) as PetActivity));
    },
  });
  client.activate();
  return client;
}
