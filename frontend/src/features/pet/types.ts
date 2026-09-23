export type PetAction = "pet" | "feed" | "play" | "brush" | "bath" | "nap" | "laser";
export type PetMood = "hungry" | "tired" | "dirty" | "bored" | "happy" | "content";

export interface PetItem {
  id: string;
  label: string;
  slot: "neck" | "head" | "face" | "home";
  price: number;
  owned: boolean;
  equipped: boolean;
}

/** The shared cat (GET /api/pet). Needs are 0..100. */
export interface Pet {
  name: string;
  satiety: number;
  happiness: number;
  cleanliness: number;
  energy: number;
  mood: PetMood;
  coins: number;
  coinsLeftToday: number;
  items: PetItem[];
  lastAction: PetAction | null;
  lastActorName: string | null;
  lastActionAt: string | null;
}

/** Broadcast on /topic/pet (see PetActivity.java). */
export interface PetActivity {
  action: PetAction | "rename" | "shop";
  actorId: number;
  actorName: string;
  pet: Pet;
}

export function wornItems(pet: Pet): string[] {
  return pet.items.filter((i) => i.equipped).map((i) => i.id);
}

export const MOOD_TEXT: Record<PetMood, string> = {
  hungry: "a faim",
  tired: "est fatigué",
  dirty: "aurait besoin d'un brin de toilette",
  bored: "s'ennuie un peu",
  happy: "est aux anges",
  content: "va bien",
};
