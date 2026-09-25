import type { CatPose } from "../CatSprite";
import { restingFrame, type EyeShape, type Frame, type MouthShape, type Prop, type View } from "./frame";
import { clamp, kick, pick, rand, snap, spring, step, type Spring } from "./spring";

/** What the cat knows about its surroundings, updated by the page every frame. */
export interface CatEnv {
  /** "house": walks around a room; "stage": stays in place (Messages card). */
  mode: "house" | "stage";
  /** What usePet says it is doing (care reactions, sleep, hunger…). */
  pose: CatPose;
  /** Laser dot or finger, in scene coordinates, when one is out. */
  pointer: { x: number; y: number } | null;
  /** Walkable x range and where the ground is, in scene coordinates. */
  minX: number;
  maxX: number;
  ground: number;
  /** Scene units per drawing unit (the cat's size in the scene). */
  scale: number;
  /** Where the food bowl and the basket are (house only). */
  bowlX: number | null;
  bedX: number | null;
  /** How far up the basket's cushion is, in drawing units. */
  bedLift: number;
  reduced: boolean;
}

export type CatEvent = "purr-start" | "purr-stop" | "meow" | "chirp" | "land";

type Goal = "free" | "sleep" | "eat" | "cuddle" | "bath" | "startle" | "play" | "hungry" | "wake";
type Free = "look" | "groom" | "wander" | "stretch" | "yawn";

const GRAVITY = 1500; // drawing units / s²
const BLINK_TIME = 0.16;

const GOAL_OF: Record<CatPose, Goal> = {
  idle: "free", sleep: "sleep", eat: "eat", purr: "cuddle", bath: "bath", startle: "startle", play: "play", hungry: "hungry",
};

/**
 * The cat's little brain: turns what is asked of it (usePet's pose) into
 * believable behaviour — walking to the bowl before eating, curling up in the
 * basket to sleep, stalking and pouncing on the laser dot, grooming or
 * stretching when left alone — and animates every part with springs.
 */
export class CatBrain {
  readonly frame: Frame;
  onEvent: (e: CatEvent) => void = () => {};

  private readonly s: Record<string, Spring>;
  private goal: Goal = "free";
  private goalTime = 0;
  private free: Free = "look";
  private freeTime = 0;
  private freeDuration = 3;
  private stage = 0; // step inside the current goal
  private stageTime = 0;
  private vx = 0; // scene units / s
  private vy = 0; // drawing units / s (jumps)
  private airborne = false;
  private pounceTo: number | null = null;
  private wanderTo = 0;
  private nextBlink = rand(1.5, 4);
  private blinkT = -1;
  private nextTwitch = rand(3, 7);
  private nextLook = 0;
  private lookTilt = 0;
  private nextMeow = 1;
  private purring = false;
  private lastView: View = "sit";
  private started = false;

  constructor(x: number) {
    this.frame = restingFrame(x);
    const soft = (v: number) => spring(v, 120, 16);
    const snappy = (v: number) => spring(v, 260, 20);
    this.s = {
      sx: spring(1, 300, 14), sy: spring(1, 300, 14), lean: soft(0), facing: spring(1, 90, 15),
      headTilt: soft(0), headX: soft(0), headY: soft(0), earL: snappy(0), earR: snappy(0),
      lookX: spring(0, 90, 14), lookY: spring(0, 90, 14), tail: soft(0), tailPuff: soft(0),
      paw: snappy(0), crouch: snappy(0), blush: soft(0.75), shake: soft(0), stride: soft(0),
    };
  }

