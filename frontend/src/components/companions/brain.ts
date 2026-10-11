import { clamp, kick, rand, snap, spring, step, type Spring } from "../../lib/spring";

/**
 * A living companion's little mind (penguin, wolf, cat, otter or Siamese): it wanders about, naps
 * (more at night), visits Moka in the house, sits, stretches, looks around, yawns, sniffs, does its
 * own trick — the penguin and the otter belly-slide, the wolf howls, the cats pounce — and hops
 * happily when touched. Every part of the pose moves on a spring and jumps follow real physics, so
 * nothing snaps: it speeds up and brakes, leans into its steps, lands with a squash. Pure state,
 * stepped by LivingCompanion's frame loop.
 */

export type Kind = "penguin" | "wolf" | "cat" | "otter" | "siamese";
export type State = "idle" | "walk" | "visit" | "nap" | "happy" | "trick" | "sit" | "stretch" | "look" | "yawn" | "sniff";
export type BubbleKind = "z" | "note" | "heart" | "howl" | "dust";

export interface Env {
  minX: number;
  maxX: number;
  night: boolean;
  reduced: boolean;
  /** Scene units per drawing unit (how big it is drawn), so its feet match the ground. */
  scale: number;
  /** Moka's extent (house only), to go and stand beside it. */
  friend: { left: number; right: number } | null;
}

export interface Bubble {
  id: number;
  kind: BubbleKind;
  x: number;
  /** Sideways drift (dust spreads out from the feet). */
  dx: number;
  age: number;
}

/** Per kind: walking pace (scene units/s), stride (drawing units), and what it can do. */
const KINDS: Record<Kind, { speed: number; stride: number; trickOdds: number; poses: boolean }> = {
  penguin: { speed: 26, stride: 10, trickOdds: 15, poses: false }, // belly slide across the room
  wolf: { speed: 40, stride: 17, trickOdds: 12, poses: true }, // sits and howls
  cat: { speed: 38, stride: 14, trickOdds: 15, poses: true }, // crouches then pounces
  otter: { speed: 32, stride: 13, trickOdds: 15, poses: true }, // belly slide too: otters love it
  siamese: { speed: 36, stride: 14, trickOdds: 0, poses: false }, // her drawing strolls
};

/** Its stride, in drawing units: the feet cover exactly this much ground per step cycle. */
export const strideOf = (kind: Kind) => KINDS[kind].stride;

export const BUBBLE_LIFE = 1.6;
export const DUST_LIFE = 0.5;
const GRAVITY = 900; // scene units / s²
const ACCEL = 140; // how fast it gets going and brakes
export const STANCE = 0.6; // share of a stride a foot stays on the ground

/** How high a jump of {@code h} scene units must start. */
const launch = (h: number) => -Math.sqrt(2 * GRAVITY * h);

export class CompanionBrain {
  x: number;
  /** Where it heads (1 right, -1 left); {@code facing} turns towards it (-1 … 1). */
  dir: 1 | -1 = 1;
  state: State = "idle";
  /** The pose, read by the drawing (springs, copied out every frame). */
  facing = 1;
  tilt = 0; // body pitch (deg), leaning into its steps
  lift = 0; // height off the ground (negative = up, scene units)
  squash = 1; // body height (1 at rest): squash on landing, stretch in the air
  lying = 0; // 0 standing … 1 flat (nap, slide)
  raise = 0; // head up (howl, yawn) … down when negative (sniffing)
  sit = 0; // 0 standing … 1 sitting
  bow = 0; // 0 … 1 a stretch, front down and back up
  headTilt = 0; // a curious tilt of the head (deg)
  headBob = 0; // the head following the body's bounce, a little late
  tail = 0; // tail (deg), trailing behind the moves
  flap = 0; // penguin flippers (deg out)
  gait = 0; // 0 still … 1 full trot: how much the legs move
  stride = 0; // where in its stride it is (cycles)
  wag = 0; // a quick wag (tail, flippers), on top of the trailing
  /** It moves fast enough on its belly for speed lines. */
  whoosh = false;
  airborne = false;
  eyesClosed = false;
  bubbles: Bubble[] = [];

