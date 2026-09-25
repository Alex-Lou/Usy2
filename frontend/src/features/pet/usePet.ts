import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "../chat/types";
import { actOnPet, getPet } from "./api";
import type { CatPose } from "./CatSprite";
import type { Pet, PetAction, PetActivity } from "./types";

const SLEEP_AFTER_MS = 3 * 60_000; // nobody wrote or played for 3 min
export const REACTION_MS: Record<PetAction | "startle", number> = {
  pet: 2600, feed: 3200, play: 3600, brush: 2600, bath: 3000, nap: 4500, laser: 3000, fish: 3200, startle: 1100,
};
export const POSE_OF: Record<PetAction, CatPose> = {
  pet: "purr", feed: "eat", play: "play", brush: "purr", bath: "bath", nap: "sleep", laser: "play", fish: "eat",
};
// A message with one of these makes the cat purr instead of jump.
const LOVE = /❤|💕|💖|💗|💓|💞|💘|😍|🥰|😘|🩷|\[\[s:(coeur|coeur-bat|je-t-aime|bisou|amoureux|coeurs)\]\]/u;

const CAPTION: Record<PetAction, (who: string, name: string) => string> = {
  pet: (who, name) => `${who} a caressé ${name}`,
  feed: (who, name) => `${who} a donné des croquettes à ${name}`,
  play: (who, name) => `${who} joue à la balle avec ${name}`,
  brush: (who, name) => `${who} a brossé ${name}`,
  bath: (who, name) => `${who} a donné un bain à ${name}`,
  nap: (who, name) => `${who} a mis ${name} à la sieste`,
  laser: (who, name) => `${who} joue au laser avec ${name}`,
  fish: (who, name) => `${who} a pêché des poissons pour ${name}`,
};

/** A late answer or live echo older than what is on screen must not roll the needs back. */
function isOlder(next: Pet, cur: Pet | null): boolean {
  return !!cur?.lastActionAt && !!next.lastActionAt && new Date(next.lastActionAt) < new Date(cur.lastActionAt);
}

/**
 * The cat's live state and what it is doing right now. Base pose: asleep after
 * a quiet while, hungry when it needs food, calm otherwise; interactions (mine
 * or the other person's, received live) and incoming messages play a short
 * reaction on top.
 */
export function usePet(myId: number | undefined) {
  const [pet, setPet] = useState<Pet | null>(null);
  const [reaction, setReaction] = useState<CatPose | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const timer = useRef<number>();
  const captionTimer = useRef<number>();

  useEffect(() => {
    getPet()
      .then((p) => {
        setPet(p);
        if (p.lastActionAt) setLastActivity((t) => Math.max(t, new Date(p.lastActionAt as string).getTime()));
      })
      .catch(() => {});
    const tick = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(timer.current);
      window.clearTimeout(captionTimer.current);
    };
  }, []);

  const react = useCallback((pose: CatPose, ms: number) => {
    window.clearTimeout(timer.current);
    setReaction(pose);
    setLastActivity(Date.now());
    setNow(Date.now());
    timer.current = window.setTimeout(() => setReaction(null), ms);
  }, []);

  const say = useCallback((text: string) => {
    window.clearTimeout(captionTimer.current);
    setCaption(text);
    captionTimer.current = window.setTimeout(() => setCaption(null), 3500);
  }, []);

  /** My own care: animate at once, then sync the needs (and coins) from the server. */
  const act = useCallback(
    (action: PetAction): Promise<Pet | null> => {
      react(POSE_OF[action], REACTION_MS[action]);
      return actOnPet(action)
        .then((p) => {
          setPet((cur) => (isOlder(p, cur) ? cur : p));
          return p;
        })
        .catch(() => null);
    },
    [react],
  );

  /** Live event from /topic/pet (the other person's echo of mine is ignored). */
  const onActivity = useCallback(
    (a: PetActivity) => {
      setPet((cur) => (isOlder(a.pet, cur) ? cur : a.pet));
      if (a.actorId === myId || a.action === "rename" || a.action === "shop") return;
      react(POSE_OF[a.action], REACTION_MS[a.action]);
      say(CAPTION[a.action](a.actorName, a.pet.name));
    },
    [myId, react, say],
  );

  /** A chat message: the other person's makes it jump (or purr if it is loving). */
  const onMessage = useCallback(
    (m: Message) => {
      setLastActivity(Date.now());
      if (m.sender.id === myId) return;
      if (LOVE.test(m.content)) react("purr", REACTION_MS.pet);
      else react("startle", REACTION_MS.startle);
    },
    [myId, react],
  );

  /** Seed "last activity" with the latest message already in the conversation. */
  const noteHistory = useCallback((latestIso: string | undefined) => {
    if (latestIso) setLastActivity((t) => Math.max(t, new Date(latestIso).getTime()));
  }, []);

  const asleep = lastActivity > 0 && now - lastActivity > SLEEP_AFTER_MS;
  const pose: CatPose = reaction ?? (asleep ? "sleep" : pet?.mood === "hungry" ? "hungry" : "idle");

  return { pet, setPet, pose, caption, act, react, onActivity, onMessage, noteHistory };
}