  update(dt: number, env: CatEnv): Frame {
    const f = this.frame;
    f.time += dt;
    if (!this.started) {
      this.started = true;
      f.x = env.mode === "house" ? clamp(f.x, env.minX, env.maxX) : f.x;
    }

    const wanted = GOAL_OF[env.pose] ?? "free";
    const leavingSleep = this.goal === "sleep" && wanted !== "sleep";
    const next: Goal = leavingSleep && wanted === "free" ? "wake" : wanted;
    if (next !== this.goal && !(this.goal === "wake" && wanted === "free")) this.setGoal(next);
    this.goalTime += dt;
    this.stageTime += dt;

    // Defaults each frame; goals override what they need.
    let view: View = "sit";
    let eyes: EyeShape = "open";
    let mouth: MouthShape = "smile";
    let prop: Prop = "none";
    const t = this.s;
    t.lean.target = 0;
    t.headTilt.target = 0;
    t.headX.target = 0;
    t.headY.target = 0;
    t.earL.target = 0;
    t.earR.target = 0;
    t.paw.target = 0;
    t.crouch.target = 0;
    t.blush.target = 0.75;
    t.shake.target = 0;
    t.tailPuff.target = 0;
    let tailSpeed = 1.6;
    let tailAmp = 7;
    let tailBase = 0;
    let breathRate = 2.4;
    let purr = false;
    let walking = false;

    switch (this.goal) {
      case "sleep": {
        const atBed = env.mode === "stage" || env.bedX == null || this.moveTo(env.bedX, 70, env, dt);
        walking = !atBed;
        if (atBed) {
          if (this.stage === 0 && env.mode === "house" && env.bedLift > 0) {
            if (env.reduced) this.frame.lift = -env.bedLift;
            else this.jump(260, 0);
            this.stage = 1;
          }
          view = "curl";
          eyes = "closed";
          prop = "zzz";
          breathRate = 1.25;
          tailSpeed = 0.5;
          tailAmp = 4;
          t.headY.target = Math.sin(f.time * 0.6) * 0.6;
        } else {
          view = "side";
          eyes = "open";
          t.earL.target = 6;
          t.earR.target = 6;
        }
        break;
      }
      case "wake": {
        // A good yawn and a stretch before anything else.
        view = this.goalTime < 1.4 ? "sit" : "side";
        eyes = "closed";
        mouth = this.goalTime < 1.4 ? "yawn" : "smile";
        t.earL.target = 12;
        t.earR.target = 12;
        if (this.goalTime >= 1.4) {
          t.lean.target = -13;
          t.crouch.target = 0.45;
        }
        if (this.goalTime > 3) this.setGoal("free");
        break;
      }
      case "eat": {
        // Stands beside the bowl, mouth right above it (the mouth is ~50 units ahead of the body).
        const spot = env.mode === "house" && env.bowlX != null ? env.bowlX + 50 * env.scale : null;
        const there = spot == null || this.moveTo(spot, 90, env, dt);
        walking = !there;
        view = "side";
        if (there) {
          if (spot != null) this.face(-1);
          t.headY.target = 14 + Math.sin(f.time * 9) * 1.6;
          t.headTilt.target = 18;
          eyes = "happy";
          mouth = "munch";
          prop = env.mode === "stage" ? "bowl" : "none";
          tailSpeed = 2.2;
          tailAmp = 10;
          tailBase = 8;
        }
        break;
      }
      case "cuddle": {
        this.stop(dt);
        eyes = "happy";
        purr = true;
        t.headTilt.target = -9 + Math.sin(f.time * 1.3) * 3;
        t.blush.target = 1;
        t.shake.target = 0.35;
        t.earL.target = 8;
        t.earR.target = 8;
        prop = "hearts";
        tailSpeed = 0.9;
        tailAmp = 5;
        breathRate = 1.8;
        break;
      }
      case "bath": {
        this.stop(dt);
        eyes = "squeeze";
        mouth = "wavy";
        t.earL.target = 24;
        t.earR.target = 24;
        t.shake.target = 0.9;
        t.tailPuff.target = 0.6;
        prop = "bubbles";
        tailSpeed = 8;
        tailAmp = 4;
        break;
      }
      case "startle": {
        if (this.stage === 0) {
          this.stage = 1;
          if (!env.reduced) this.jump(300, 0);
        }
        view = this.lastView === "curl" ? "sit" : this.lastView;
        eyes = "wide";
        mouth = "open";
        t.earL.target = 22;
        t.earR.target = 22;
        t.tailPuff.target = this.goalTime < 0.8 ? 1 : 0;
        prop = "alert";
        tailSpeed = 9;
        tailAmp = 6;
        break;
      }
      case "play": {
        view = "side";
        if (env.mode === "house" && env.pointer) {
          walking = this.chase(env, dt);
        } else if (env.mode === "house") {
          walking = this.zoomies(env, dt);
        } else {
          this.stop(dt);
          prop = "ball";
          this.pounceInPlace(env);
        }
        eyes = this.airborne ? "wide" : "open";
        tailSpeed = 6;
        tailAmp = 15;
        tailBase = 10;
        break;
      }
      case "hungry": {
        const spot = env.mode === "house" && env.bowlX != null ? env.bowlX + 62 * env.scale : null;
        const there = spot == null || this.moveTo(spot, 80, env, dt);
        walking = !there;
        if (there) {
          view = "sit";
          t.earL.target = 10;
          t.earR.target = 10;
          t.lookX.target = spot != null ? -0.8 : 0;
          t.lookY.target = 0.4;
          this.nextMeow -= dt;
          if (this.nextMeow <= 0) {
            this.nextMeow = rand(2.6, 4.2);
            this.stage = 1;
            this.stageTime = 0;
            this.onEvent("meow");
          }
          if (this.stage === 1 && this.stageTime < 0.7) {
            mouth = "open";
            prop = "note";
          }
          tailSpeed = 1.2;
          tailAmp = 5;
        } else {
          view = "side";
        }
        break;
      }
      default: {
        const r = this.freeBehaviour(env, dt);
        view = r.view;
        eyes = r.eyes;
        mouth = r.mouth;
        walking = r.walking;
      }
    }

    // Walking: side view, legs in step with the ground covered.
    if (walking || Math.abs(this.vx) > 6) view = this.airborne ? view : "side";
    const speed = Math.abs(this.vx) / env.scale;
    t.stride.target = clamp(speed / 55, 0, 1);
    f.walk += (speed * dt) / 34 * Math.PI * 2;

    // Jumps.
    if (this.airborne) {
      this.vy += GRAVITY * dt;
      f.lift += this.vy * dt;
      const floor = this.goal === "sleep" && env.mode === "house" ? -env.bedLift : 0;
      if (this.vy > 0 && f.lift >= floor) {
        f.lift = floor;
        this.airborne = false;
        this.vx = this.pounceTo != null ? 0 : this.vx;
        this.pounceTo = null;
        kick(t.sy, -5); // landing squash
        kick(t.sx, 3);
        this.onEvent("land");
      }
    } else if (!(this.goal === "sleep" && env.mode === "house" && this.stage === 1)) {
      const bob = view === "side" ? -Math.abs(Math.sin(f.walk)) * 1.8 * this.s.stride.value : 0;
      f.lift = bob;
    }
    f.x = clamp(f.x + this.vx * dt, env.mode === "house" ? env.minX : -Infinity, env.mode === "house" ? env.maxX : Infinity);

    // A little "pop" hides the swap between drawings.
    if (view !== this.lastView) {
      t.sy.value = 0.9;
      t.sx.value = 1.08;
      this.lastView = view;
    }

    // Always alive: blinks, ear twitches, breath, tail.
    this.nextBlink -= dt;
    if (this.nextBlink <= 0 && eyes === "open") {
      this.blinkT = 0;
      this.nextBlink = Math.random() < 0.2 ? 0.25 : rand(2, 5.5); // sometimes a double blink
    }
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      f.blink = this.blinkT < BLINK_TIME ? Math.sin((this.blinkT / BLINK_TIME) * Math.PI) : 0;
      if (this.blinkT >= BLINK_TIME) this.blinkT = -1;
    } else {
      f.blink = 0;
    }
    this.nextTwitch -= dt;
    if (this.nextTwitch <= 0) {
      this.nextTwitch = rand(3, 8);
      kick(Math.random() < 0.5 ? t.earL : t.earR, rand(160, 260));
    }
    f.breath += dt * breathRate;
    t.tail.target = tailBase + Math.sin(f.time * tailSpeed) * tailAmp;

