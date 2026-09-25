/**
 * Rules of the fishing mini-game, free of React: fish (and the odd old boot)
 * fall from the top; the cat, moved with the finger along the bottom, catches
 * them. Everything is in fractions of the play area, so it fits any screen.
 */
export const ROUND_MS = 30_000;
export const MAX_SCORE = 80; // the server refuses more (PetService.Game.maxScore)
export const CATCH_TOP = 0.8; // catch zone (fraction of the height), at the cat's mouth
export const CATCH_BOTTOM = 0.94;
export const CATCH_HALF_WIDTH = 0.12;
const COMBO_BONUS_FROM = 5; // from the 5th fish in a row, each fish counts double
const BOOT_PENALTY = 2;

export type Kind = "fish" | "gold" | "boot";

export interface Drop {
  id: number;
  kind: Kind;
  x: number; // centre, 0..1
  y: number; // 0 (top) .. 1 (bottom)
  speed: number; // heights per second
  spin: number; // degrees, for looks
}

export interface Round {
  elapsed: number; // ms
  drops: Drop[];
  nextDropIn: number; // ms
  nextId: number;
  catX: number; // 0..1
  score: number;
  caught: number; // fish caught (gold counts 1)
  combo: number;
  best: number; // best combo this round
}

export type Event = { kind: Kind; x: number; points: number } | { kind: "miss" };

export function newRound(): Round {
  return { elapsed: 0, drops: [], nextDropIn: 400, nextId: 1, catX: 0.5, score: 0, caught: 0, combo: 0, best: 0 };
}

/** 0 at the start, 1 at the end: drops come faster and fall quicker. */
function pace(r: Round): number {
  return Math.min(1, r.elapsed / ROUND_MS);
}

function spawn(r: Round, rand: () => number): Drop {
  const p = pace(r);
  const roll = rand();
  const kind: Kind = roll < 0.08 ? "gold" : roll < 0.08 + 0.16 + 0.12 * p ? "boot" : "fish";
  return {
    id: r.nextId++,
    kind,
    x: 0.08 + rand() * 0.84,
    y: -0.08,
    speed: (0.32 + 0.4 * p + rand() * 0.12) * (kind === "gold" ? 1.25 : 1),
    spin: (rand() - 0.5) * 40,
  };
}

/** Advances the round by `dt` ms; returns what happened (for sounds/animations). */
export function step(r: Round, dt: number, rand: () => number = Math.random): Event[] {
  const events: Event[] = [];
  r.elapsed = Math.min(ROUND_MS, r.elapsed + dt);
  r.nextDropIn -= dt;
  if (r.nextDropIn <= 0 && r.elapsed < ROUND_MS - 600) {
    r.drops.push(spawn(r, rand));
    r.nextDropIn = 850 - 450 * pace(r) + rand() * 250;
  }

  const kept: Drop[] = [];
  for (const d of r.drops) {
    const before = d.y;
    d.y += (d.speed * dt) / 1000;
    const inZone = d.y >= CATCH_TOP && before <= CATCH_BOTTOM;
    if (inZone && Math.abs(d.x - r.catX) <= CATCH_HALF_WIDTH) {
      events.push(catchDrop(r, d));
      continue;
    }
    if (d.y > 1.1) {
      if (d.kind !== "boot") {
        r.combo = 0;
        events.push({ kind: "miss" });
      }
      continue;
    }
    kept.push(d);
  }
  r.drops = kept;
  return events;
}

function catchDrop(r: Round, d: Drop): Event {
  if (d.kind === "boot") {
    r.combo = 0;
    const lost = Math.min(BOOT_PENALTY, r.score);
    r.score -= lost;
    return { kind: "boot", x: d.x, points: -lost };
  }
  r.combo += 1;
  r.best = Math.max(r.best, r.combo);
  r.caught += 1;
  const points = (d.kind === "gold" ? 3 : 1) * (r.combo >= COMBO_BONUS_FROM ? 2 : 1);
  r.score = Math.min(MAX_SCORE, r.score + points);
  return { kind: d.kind, x: d.x, points };
}

export function isOver(r: Round): boolean {
  return r.elapsed >= ROUND_MS && r.drops.length === 0;
}