  private vx = 0;
  private vy = 0;
  private t = 0;
  private dur = rand(1, 2.5);
  private stage = 0;
  private stageT = 0;
  private hops = 0;
  private target = 0;
  private clock = 0;
  private nextBubble = 0;
  private bubbleId = 0;
  private readonly s: Record<string, Spring>;
  private readonly k: (typeof KINDS)[Kind];

  constructor(
    readonly kind: Kind,
    x: number,
  ) {
    this.x = x;
    this.k = KINDS[kind];
    const soft = (v: number) => spring(v, 90, 14);
    this.s = {
      facing: spring(1, 420, 30),
      tilt: spring(0, 160, 16),
      squash: spring(1, 380, 14), // bouncy: overshoots on landing
      lying: spring(0, 60, 13),
      raise: soft(0),
      sit: spring(0, 70, 13),
      bow: spring(0, 70, 12),
      headTilt: spring(0, 110, 11),
      headBob: spring(0, 260, 15),
      tail: spring(0, 70, 7), // loose: whips behind the moves
      flap: spring(0, 220, 14),
      gait: spring(0, 40, 12),
    };
  }

  /** A tap: a happy hop, with a note or a heart. */
  poke() {
    this.eyesClosed = false;
    this.go("happy", 1.6);
    this.say(Math.random() < 0.5 ? "heart" : "note");
  }

  update(dt: number, env: Env) {
    this.t += dt;
    this.stageT += dt;
    this.clock += dt;
    this.bubbles = this.bubbles
      .map((b) => ({ ...b, age: b.age + dt }))
      .filter((b) => b.age < (b.kind === "dust" ? DUST_LIFE : BUBBLE_LIFE));
    const s = this.s;

    // Neutral pose, then each state bends it.
    s.tilt.target = 0;
    s.squash.target = 1;
    s.lying.target = 0;
    s.raise.target = 0;
    s.sit.target = 0;
    s.bow.target = 0;
    s.headTilt.target = 0;
    s.flap.target = 0;
    let speed = 0; // the pace it wants this frame (towards dir)
    this.wag = Math.sin(this.clock * 1.7) * 7; // a lazy swish

    if (env.reduced) {
      if (this.state !== "idle" && this.t > this.dur) this.go("idle", 2);
      for (const sp of Object.values(s)) snap(sp, sp.target);
      this.vx = 0;
      this.vy = 0;
      this.lift = 0;
      this.airborne = false;
      this.copyPose();
      return;
    }

    switch (this.state) {
      case "idle":
        if (this.t > this.dur) this.pickNext(env);
        break;
      case "walk":
      case "visit":
        speed = this.walkTo(env);
        break;
      case "happy":
        this.wag = Math.sin(this.clock * 24) * 30;
        s.flap.target = 28 + Math.sin(this.clock * 26) * 14;
        this.hop(8, this.kind === "penguin" ? 3 : 2);
        break;
      case "nap":
        // Four-legged ones curl up; the penguin dozes standing, leaning a little.
        if (this.kind === "penguin") s.tilt.target = 4;
        else s.lying.target = 0.7;
        s.squash.target = 1 + Math.sin(this.clock * 1.8) * 0.015; // breathing
        this.wag = 0;
        this.eyesClosed = this.t > 0.6;
        if (this.eyesClosed && this.t > this.nextBubble) {
          this.say("z");
          this.nextBubble = this.t + 1.4;
        }
        if (this.t > this.dur) {
          this.eyesClosed = false;
          // Up from a nap: a good stretch first.
          if (this.k.poses) this.go("stretch", 2.4);
          else this.go("idle", rand(1, 2));
        }
        break;
      case "sit":
        s.sit.target = 1;
        this.wag = Math.sin(this.clock * 1.2) * 4;
        // Now and then a look around, sitting.
        s.headTilt.target = Math.sin(this.t * 0.9) > 0.6 ? 10 : Math.sin(this.t * 0.9) < -0.7 ? -8 : 0;
        if (this.t > this.dur) this.go("idle", rand(0.8, 2));
        break;
      case "stretch": {
        // Front down and back up, hold it with eyes shut, then shake it off.
        const p = this.t / this.dur;
        s.bow.target = p < 0.75 ? 1 : 0;
        this.eyesClosed = p > 0.25 && p < 0.7;
        s.raise.target = p > 0.3 && p < 0.7 ? 0.35 : 0;
        if (this.t > this.dur) this.go("idle", rand(1, 2));
        break;
      }
      case "look": {
        // Head tilts one way, then the other: curious.
        const side = Math.floor(this.t / 0.9) % 3;
        s.headTilt.target = side === 0 ? 12 : side === 1 ? -10 : 0;
        if (this.kind === "penguin") s.tilt.target = side === 0 ? 5 : side === 1 ? -5 : 0;
        if (this.t > this.dur) this.go("idle", rand(0.8, 2));
        break;
      }
      case "yawn": {
        const p = this.t / this.dur;
        s.raise.target = p < 0.75 ? 0.6 : 0;
        s.squash.target = p < 0.75 ? 1.04 : 1;
        this.eyesClosed = p > 0.15 && p < 0.8;
        if (this.t > this.dur) this.go("idle", rand(1, 2));
        break;
      }
      case "sniff":
        s.raise.target = -0.5; // nose to the ground
        s.headTilt.target = Math.sin(this.t * 3) * 4;
        speed = this.t > 0.6 && this.t < this.dur - 0.6 ? this.k.speed * 0.25 : 0; // a few slow steps
        if (this.t > this.dur) this.go("idle", rand(1, 2));
        break;
      case "trick":
        if (this.kind === "penguin" || this.kind === "otter") speed = this.slide(env);
        else if (this.kind === "wolf") this.howl();
        else this.pounce(env);
        break;
    }

    this.move(dt, speed, env);
    this.animate(dt);
  }

