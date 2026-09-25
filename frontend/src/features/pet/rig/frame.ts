/**
 * What the cat looks like at one instant: the "brain" (brain.ts) decides it
 * every frame, the rig (CatRig.tsx) draws it. Coordinates are those of the
 * drawings: a 160×140 box whose ground centre is (80, 131).
 */
export type View = "sit" | "side" | "curl";
export type EyeShape = "open" | "happy" | "closed" | "wide" | "squeeze";
export type MouthShape = "smile" | "open" | "munch" | "wavy" | "tongue" | "yawn";
export type Prop = "none" | "hearts" | "zzz" | "bubbles" | "alert" | "bowl" | "ball" | "note";

export interface Frame {
  view: View;
  /** Scene position of the cat's ground centre, and lift above the ground (negative = up). */
  x: number;
  lift: number;
  /** -1..1: which way the cat looks; the sign flips the drawing. */
  facing: number;
  /** Whole-cat squash and stretch (jumps, landings, view changes). */
  sx: number;
  sy: number;
  /** Body lean in degrees (stretch, pounce). */
  lean: number;
  headTilt: number;
  headX: number;
  headY: number;
  earL: number;
  earR: number;
  /** 0 = eyes open … 1 = shut (blinks). */
  blink: number;
  /** Pupils, -1..1. */
  lookX: number;
  lookY: number;
  eyes: EyeShape;
  mouth: MouthShape;
  tail: number;
  tailPuff: number;
  /** Sitting view: right front paw raised (grooming, swat). */
  paw: number;
  /** Side view: walk cycle phase (radians) and how big the steps are (0..1). */
  walk: number;
  stride: number;
  crouch: number;
  /** Breathing phase (radians) and depth. */
  breath: number;
  breathDepth: number;
  blush: number;
  /** Purring vibration / bath shiver, 0..1. */
  shake: number;
  prop: Prop;
  /** Seconds since the prop appeared (for its own little animation). */
  propTime: number;
  /** Seconds since the cat came to life (idle wobbles, vibrations). */
  time: number;
}

export function restingFrame(x = 80): Frame {
  return {
    view: "sit", x, lift: 0, facing: 1, sx: 1, sy: 1, lean: 0,
    headTilt: 0, headX: 0, headY: 0, earL: 0, earR: 0,
    blink: 0, lookX: 0, lookY: 0, eyes: "open", mouth: "smile",
    tail: 0, tailPuff: 0, paw: 0, walk: 0, stride: 0, crouch: 0,
    breath: 0, breathDepth: 1, blush: 0.75, shake: 0, prop: "none", propTime: 0, time: 0,
  };
}
