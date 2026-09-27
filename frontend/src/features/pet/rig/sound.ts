/**
 * The cat's voice, synthesized on the spot with Web Audio (no sound files):
 * a soft purr, a short meow and a "mrrp" chirp when it pounces. Off by default;
 * the choice is remembered on this device. Volumes stay low on purpose.
 */
const KEY = "memocat.petSound";

let ctx: AudioContext | null = null;
let purrNodes: { stop: () => void } | null = null;

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* private mode: just for this visit */
  }
  if (on) void audio()?.resume(); // unlocked by this tap
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  return ctx;
}

function envelope(g: GainNode, now: number, peak: number, attack: number, hold: number, release: number) {
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peak, now + attack);
  g.gain.setValueAtTime(peak, now + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, now + attack + hold + release);
}

/** A voice through two formant filters, gliding along `pitch` [time, Hz] points. */
function voice(pitch: [number, number][], formants: number[], peak: number) {
  const a = audio();
  if (!a || a.state !== "running") return;
  const now = a.currentTime;
  const end = pitch[pitch.length - 1][0];
  const osc = a.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(pitch[0][1], now);
  for (const [t, hz] of pitch.slice(1)) osc.frequency.exponentialRampToValueAtTime(hz, now + t);
  const out = a.createGain();
  envelope(out, now, peak, 0.03, Math.max(0.01, end - 0.12), 0.09);
  out.connect(a.destination);
  for (const hz of formants) {
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = hz;
    bp.Q.value = 6;
    osc.connect(bp).connect(out);
  }
  osc.start(now);
  osc.stop(now + end + 0.05);
}

export const catSound = {
  meow() {
    voice([[0, 520], [0.14, 860], [0.46, 600]], [1100, 2400], 0.12);
  },
  chirp() {
    voice([[0, 420], [0.1, 780], [0.16, 700]], [1300, 2800], 0.08);
  },
  /** Starts or stops the purr (low rumble of noise, pulsing ~25 times a second). */
  purr(on: boolean) {
    if (!on) {
      purrNodes?.stop();
      purrNodes = null;
      return;
    }
    const a = audio();
    if (!a || a.state !== "running" || purrNodes) return;
    const buffer = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; // brown-ish noise: deep, soft
      data[i] = last * 3.5;
    }
    const noise = a.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const low = a.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 320;
    const pulse = a.createGain();
    pulse.gain.value = 0.5;
    const lfo = a.createOscillator();
    lfo.frequency.value = 25;
    const depth = a.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth).connect(pulse.gain);
    const out = a.createGain();
    out.gain.setValueAtTime(0.0001, a.currentTime);
    out.gain.exponentialRampToValueAtTime(0.09, a.currentTime + 0.4);
    noise.connect(low).connect(pulse).connect(out).connect(a.destination);
    noise.start();
    lfo.start();
    purrNodes = {
      stop: () => {
        const t = a.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), t);
        out.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        noise.stop(t + 0.4);
        lfo.stop(t + 0.4);
      },
    };
  },
};