  // ---- Behaviours ----

  private pickNext(env: Env) {
    const r = Math.random() * 100;
    const poses = this.k.poses;
    const napOdds = this.kind === "siamese" ? 0 : env.night ? 30 : 8; // her Siamese drawing does not lie down
    const trickOdds = this.k.trickOdds + (this.kind === "wolf" && env.night ? 15 : 0); // wolves howl at night
    const room = env.maxX - env.minX;
    let at = 0;
    const chance = (odds: number) => r < (at += odds);
    if (env.friend && chance(12)) {
      // Stand beside Moka (not on it), then face it.
      const { left, right } = env.friend;
      const fromLeft = (left + right) / 2 > this.x;
      this.target = clamp(fromLeft ? left - 20 : right + 20, env.minX, env.maxX);
      this.go("visit", 12);
    } else if (chance(napOdds)) {
      this.nextBubble = 0.8;
      this.go("nap", rand(7, 12));
    } else if (chance(trickOdds) && (this.kind !== "penguin" && this.kind !== "otter" ? true : room > 120)) {
      if (this.kind === "penguin" || this.kind === "otter") {
        this.target = this.x < (env.minX + env.maxX) / 2 ? rand(env.maxX - room * 0.25, env.maxX) : rand(env.minX, env.minX + room * 0.25);
        this.dir = this.target > this.x ? 1 : -1;
      } else if (this.kind === "cat") {
        const ahead = this.dir > 0 ? env.maxX - this.x : this.x - env.minX;
        if (ahead < 50) this.dir = this.dir > 0 ? -1 : 1; // pounce where there is room
      }
      this.go("trick", this.kind === "wolf" ? 3.2 : 9);
    } else if (chance(8)) {
      this.say("note");
      this.go("happy", 1.6);
    } else if (poses && chance(14)) {
      this.go("sit", rand(3, 6));
    } else if (poses && chance(6)) {
      this.go("stretch", 2.4);
    } else if (chance(12)) {
      this.go("look", rand(2.4, 3.2));
    } else if (poses && chance(5)) {
      this.go("yawn", 1.6);
    } else if (poses && chance(8)) {
      this.go("sniff", rand(2.4, 3.6));
    } else {
      this.target = rand(env.minX, env.maxX);
      this.go("walk", 12);
    }
  }

