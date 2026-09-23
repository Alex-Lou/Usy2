export type PetAction = "pet" | "feed" | "play";
export type PetMood = "hungry" | "bored" | "happy" | "content";

/** The shared cat (GET /api/pet). */
export interface Pet {
  name: string;
  satiety: number; // 0..100
  happiness: number; // 0..100
  mood: PetMood;
  lastAction: PetAction | null;
  lastActorName: string | null;
  lastActionAt: string | null;
}

/** Broadcast on /topic/pet (see PetActivity.java). */
export interface PetActivity {
  action: PetAction | "rename";
  actorId: number;
  actorName: string;
  pet: Pet;
}
