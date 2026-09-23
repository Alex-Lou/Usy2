import { apiRequest } from "../../lib/api/client";
import type { Pet, PetAction } from "./types";

export function getPet(): Promise<Pet> {
  return apiRequest<Pet>("/api/pet");
}

export function actOnPet(action: PetAction): Promise<Pet> {
  return apiRequest<Pet>("/api/pet/actions", { method: "POST", body: { action } });
}

export function renamePet(name: string): Promise<Pet> {
  return apiRequest<Pet>("/api/pet/name", { method: "PUT", body: { name } });
}

export function buyItem(item: string): Promise<Pet> {
  return apiRequest<Pet>(`/api/pet/items/${encodeURIComponent(item)}/buy`, { method: "POST" });
}

export function wearItem(item: string, equipped: boolean): Promise<Pet> {
  return apiRequest<Pet>(`/api/pet/items/${encodeURIComponent(item)}/equipped`, { method: "PUT", body: { equipped } });
}