  /** Walks to the target, slowing down to arrive; returns the pace wanted. */
  private walkTo(env: Env): number {
    const d = this.target - this.x;
    if ((Math.abs(d) < 1.5 && Math.abs(this.vx) < 4) || this.t > this.dur) {
      if (this.state === "visit" && env.friend) {
        this.dir = (env.friend.left + env.friend.right) / 2 > this.x ? 1 : -1;
        this.say("heart");
        this.go("happy", 1.2);
      } else {
        this.go("idle", rand(1.2, 3.5));
      }
      return 0;
    }
    this.dir = d > 0 ? 1 : -1;
    // Brakes in time to stop right there.
    return Math.min(this.k.speed, Math.sqrt(2 * ACCEL * 0.8 * Math.abs(d)));
  }

  /** {@code count} little hops of {@code h}, each with a crouch before it. */
  private hop(h: number, count: number) {
    const s = this.s;
    if (this.airborne) return;
    if (this.stage === 0) {
      s.squash.target = 0.84; // get ready…
      if (this.stageT > 0.1) {
        this.jump(h);
        this.stage = 1;
      }
    } else if (this.stage === 1) {
      // Landed (move() saw it): again, or done.
      this.hops++;
      this.stage = this.hops < count ? 0 : 2;
      this.stageT = 0;
    } else if (this.stageT > 0.25) {
      this.go("idle", rand(0.8, 2));
    }
  }

  private howl() {
    const s = this.s;
    const p = this.t / this.dur;
    s.sit.target = p < 0.92 ? 1 : 0;
    s.raise.target = p > 0.15 && p < 0.85 ? 1 : 0;
    this.eyesClosed = p > 0.2 && p < 0.85;
    this.wag = Math.sin(this.clock * 3) * 4;
    if (p > 0.22 && this.stage === 0) {
      this.say("howl");
      this.stage = 1;
    }
    if (this.t > this.dur) this.go("idle", rand(1.5, 3));
  }

  /** Crouch and wiggle, leap with the front paws out, land with a squash and a puff of dust. */
  private pounce(env: Env) {
    const s = this.s;
    if (this.stage === 0) {
      s.squash.target = 0.82;
      s.bow.target = 0.45;
      this.wag = Math.sin(this.clock * 30) * 14; // the bottom wiggle, in the tail
      s.tilt.target = Math.sin(this.clock * 34) * 1.5;
      if (this.stageT > 0.75) {
        this.jump(18);
        this.vx = this.dir * 95;
        this.stage = 1;
        this.stageT = 0;
      }
    } else if (this.stage === 1) {
      s.squash.target = 1.06;
      s.tilt.target = this.vy < 0 ? -10 : 8; // nose up going up, down coming down
      if (!this.airborne) {
        this.stage = 2;
        this.stageT = 0;
        this.say("heart");
      }
    } else {
      if (this.stageT > 0.5) this.go("idle", rand(1, 2.5));
    }
    this.x = clamp(this.x, env.minX, env.maxX);
  }

  /** Penguin and otter: a little run-up, a dive onto the belly, a long slide, back up. */
  private slide(env: Env): number {
    const s = this.s;
    const d = this.target - this.x;
    if (this.stage === 0) {
      s.squash.target = 0.85;
      if (this.stageT > 0.25) {
        this.jump(5);
        this.vx = this.dir * 70;
        this.stage = 1;
        this.stageT = 0;
      }
      return 0;
    }
    if (this.stage === 1) {
      s.lying.target = 1;
      this.wag = 0;
      // Glides on, slowing down as it goes (move() brakes it).
      if ((Math.abs(this.vx) < 6 && !this.airborne) || Math.abs(d) < 3 || this.stageT > 6) {
        this.vx = 0;
        this.stage = 2;
        this.stageT = 0;
      }
      this.x = clamp(this.x, env.minX, env.maxX);
      return Math.abs(this.vx);
    }
    // Back on its feet, with a little hop.
    if (this.stageT > 0.35 && this.stage === 2) {
      this.jump(4);
      this.stage = 3;
    }
    if (this.stage === 3 && !this.airborne) this.go("idle", rand(1, 2.5));
    s.lying.target = this.stage === 2 ? 1 : 0;
    return 0;
  }

  // ---- Motion ----

  private jump(h: number) {
    this.vy = launch(h);
    this.airborne = true;
    kick(this.s.squash, 2.5); // stretches as it leaves the ground
  }

