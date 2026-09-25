/**
 * The living penguin's little mind: it waddles about, belly-slides, flaps,
 * naps (more at night) and, in the house, goes to say hello to Moka. Pure
 * state, stepped by LivingPenguin's frame loop; no React in here.
 */

export type PenguinState = "idle" | "walk" | "slide" | "flap" | "nap" | "visit";
export type BubbleKind = "z" | "note" | "heart";

export interface PenguinEnv {
  minX: number;
  maxX: number;
  night: boolean;
  reduced: boolean;
  /** Moka's extent (house only), to go and stand beside it. */
  friend: { left: number; right: number } | null;
}

export interface Bubble {
  id: number;
  kind: BubbleKind;
  x: number;
  age: number;
}

const WALK_SPEED = 26; // scene units per second
const SLIDE_SPEED = 90;
const BUBBLE_LIFE = 1.6;

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class PenguinBrain {
  x: number;
  dir: 1 | -1 = 1;
  state: PenguinState = "idle";
  /** Pose, read by the drawing. */
  tilt = 0;
  lift = 0;
  flap = 0;
  lying = 0; // 0 standing … 1 flat on the belly
  eyesClosed = false;
  bubbles: Bubble[] = [];

  private t = 0;
  private dur = rand(1, 2.5);
  private target = 0;
  private phase = 0;
  private nextBubble = 0;
  private bubbleId = 0;

  constructor(x: number) {
    this.x = x;
  }

  /** A tap: a happy hop, flapping, with a note or a heart. */
  poke() {
    this.go("flap", 1.2);
    this.say(Math.random() < 0.5 ? "heart" : "note");
  }

  update(dt: number, env: PenguinEnv) {
    this.t += dt;
    this.phase += dt;
    this.bubbles = this.bubbles.map((b) => ({ ...b, age: b.age + dt })).filter((b) => b.age < BUBBLE_LIFE);
    if (env.reduced) {
      this.settle(dt);
      if (this.state !== "idle" && this.t > this.dur) this.go("idle", 2);
      return;
    }
    switch (this.state) {
      case "idle":
        this.settle(dt);
        if (this.t > this.dur) this.pickNext(env);
        break;
      case "walk":
      case "visit":
        this.walkTo(dt, env);
        break;
      case "slide":
        this.slide(dt);
        break;
      case "flap":
        this.lying = Math.max(0, this.lying - dt * 3);
        this.flap = Math.sin(this.t * 28) * 38;
        this.lift = -Math.abs(Math.sin(this.t * 7)) * 7;
        this.tilt = Math.sin(this.t * 14) * 4;
        if (this.t > this.dur) this.go("idle", rand(0.8, 2));
        break;
      case "nap":
        this.settle(dt);
        this.eyesClosed = true;
        this.tilt = Math.sin(this.phase * 1.6) * 2; // breathing sway
        if (this.t > this.nextBubble) {
          this.say("z");
          this.nextBubble = this.t + 1.3;
        }
        if (this.t > this.dur) {
          this.eyesClosed = false;
          this.go("idle", rand(1, 2));
        }
        break;
    }
  }

  private pickNext(env: PenguinEnv) {
    const room = env.maxX - env.minX;
    const r = Math.random() * 100;
    const napOdds = env.night ? 30 : 10;
    if (env.friend && r < 15) {
      // Stand beside Moka (not on it), then face it.
      const { left, right } = env.friend;
      const fromLeft = (left + right) / 2 > this.x;
      this.target = clamp(fromLeft ? left - 18 : right + 18, env.minX, env.maxX);
      this.go("visit", 12);
    } else if (r < 15 + napOdds) {
      this.nextBubble = 0.6;
      this.go("nap", rand(7, 12));
    } else if (r < 30 + napOdds && room > 120) {
      this.target = this.x < (env.minX + env.maxX) / 2 ? rand(env.maxX - room * 0.25, env.maxX) : rand(env.minX, env.minX + room * 0.25);
      this.dir = this.target > this.x ? 1 : -1;
      this.go("slide", 6);
    } else if (r < 45 + napOdds) {
      this.say("note");
      this.go("flap", 1.1);
    } else {
      this.target = rand(env.minX, env.maxX);
      this.go("walk", 12);
    }
  }

  private walkTo(dt: number, env: PenguinEnv) {
    this.lying = Math.max(0, this.lying - dt * 3);
    const d = this.target - this.x;
    if (Math.abs(d) < 2 || this.t > this.dur) {
      if (this.state === "visit" && env.friend) {
        this.dir = (env.friend.left + env.friend.right) / 2 > this.x ? 1 : -1;
        this.say("heart");
        this.go("flap", 0.9);
      } else {
        this.go("idle", rand(1.2, 3.5));
      }
      return;
    }
    this.dir = d > 0 ? 1 : -1;
    this.x += this.dir * Math.min(Math.abs(d), WALK_SPEED * dt);
    this.tilt = Math.sin(this.phase * 9) * 9; // the waddle
    this.lift = -Math.abs(Math.sin(this.phase * 9)) * 2;
    this.flap = 8 + Math.sin(this.phase * 9) * 6; // flippers out for balance
  }

  private slide(dt: number) {
    this.tilt = 0;
    this.flap = 0;
    this.lift = 0;
    const d = this.target - this.x;
    if (this.lying < 1 && Math.abs(d) > 4) {
      this.lying = Math.min(1, this.lying + dt * 2.6); // the belly flop
      return;
    }
    if (Math.abs(d) > 2 && this.t < this.dur) {
      const speed = Math.min(SLIDE_SPEED, Math.abs(d) * 2.2 + 12); // slows down at the end
      this.x += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
      return;
    }
    this.lying = Math.max(0, this.lying - dt * 2.2); // back on its feet
    if (this.lying === 0) this.go("idle", rand(1, 2.5));
  }

  private settle(dt: number) {
    const k = Math.min(1, dt * 8);
    this.tilt += (0 - this.tilt) * k;
    this.lift += (0 - this.lift) * k;
    this.flap += (0 - this.flap) * k;
    this.lying = Math.max(0, this.lying - dt * 3);
  }

  private go(state: PenguinState, dur: number) {
    this.state = state;
    this.t = 0;
    this.dur = dur;
    if (state !== "nap") this.eyesClosed = false;
  }

  private say(kind: BubbleKind) {
    this.bubbles = [...this.bubbles.slice(-4), { id: ++this.bubbleId, kind, x: this.x, age: 0 }];
  }
}

function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v));
}
