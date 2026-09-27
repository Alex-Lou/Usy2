import { Client, type IMessage } from "@stomp/stompjs";
import { getToken } from "../../../lib/api/client";
import { wsUrl } from "../../../lib/api/ws";
import type { PetActivity } from "../types";
import type { HouseActivity } from "./houseApi";

/** Live cat events (/topic/pet) and house changes (/topic/house) for the house page; auto-reconnects. */
export function createPetClient(onActivity: (a: PetActivity) => void, onHouse?: (a: HouseActivity) => void): Client {
  const token = getToken();
  const client = new Client({
    brokerURL: wsUrl(),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 4000,
    onConnect: () => {
      client.subscribe("/topic/pet", (f: IMessage) => onActivity(JSON.parse(f.body) as PetActivity));
      if (onHouse) client.subscribe("/topic/house", (f: IMessage) => onHouse(JSON.parse(f.body) as HouseActivity));
    },
  });
  client.activate();
  return client;
}
