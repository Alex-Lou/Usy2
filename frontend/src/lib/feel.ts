/**
 * The app's touch and sound: a light buzz when reacting or sending, a soft
 * chime when a message, a notification or a "je pense à toi" comes in, app
 * open. Two switches per device (Menu → Sons et vibrations): vibrations on by
 * default, sounds off (a sound out of nowhere in public is annoying). They
 * only concern the app itself: the phone's notifications keep their own sound. Sounds are synthesized with
 * Web Audio, no files; volumes stay low. Where vibration is not supported
 * (iPhone), it simply does nothing.
 */
const VIBRATE_KEY = "memocat.feel.vibrate";
const SOUND_KEY = "memocat.feel.sound";

function read(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

function write(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? "1" : "0");
  } catch {
    /* private mode: just for this visit */
  }
}

export const vibrationsOn = () => read(VIBRATE_KEY, true);
export const soundsOn = () => read(SOUND_KEY, false);

export function setVibrations(on: boolean): void {
  write(VIBRATE_KEY, on);
  if (on) buzz(15); // feel it right away
}

export function setSounds(on: boolean): void {
  write(SOUND_KEY, on);
  if (on) {
    void audio()?.resume(); // unlocked by this tap
    chime("message");
  }
}

function buzz(pattern: number | number[]): void {
  if (vibrationsOn()) navigator.vibrate?.(pattern);
}

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

/** Browsers start sound only after a touch: the first one on the page wakes it up. */
export function primeSound(): () => void {
  const wake = () => {
    if (soundsOn()) void audio()?.resume();
  };
  window.addEventListener("pointerdown", wake, { once: true });
  return () => window.removeEventListener("pointerdown", wake);
}

/** Soft sine notes, one after the other: [frequency Hz, start s]. */
function notes(list: [number, number][], peak = 0.06): void {
  const a = audio();
  if (!a || a.state !== "running") return;
  const now = a.currentTime;
  for (const [hz, at] of list) {
    const osc = a.createOscillator();
    osc.type = "sine";
    osc.frequency.value = hz;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, now + at);
    g.gain.exponentialRampToValueAtTime(peak, now + at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.35);
    osc.connect(g).connect(a.destination);
    osc.start(now + at);
    osc.stop(now + at + 0.4);
  }
}

function chime(kind: "message" | "notify" | "love"): void {
  if (!soundsOn()) return;
  if (kind === "message") notes([[880, 0], [1175, 0.09]]);
  else if (kind === "notify") notes([[1047, 0]], 0.05);
  else notes([[660, 0], [880, 0.12], [1320, 0.24]], 0.07);
}

/** What happens, and how it feels. */
export const feel = {
  /** I reacted or sent something: a light tap. */
  tap: () => buzz(10),
  /** A message arrives while I am reading the chat. */
  message: () => {
    buzz([15, 60, 15]);
    chime("message");
  },
  /** Any other notification while the app is open (the banner at the top). */
  notify: () => {
    buzz(20);
    chime("notify");
  },
  /** "Je pense à toi" arrives. */
  love: () => {
    buzz([30, 80, 30, 80, 60]);
    chime("love");
  },
  /** A game: a word found. */
  found: () => {
    buzz([8, 40, 8]);
    chime("notify");
  },
  /** A game won. */
  win: () => {
    buzz([20, 60, 20, 60, 50]);
    chime("love");
  },
  /** A game: something is wrong. */
  miss: () => buzz([40, 50, 40]),
};