    if (purr !== this.purring) {
      this.purring = purr;
      this.onEvent(purr ? "purr-start" : "purr-stop");
    }

    for (const sp of Object.values(t)) {
      if (env.reduced) snap(sp, sp.target);
      else step(sp, dt);
    }
    f.view = view;
    f.eyes = eyes;
    f.mouth = mouth;
    if (prop !== f.prop) f.propTime = 0;
    f.prop = prop;
    f.propTime += dt;
    f.sx = t.sx.value;
    f.sy = t.sy.value;
    f.lean = t.lean.value;
    f.facing = t.facing.value;
    f.headTilt = t.headTilt.value;
    f.headX = t.headX.value;
    f.headY = t.headY.value;
    f.earL = t.earL.value;
    f.earR = t.earR.value;
    f.lookX = clamp(t.lookX.value, -1, 1);
    f.lookY = clamp(t.lookY.value, -1, 1);
    f.tail = t.tail.value;
    f.tailPuff = Math.max(0, t.tailPuff.value);
    f.paw = clamp(t.paw.value, 0, 1);
    f.crouch = clamp(t.crouch.value, 0, 1);
    f.blush = clamp(t.blush.value, 0, 1);
    f.shake = Math.max(0, t.shake.value);
    f.stride = clamp(t.stride.value, 0, 1);
    f.breathDepth = view === "curl" ? 1.3 : 1;
    if (env.reduced) {
      f.breathDepth = 0;
      f.shake = 0;
    }
    return f;
  }

  private setGoal(goal: Goal) {
    this.goal = goal;
    this.goalTime = 0;
    this.stage = 0;
    this.stageTime = 0;
    this.nextMeow = 0.6;
    this.nextLook = 0;
    this.s.lookX.target = 0;
    this.s.lookY.target = 0;
    // Up in the basket and asked to do something else: hop down first.
    if (goal !== "sleep" && this.frame.lift < -2 && !this.airborne) {
      this.airborne = true;
      this.vy = -140;
    }
    if (goal === "free") this.startFree("look");
  }

  // — Moving around —

  /** Walks (or trots) to x; true once there. */
  private moveTo(x: number, speed: number, env: CatEnv, dt: number): boolean {
    const target = clamp(x, env.minX, env.maxX);
    const d = target - this.frame.x;
    if (env.reduced) {
      this.frame.x = target;
      this.vx = 0;
      return true;
    }
    if (Math.abs(d) < 3 && Math.abs(this.vx) < 12) {
      this.vx = 0;
      return true;
    }
    const max = speed * env.scale * 1.5;
    const wanted = Math.sign(d) * Math.min(max, Math.sqrt(2 * 380 * Math.abs(d)));
    this.vx += clamp(wanted - this.vx, -520 * dt, 520 * dt);
    this.face(Math.sign(d));
    return false;
  }

  private stop(dt: number) {
    this.vx -= clamp(this.vx, -600 * dt, 600 * dt);
  }

  private face(dir: number) {
    if (dir !== 0) this.s.facing.target = dir > 0 ? 1 : -1;
  }

  /** Crouch, then leap (vx in scene units / s). */
  private jump(power: number, vx: number) {
    this.airborne = true;
    this.vy = -power;
    this.vx = vx;
    this.s.sy.value = 1.14;
    this.s.sx.value = 0.9;
  }

  // — Playing —

  /** Laser: run after the dot, stalk it with a wiggle, then pounce. */
  private chase(env: CatEnv, dt: number): boolean {
    const p = env.pointer!;
    const f = this.frame;
    const t = this.s;
    const d = p.x - f.x;
    t.lookX.target = clamp(d / 80, -1, 1) * Math.sign(this.s.facing.target || 1);
    t.lookY.target = clamp((p.y - (env.ground - 60 * env.scale)) / 80, -1, 1);
    if (this.airborne) return false;
    if (Math.abs(d) > 110 * env.scale) {
      this.stage = 0;
      this.moveTo(p.x, 150, env, dt);
      return true;
    }
    // Close enough: stalk (crouch + butt wiggle), then pounce onto the dot.
    this.stop(dt);
    this.face(Math.sign(d));
    if (this.stage === 0) {
      this.stage = 1;
      this.stageTime = 0;
      this.freeDuration = rand(0.5, 1.1);
    }
    t.crouch.target = 1;
    t.lean.target = 4 + Math.sin(f.time * 16) * 3;
    if (this.stageTime > this.freeDuration && !env.reduced) {
      this.stage = 0;
      this.pounceTo = p.x;
      this.jump(330, d / 0.44);
      this.onEvent("chirp");
    }
    return false;
  }

  /** Play without a laser: dash across the room and pounce on nothing. */
  private zoomies(env: CatEnv, dt: number): boolean {
    if (this.stage === 0) {
      this.stage = 1;
      this.wanderTo = this.frame.x > (env.minX + env.maxX) / 2 ? rand(env.minX, env.minX + 60) : rand(env.maxX - 60, env.maxX);
    }
    if (this.airborne) return false;
    if (this.stage === 1 && this.moveTo(this.wanderTo, 170, env, dt)) {
      this.stage = 2;
      this.stageTime = 0;
    }
    if (this.stage === 2) {
      this.s.crouch.target = 1;
      this.s.lean.target = 4 + Math.sin(this.frame.time * 16) * 3;
      if (this.stageTime > 0.7 && !env.reduced) {
        this.stage = 0;
        this.jump(300, -Math.sign(this.s.facing.target) * 40);
        this.onEvent("chirp");
      }
    }
    return this.stage === 1;
  }

  /** Messages card: bats at the bouncing ball, with little hops. */
  private pounceInPlace(env: CatEnv) {
    const t = this.s;
    this.face(1);
    t.lookX.target = 1;
    t.lookY.target = Math.sin(this.frame.time * 5) * 0.8;
    if (this.airborne) return;
    t.crouch.target = 0.8;
    t.lean.target = 3 + Math.sin(this.frame.time * 16) * 3;
    if (this.stageTime > 0.9 && !env.reduced) {
      this.stageTime = 0;
      this.jump(240, 0);
      this.onEvent("chirp");
    }
  }

  // — Left alone —

  private startFree(kind: Free) {
    this.free = kind;
    this.freeTime = 0;
    this.freeDuration = { look: rand(3, 7), groom: rand(3, 4.5), wander: 12, stretch: 2.4, yawn: 1.6 }[kind];
  }

  private freeBehaviour(env: CatEnv, dt: number): { view: View; eyes: EyeShape; mouth: MouthShape; walking: boolean } {
    const t = this.s;
    const f = this.frame;
    this.freeTime += dt;
    let view: View = "sit";
    let eyes: EyeShape = "open";
    let mouth: MouthShape = "smile";
    let walking = false;

    switch (this.free) {
      case "look": {
        this.stop(dt);
        this.nextLook -= dt;
        if (this.nextLook <= 0) {
          this.nextLook = rand(0.9, 2.4);
          const lookAtUs = Math.random() < 0.35;
          t.lookX.target = lookAtUs ? 0 : rand(-1, 1);
          t.lookY.target = lookAtUs ? 0.15 : rand(-0.7, 0.5);
          this.lookTilt = lookAtUs ? rand(-6, 6) : t.lookX.target * 7;
        }
        t.headTilt.target = this.lookTilt;
        break;
      }
      case "groom": {
        this.stop(dt);
        const lick = Math.sin(this.freeTime * 7);
        t.paw.target = this.freeTime < 0.3 ? this.freeTime / 0.3 : 0.85 + lick * 0.15;
        t.headTilt.target = 7 + lick * 3;
        eyes = "closed";
        mouth = "tongue";
        t.lookX.target = 0;
        break;
      }
      case "wander": {
        walking = !this.moveTo(this.wanderTo, 55, env, dt);
        view = walking ? "side" : "sit";
        t.lookX.target = 0.3;
        if (!walking) this.freeTime = this.freeDuration;
        break;
      }
      case "stretch": {
        this.stop(dt);
        view = "side";
        t.lean.target = -13;
        t.crouch.target = 0.45;
        eyes = "closed";
        mouth = this.freeTime > 0.5 && this.freeTime < 1.8 ? "yawn" : "smile";
        break;
      }
      case "yawn": {
        this.stop(dt);
        eyes = "closed";
        mouth = "yawn";
        t.earL.target = 10;
        t.earR.target = 10;
        break;
      }
    }

    if (this.freeTime >= this.freeDuration && !this.airborne) {
      const canWander = env.mode === "house" && !env.reduced;
      const options: Free[] = env.reduced
        ? ["look"]
        : canWander
          ? ["look", "look", "look", "groom", "groom", "wander", "wander", "wander", "stretch", "yawn"]
          : ["look", "look", "look", "groom", "groom", "stretch", "yawn"];
      const next = pick(options.filter((o) => o !== this.free || o === "look"));
      if (next === "wander") {
        const span = env.maxX - env.minX;
        let to = rand(env.minX, env.maxX);
        if (Math.abs(to - f.x) < span * 0.2) to = f.x > env.minX + span / 2 ? env.minX + span * 0.15 : env.maxX - span * 0.15;
        this.wanderTo = to;
      }
      this.startFree(next);
    }
    return { view, eyes, mouth, walking };
  }
}
