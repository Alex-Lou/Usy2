import { apiRequest } from "../../lib/api/client";
import type { GamesState, GameType } from "./types";

export function getGame(type: GameType): Promise<GamesState> {
  return apiRequest<GamesState>(`/api/games/${type}`);
}

export function startGame(type: GameType): Promise<GamesState> {
  return apiRequest<GamesState>(`/api/games/${type}/start`, { method: "POST" });
}
