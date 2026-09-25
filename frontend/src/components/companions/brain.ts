/**
 * A living companion's little mind (penguin, wolf or cat): it wanders about,
 * naps (more at night), visits Moka in the house, does its own trick — the
 * penguin belly-slides, the wolf howls, the cat pounces — and hops happily
 * when touched. Pure state, stepped by LivingCompanion's frame loop.
 */

export type Kind = "penguin" | "wolf" | "cat";
export type State = "idle" | "walk" | "visit" | "nap" | "happy" | "trick";
export type BubbleKind = "z" | "note" | "heart" | "howl";

export interface Env {
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

/** Per kind: walking pace, and how its trick moves. */
const KINDS: Record<Kind, { speed: number; trickOdds: number; trickDur: number }> = {
  penguin: { speed: 26, trickOdds: 15, trickDur: 6 }, // belly slide across the room
  wolf: { speed: 34, trickOdds: 12, trickDur: 2.6 }, // sits and howls
  cat: { speed: 38, trickOdds: 15, trickDur: 1.3 }, // crouches then pounces
};

export const BUBBLE_LIFE = 1.6;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class CompanionBrain {
  x: number;
  dir: 1 | -1 = 1;
  state: State = "idle";
  /** The pose, read by the drawing. */
  tilt = 0; // body sway (deg)
  lift = 0; // hop (negative = up)
  wag = 0; // flippers / tail (deg)
  lying = 0; // 0 standing … 1 flat (nap, slide)
  raise = 0; // 0 … 1 head up (howl)
  squash = 1; // crouch before a pounce
  stride = 0; // walk cycle phase (legs)
  eyesClosed = false;
  bubbles: Bubble[] = [];

  private t = 0;
  private dur = rand(1, 2.5);
  private target = 0;
  private clock = 0;
  private nextBubble = 0;
  private bubbleId = 0;

  constructor(
    readonly kind: Kind,
    x: number,
  ) {
    this.x = x;
  }

  /** A tap: a happy hop, with a note or a heart. */
  poke() {
    this.eyesClosed = false;
    this.go("happy", 1.2);
    this.say(Math.random() < 0.5 ? "heart" : "note");
  }

  update(dt: number, env: Env) {
    this.t += dt;
    this.clock += dt;
    this.bubbles = this.bubbles.map((b) => ({ ...b, age: b.age + dt })).filter((b) => b.age < BUBBLE_LIFE);
    if (env.reduced) {
      this.settle(dt);
      if (this.state !== "idle" && this.t > this.dur) this.go("idle", 2);
      return;
    }
    switch (this.state) {
      case "idle":
        this.settle(dt);
        this.wag = Math.sin(this.clock * 2.2) * 6; // a lazy tail
        if (this.t > this.dur) this.pickNext(env);
        break;
      case "walk":
      case "visit":
        this.walkTo(dt, env);
        break;
      case "happy":
        this.relax(dt);
        this.wag = Math.sin(this.t * 28) * 36;
        this.lift = -Math.abs(Math.sin(this.t * 7)) * 8;
        this.tilt = Math.sin(this.t * 14) * 4;
        if (this.t > this.dur) this.go("idle", rand(0.8, 2));
        break;
      case "nap":
        this.settle(dt);
        // Four-legged ones curl up; the penguin dozes standing.
        this.lying = this.kind === "penguin" ? 0 : Math.min(0.7, this.lying + dt * 5);
        this.eyesClosed = true;
        this.tilt = Math.sin(this.clock * 1.6) * 1.5; // breathing
        if (this.t > this.nextBubble) {
          this.say("z");
          this.nextBubble = this.t + 1.3;
        }
        if (this.t > this.dur) {
          this.eyesClosed = false;
          this.go("idle", rand(1, 2));
        }
        break;
      case "trick":
        if (this.kind === "penguin") this.slide(dt);
        else if (this.kind === "wolf") this.howl(dt);
        else this.pounce(dt, env);
        break;
    }
  }

  private pickNext(env: Env) {
    const room = env.maxX - env.minX;
    const r = Math.random() * 100;
    const napOdds = env.night ? 30 : 10;
    const trickOdds = KINDS[this.kind].trickOdds + (this.kind === "wolf" && env.night ? 15 : 0); // wolves howl at night
    if (env.friend && r < 15) {
      // Stand beside Moka (not on it), then face it.
      const { left, right } = env.friend;
      const fromLeft = (left + right) / 2 > this.x;
      this.target = clamp(fromLeft ? left - 20 : right + 20, env.minX, env.maxX);
      this.go("visit", 12);
    } else if (r < 15 + napOdds) {
      this.nextBubble = 0.6;
      this.go("nap", rand(7, 12));
    } else if (r < 15 + napOdds + trickOdds && (this.kind !== "penguin" || room > 120)) {
      if (this.kind === "penguin") {
        this.target = this.x < (env.minX + env.maxX) / 2 ? rand(env.maxX - room * 0.25, env.maxX) : rand(env.minX, env.minX + room * 0.25);
        this.dir = this.target > this.x ? 1 : -1;
      } else if (this.kind === "cat") {
        const room2 = this.dir > 0 ? env.maxX - this.x : this.x - env.minX;
        if (room2 < 50) this.dir = this.dir > 0 ? -1 : 1; // pounce where there is room
      }
      this.go("trick", KINDS[this.kind].trickDur);
    } else if (r < 30 + napOdds + trickOdds) {
      this.say("note");
      this.go("happy", 1.1);
    } else {
      this.target = rand(env.minX, env.maxX);
      this.go("walk", 12);
    }
  }

  private walkTo(dt: number, env: Env) {
    this.relax(dt);
    const d = this.target - this.x;
    if (Math.abs(d) < 2 || this.t > this.dur) {
      this.stride = 0;
      if (this.state === "visit" && env.friend) {
        this.dir = (env.friend.left + env.friend.right) / 2 > this.x ? 1 : -1;
        this.say("heart");
        this.go("happy", 0.9);
      } else {
        this.go("idle", rand(1.2, 3.5));
      }
      return;
    }
    this.dir = d > 0 ? 1 : -1;
    const speed = KINDS[this.kind].speed;
    this.x += this.dir * Math.min(Math.abs(d), speed * dt);
    this.stride += dt * speed * 0.35;
    if (this.kind === "penguin") {
      this.tilt = Math.sin(this.clock * 9) * 9; // the waddle
      this.lift = -Math.abs(Math.sin(this.clock * 9)) * 2;
      this.wag = 8 + Math.sin(this.clock * 9) * 6; // flippers out for balance
    } else {
      this.tilt = Math.sin(this.stride * 2) * 1.5;
      this.lift = -Math.abs(Math.sin(this.stride)) * 1.5; // a little trot bounce
      this.wag = Math.sin(this.clock * 6) * 14;
    }
  }

  private slide(dt: number) {
    this.tilt = 0;
    this.wag = 0;
    this.lift = 0;
    const d = this.target - this.x;
    if (this.lying < 1 && Math.abs(d) > 4) {
      this.lying = Math.min(1, this.lying + dt * 2.6); // the belly flop
      return;
    }
    if (Math.abs(d) > 2 && this.t < this.dur) {
      const speed = Math.min(90, Math.abs(d) * 2.2 + 12); // slows down at the end
      this.x += Math.sign(d) * Math.min(Math.abs(d), speed * dt);
      return;
    }
    this.lying = Math.max(0, this.lying - dt * 2.2); // back on its feet
    if (this.lying === 0) this.go("idle", rand(1, 2.5));
  }

  private howl(dt: number) {
    this.relax(dt);
    const p = this.t / this.dur;
    this.raise = p < 0.15 ? p / 0.15 : p > 0.85 ? (1 - p) / 0.15 : 1;
    this.wag = Math.sin(this.clock * 3) * 5;
    if (p > 0.2 && this.nextBubble === 0) {
      this.say("howl");
      this.nextBubble = 1;
    }
    if (this.t > this.dur) {
      this.raise = 0;
      this.nextBubble = 0;
      this.go("idle", rand(1.5, 3));
    }
  }

  private pounce(dt: number, env: Env) {
    this.lying = 0;
    const crouch = 0.5;
    if (this.t < crouch) {
      this.squash = 1 - 0.18 * (this.t / crouch); // wiggle down…
      this.wag = Math.sin(this.t * 40) * 12;
      this.tilt = Math.sin(this.t * 30) * 1.2;
      return;
    }
    const jump = (this.t - crouch) / (this.dur - crouch);
    if (jump < 1) {
      this.squash = 1.05;
      this.lift = -Math.sin(jump * Math.PI) * 20; // …and leap
      this.tilt = -12 + jump * 20;
      this.x = clamp(this.x + this.dir * 70 * dt, env.minX, env.maxX);
      return;
    }
    this.squash = 1;
    this.lift = 0;
    this.tilt = 0;
    this.say("heart");
    this.go("idle", rand(1, 2.5));
  }

  /** Back to standing, gently. */
  private relax(dt: number) {
    this.lying = Math.max(0, this.lying - dt * 3);
    this.raise = Math.max(0, this.raise - dt * 3);
    this.squash += (1 - this.squash) * Math.min(1, dt * 8);
  }

  private settle(dt: number) {
    const k = Math.min(1, dt * 8);
    this.tilt += (0 - this.tilt) * k;
    this.lift += (0 - this.lift) * k;
    this.wag += (0 - this.wag) * k;
    this.stride = 0;
    this.relax(dt);
  }

  private go(state: State, dur: number) {
    this.state = state;
    this.t = 0;
    this.dur = dur;
    this.nextBubble = 0;
    if (state !== "nap") this.eyesClosed = false;
  }

  private say(kind: BubbleKind) {
    this.bubbles = [...this.bubbles.slice(-4), { id: ++this.bubbleId, kind, x: this.x, age: 0 }];
  }
}
