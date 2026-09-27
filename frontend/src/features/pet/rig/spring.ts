/**
 * Tiny spring physics for the cat's motion: every animated value eases toward
 * its target with a little life (overshoot when stiff and loosely damped),
 * and never jumps, whatever changes the target at any moment.
 */
export interface Spring {
  value: number;
  velocity: number;
  target: number;
  stiffness: number;
  damping: number;
}

export function spring(value: number, stiffness = 170, damping = 22): Spring {
  return { value, velocity: 0, target: value, stiffness, damping };
}

/** Advances one spring by dt seconds (semi-implicit Euler, stable up to ~50 ms steps). */
export function step(s: Spring, dt: number): void {
  const force = (s.target - s.value) * s.stiffness - s.velocity * s.damping;
  s.velocity += force * dt;
  s.value += s.velocity * dt;
}

/** Jumps straight to a value (first frame, reduced motion). */
export function snap(s: Spring, value: number): void {
  s.value = value;
  s.target = value;
  s.velocity = 0;
}

/** Gives the spring a kick (squash on landing, flinch…). */
export function kick(s: Spring, velocity: number): void {
  s.velocity += velocity;
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