  private move(dt: number, speed: number, env: Env) {
    const s = this.s;
    s.facing.target = this.dir;
    const sliding = this.state === "trick" && (this.kind === "penguin" || this.kind === "otter") && this.stage === 1;
    const pouncing = this.state === "trick" && this.kind === "cat" && this.stage === 1;
    if (sliding) {
      // On its belly: no legs pushing, it just slows down.
      if (!this.airborne) this.vx = this.dir * Math.max(0, Math.abs(this.vx) - 38 * dt);
    } else if (!pouncing) {
      // Turn round before setting off; speed up and brake smoothly.
      const turned = Math.abs(s.facing.value - this.dir) < 0.6;
      const want = turned ? speed * this.dir : 0;
      const before = this.vx;
      this.vx += clamp(want - this.vx, -ACCEL * dt, ACCEL * dt);
      // Leans into it when speeding up, back when braking.
      const accel = ((this.vx - before) / dt) * this.dir;
      s.tilt.target += clamp(accel * 0.03, -5, 5);
    }
    this.x = clamp(this.x + this.vx * dt, env.minX, env.maxX);

    // Jumps: real gravity, a squash and a puff of dust on landing.
    if (this.airborne) {
      this.vy += GRAVITY * dt;
      this.lift += this.vy * dt;
      if (this.lift >= 0) {
        this.lift = 0;
        this.airborne = false;
        kick(this.s.squash, -Math.min(6, this.vy / 40));
        this.vy = 0;
        if (!sliding) this.vx *= 0.3;
        this.dust();
      }
    }

    // The stride follows the ground covered, so the feet never skate.
    const ground = Math.abs(this.vx) * dt;
    if (!this.airborne && !sliding) this.stride += ground / (this.k.stride * env.scale);
    s.gait.target = this.airborne || sliding ? 0 : clamp(Math.abs(this.vx) / this.k.speed, 0, 1);
    this.whoosh = sliding && Math.abs(this.vx) > 15;

    // A walking body: bobs twice a stride, and the penguin waddles side to side.
    const g = s.gait.value;
    const phase = this.stride * Math.PI * 2;
    if (this.kind === "penguin") s.tilt.target += Math.sin(phase) * 8 * g;
    else s.tilt.target += Math.sin(phase * 2) * 1.2 * g;
    s.flap.target += 12 * g; // flippers out for balance
    s.headBob.target = -Math.abs(Math.sin(phase)) * 1.4 * g;
  }

  private animate(dt: number) {
    const s = this.s;
    // The tail trails behind the moves: the body's speed and its turns push it back.
    s.tail.target = -this.vx * this.dir * 0.25 + (this.airborne ? -12 : 0);
    for (const sp of Object.values(s)) step(sp, dt);
    this.copyPose();
  }

  private copyPose() {
    const s = this.s;
    this.facing = s.facing.value;
    this.tilt = s.tilt.value;
    this.squash = s.squash.value;
    this.lying = clamp(s.lying.value, 0, 1.1);
    this.raise = s.raise.value;
    this.sit = clamp(s.sit.value, 0, 1.1);
    this.bow = s.bow.value;
    this.headTilt = s.headTilt.value;
    this.headBob = s.headBob.value;
    this.tail = s.tail.value;
    this.flap = s.flap.value;
    this.gait = clamp(s.gait.value, 0, 1);
  }

  private go(state: State, dur: number) {
    this.state = state;
    this.t = 0;
    this.dur = dur;
    this.stage = 0;
    this.stageT = 0;
    this.hops = 0;
    this.nextBubble = 0;
    if (state !== "nap" && state !== "stretch" && state !== "yawn") this.eyesClosed = false;
  }

  private say(kind: BubbleKind) {
    this.bubbles = [...this.bubbles.slice(-6), { id: ++this.bubbleId, kind, x: this.x, dx: 0, age: 0 }];
  }

  private dust() {
    for (const dx of [-1, 1]) this.bubbles = [...this.bubbles.slice(-8), { id: ++this.bubbleId, kind: "dust", x: this.x, dx, age: 0 }];
  }
}
