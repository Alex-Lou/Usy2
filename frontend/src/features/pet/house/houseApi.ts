import { apiRequest } from "../../../lib/api/client";

/** 🏡 The house as the server sends it (see HouseDto.java). */
export type Scene = "inside" | "outside";
export type SurfaceSlot = "wall" | "floor" | "view" | "ceiling" | "house" | "ground";

export interface HouseItem {
  id: string;
  label: string;
  slot: "decor" | SurfaceSlot;
  cat: string | null; // shop shelf of an object
  price: number;
  owned: boolean;
  equipped: boolean; // a surface in use
}

/** An object in a scene: centre (0..1), scale (1 = natural size), turn (deg), mirrored. */
export interface Placed {
  item: string;
  x: number;
  y: number;
  s: number;
  r: number;
  f: boolean;
}

export interface Layout {
  version: number;
  items: Placed[];
}

export interface House {
  coins: number;
  items: HouseItem[];
  layouts: Record<Scene, Layout>;
}

/** Broadcast on /topic/house (see HouseActivity.java). */
export interface HouseActivity {
  action: "buy" | "choose" | "layout";
  actorId: number;
  actorName: string;
  house: House;
}

export const MAX_PLACED = 150;

export const getHouse = () => apiRequest<House>("/api/pet/house");
export const buyHouseItem = (id: string) => apiRequest<House>(`/api/pet/house/items/${id}/buy`, { method: "POST" });
export const chooseSurface = (id: string, equipped: boolean) =>
  apiRequest<House>(`/api/pet/house/items/${id}/equipped`, { method: "PUT", body: { equipped } });
export const saveLayout = (scene: Scene, layout: Layout) =>
  apiRequest<House>(`/api/pet/house/layouts/${scene}`, { method: "PUT", body: layout });

/** The surface chosen for a slot, if any (else the house's own look). */
export function surface(house: House | null, slot: SurfaceSlot): string | null {
  return house?.items.find((i) => i.slot === slot && i.equipped)?.id ?? null;
}
