import type { ReactNode } from "react";
import { SPECIES, SPECIES_LABELS, type Species } from "../../app/companion";
import { Animal, AnimalCharm } from "../ui/animals";
import { HeartMark, SparkleMarks } from "../ui/decor";

/**
 * Local, curated sticker collection — 100% our own art (chibi animals, marks,
 * animated emojis). No third-party service, no licensing, nothing leaves the app.
 * A sticker travels as a plain-text token `[[s:<id>]]` inside a comment or a
 * message, so the backend stores ordinary text and nothing can inject markup.
 */
export type StickerKind = "sticker" | "animated";

/** The picker's packs. Every sticker belongs to one. */
export type PackId = "compagnons" | "amour" | "humeurs" | "quotidien" | "latino" | "francais" | "english";

export const PACKS: { id: PackId; label: string; icon: string }[] = [
  { id: "compagnons", label: "Compagnons", icon: "🐱" },
  { id: "amour", label: "Amour", icon: "💕" },
  { id: "humeurs", label: "Humeurs", icon: "😴" },
  { id: "quotidien", label: "Quotidien", icon: "☕" },
  { id: "latino", label: "Latino", icon: "🌶️" },
  { id: "francais", label: "Français", icon: "🥐" },
  { id: "english", label: "English", icon: "🗽" },
];

export interface Sticker {
  id: string;
  label: string;
  /** "sticker": plain SVG (the photo studio can place it); "animated": anything else. */
  kind: StickerKind;
  pack: PackId;
  render: (size: number) => ReactNode;
}

const animal = (s: Species, anim = "") => (size: number) => (
  <span className={`inline-block ${anim}`}>
    <Animal species={s} size={size} />
  </span>
);

const emoji = (char: string, anim: string) => (size: number) => (
  <span className={`mc-emoji inline-block ${anim}`} style={{ fontSize: Math.round(size * 0.78) }}>
    {char}
  </span>
);

/** A companion in a pose: the chibi animal plus a small emoji that tells it (💤, 🍖…). */
const pose = (s: Species, badge: string, anim: string, at: "top" | "bottom" = "top") => (size: number) => (
  <span className="relative inline-block" style={{ width: size, height: size }}>
    <span className={`inline-block ${anim}`}>
      <Animal species={s} size={size} />
    </span>
    <span className="mc-emoji absolute" style={{ fontSize: Math.round(size * 0.36), right: -Math.round(size * 0.04), [at]: -Math.round(size * 0.04) }}>
      {badge}
    </span>
  </span>
);

/** Two companions side by side, with a heart above them. */
const duo = (a: Species, b: Species, badge: string) => (size: number) => (
  <span className="mc-float relative inline-flex items-end justify-center" style={{ width: size, height: size }}>
    <Animal species={a} size={Math.round(size * 0.58)} className="-mr-2" />
    <Animal species={b} size={Math.round(size * 0.58)} />
    <span className="mc-emoji mc-pulse absolute left-[40%] top-0" style={{ fontSize: Math.round(size * 0.3) }}>
      {badge}
    </span>
  </span>
);

/** An emoji with a small caption under it ("dodo", "en route"…). */
const captioned = (char: string, caption: string, anim: string) => (size: number) => (
  <span className="inline-flex flex-col items-center" style={{ width: size }}>
    <span className={`mc-emoji inline-block ${anim}`} style={{ fontSize: Math.round(size * 0.6) }}>
      {char}
    </span>
    <span
      className="-mt-0.5 max-w-full truncate whitespace-nowrap rounded-full bg-primary px-1.5 font-script leading-tight text-primary-foreground shadow"
      style={{ fontSize: Math.max(8, Math.round(size * 0.17)) }}
    >
      {caption}
    </span>
  </span>
);

/** A little note in a bubble, like "je t'aime". */
const note = (text: string, char: string) => (size: number) => (
  <span
    className="inline-flex items-center gap-1 whitespace-nowrap rounded-2xl rounded-bl-sm bg-primary px-3 py-1.5 font-script text-primary-foreground shadow-glow"
    style={{ fontSize: Math.round(size * 0.22) }}
  >
    {text}
    <span className="mc-emoji">{char}</span>
  </span>
);

/** A companion saying something, in a speech bubble above its head. */
const says = (s: Species, text: string, anim: string) => (size: number) => (
  <span className="relative inline-flex flex-col items-center" style={{ width: size, height: size }}>
    <span
      className="relative z-10 -mb-1 max-w-[140%] whitespace-nowrap rounded-xl bg-surface px-1.5 py-0.5 font-display font-bold leading-tight text-text shadow ring-1 ring-border"
      style={{ fontSize: Math.max(8, Math.round(size * 0.16)) }}
    >
      {text}
    </span>
    <span className={`inline-block ${anim}`}>
      <Animal species={s} size={Math.round(size * 0.72)} />
    </span>
  </span>
);

/** A bold word in a colour burst, comic style ("OMG", "WESH"…); long words get smaller to stay about as wide as the sticker. */
const burst = (text: string, bg: string, anim: string) => (size: number) => (
  <span className={`inline-block p-1 ${anim}`}>
    <span
      className="inline-grid place-items-center whitespace-nowrap rounded-2xl px-2 font-display font-black uppercase italic leading-none text-white shadow-glow"
      style={{
        fontSize: Math.round(Math.min(size * 0.26, (size * 1.5) / (text.length * 0.64))),
        height: Math.round(size * 0.58),
        background: bg,
        textShadow: "0 2px 0 rgba(0,0,0,0.35)",
        transform: "rotate(-4deg)",
      }}
    >
      {text}
    </span>
  </span>
);

function LoveNote({ size }: { size: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-2xl rounded-bl-sm bg-primary px-3 py-1.5 font-script text-primary-foreground shadow-glow" style={{ fontSize: Math.round(size * 0.3) }}>
      je t&apos;aime
      <HeartMark size={Math.round(size * 0.3)} className="text-primary-foreground" />
    </span>
  );
}

export const STICKERS: readonly Sticker[] = [
  // — Nos compagnons: the chibi animals, still and in poses —
  ...SPECIES.map((s): Sticker => ({ id: s, label: SPECIES_LABELS[s], kind: "sticker", pack: "compagnons", render: animal(s) })),
  { id: "chat-coucou", label: "Chat coucou", kind: "animated", pack: "compagnons", render: animal("cat", "mc-wiggle") },
  { id: "chat-porte-cle", label: "Chat porte-clé", kind: "animated", pack: "compagnons", render: (size) => <AnimalCharm species="cat" width={Math.round(size * 0.42)} /> },
  { id: "lapin-saute", label: "Lapin qui saute", kind: "animated", pack: "compagnons", render: animal("rabbit", "mc-hop") },
  { id: "chien-content", label: "Chien content", kind: "animated", pack: "compagnons", render: animal("dog", "mc-wiggle") },
  { id: "capy-zen", label: "Capybara zen", kind: "animated", pack: "compagnons", render: animal("capybara", "mc-float") },
  { id: "raton-malin", label: "Raton malin", kind: "animated", pack: "compagnons", render: animal("raccoon", "mc-shake") },
  { id: "rouge-gorge", label: "Rouge-gorge", kind: "animated", pack: "compagnons", render: animal("robin", "mc-hop") },
  { id: "chat-dodo", label: "Chat qui dort", kind: "animated", pack: "compagnons", render: pose("cat", "💤", "mc-float") },
  { id: "chien-mange", label: "Chien qui mange", kind: "animated", pack: "compagnons", render: pose("dog", "🍖", "mc-hop", "bottom") },
  { id: "raton-boude", label: "Raton qui boude", kind: "animated", pack: "compagnons", render: pose("raccoon", "💢", "mc-shake") },
  { id: "lapin-amoureux", label: "Lapin amoureux", kind: "animated", pack: "compagnons", render: pose("rabbit", "💕", "mc-pulse") },
  { id: "loup-coucou", label: "Loup coucou", kind: "animated", pack: "compagnons", render: pose("wolf", "👋", "mc-wiggle") },
  { id: "capy-cafe", label: "Capybara café", kind: "animated", pack: "compagnons", render: pose("capybara", "☕", "mc-float", "bottom") },
  { id: "perroquet-fete", label: "Perroquet en fête", kind: "animated", pack: "compagnons", render: pose("parrot", "🎉", "mc-hop") },
  { id: "lezard-soleil", label: "Lézard au soleil", kind: "animated", pack: "compagnons", render: pose("lizard", "😎", "mc-sway") },
  { id: "chat-froid", label: "Chat qui a froid", kind: "animated", pack: "compagnons", render: pose("cat", "❄️", "mc-shake") },
  { id: "calin-duo", label: "Câlin à deux", kind: "animated", pack: "compagnons", render: duo("cat", "dog", "💞") },

  // — Amour & câlins —
  { id: "coeur", label: "Cœur", kind: "sticker", pack: "amour", render: (size) => <HeartMark size={size} beating={false} /> },
  { id: "coeur-bat", label: "Cœur qui bat", kind: "animated", pack: "amour", render: (size) => <HeartMark size={size} /> },
  { id: "je-t-aime", label: "Je t'aime", kind: "animated", pack: "amour", render: (size) => <LoveNote size={size} /> },
  { id: "tu-me-manques", label: "Tu me manques", kind: "animated", pack: "amour", render: note("tu me manques", "🥺") },
  { id: "je-pense-a-toi", label: "Je pense à toi", kind: "animated", pack: "amour", render: note("je pense à toi", "💭") },
  { id: "gros-calin", label: "Gros câlin", kind: "animated", pack: "amour", render: note("gros câlin", "🤗") },
  { id: "mon-coeur", label: "Mon cœur", kind: "animated", pack: "amour", render: note("mon cœur", "💖") },
  { id: "a-tout-de-suite", label: "À tout de suite", kind: "animated", pack: "amour", render: note("à tout de suite", "🏃") },
  { id: "merci", label: "Merci", kind: "animated", pack: "amour", render: note("merci", "❤️") },
  { id: "bisou", label: "Bisou", kind: "animated", pack: "amour", render: emoji("😘", "mc-pulse") },
  { id: "bisous", label: "Bisous", kind: "animated", pack: "amour", render: captioned("💋", "bisous", "mc-float") },
  { id: "calin", label: "Câlin", kind: "animated", pack: "amour", render: emoji("🤗", "mc-hop") },
  { id: "amoureux", label: "Amoureux", kind: "animated", pack: "amour", render: emoji("🥰", "mc-float") },
  { id: "coeurs", label: "Cœurs", kind: "animated", pack: "amour", render: emoji("💕", "mc-float") },
  { id: "lettre", label: "Lettre d'amour", kind: "animated", pack: "amour", render: emoji("💌", "mc-wiggle") },
  { id: "rose", label: "Rose", kind: "animated", pack: "amour", render: emoji("🌹", "mc-sway") },

  // — Humeurs: how it's going, at a glance —
  { id: "youpi", label: "Youpi", kind: "animated", pack: "humeurs", render: captioned("🥳", "youpi", "mc-hop") },
  { id: "trop-bien", label: "Trop bien", kind: "animated", pack: "humeurs", render: captioned("😎", "trop bien", "mc-wiggle") },
  { id: "wouah", label: "Wouah", kind: "animated", pack: "humeurs", render: captioned("🤩", "wouah", "mc-pulse") },
  { id: "hihi", label: "Hihi", kind: "animated", pack: "humeurs", render: captioned("🤭", "hihi", "mc-hop") },
  { id: "mort-de-rire", label: "Mort de rire", kind: "animated", pack: "humeurs", render: emoji("😂", "mc-shake") },
  { id: "zen", label: "Zen", kind: "animated", pack: "humeurs", render: captioned("😌", "zen", "mc-float") },
  { id: "dodo", label: "Dodo", kind: "animated", pack: "humeurs", render: captioned("😴", "dodo", "mc-float") },
  { id: "la-flemme", label: "La flemme", kind: "animated", pack: "humeurs", render: captioned("🫠", "la flemme", "mc-float") },
  { id: "oups", label: "Oups", kind: "animated", pack: "humeurs", render: captioned("😳", "oups", "mc-wiggle") },
  { id: "stress", label: "Stress", kind: "animated", pack: "humeurs", render: captioned("😰", "stress", "mc-shake") },
  { id: "grrr", label: "Grrr", kind: "animated", pack: "humeurs", render: captioned("😤", "grrr", "mc-shake") },
  { id: "boude", label: "Boude", kind: "animated", pack: "humeurs", render: captioned("😒", "boude", "mc-sway") },
  { id: "bobo", label: "Bobo", kind: "animated", pack: "humeurs", render: captioned("🤒", "bobo", "mc-sway") },
  { id: "snif", label: "Snif", kind: "animated", pack: "humeurs", render: emoji("🥺", "mc-hop") },
  { id: "bravo", label: "Bravo", kind: "animated", pack: "humeurs", render: emoji("👏", "mc-shake") },
  { id: "feu", label: "Le feu", kind: "animated", pack: "humeurs", render: emoji("🔥", "mc-pulse") },

  // — Quotidien & fêtes —
  { id: "cafe", label: "Café ?", kind: "animated", pack: "quotidien", render: emoji("☕", "mc-float") },
  { id: "bonne-journee", label: "Bonne journée", kind: "animated", pack: "quotidien", render: captioned("☀️", "bonne journée", "mc-pulse") },
  { id: "faim", label: "J'ai faim", kind: "animated", pack: "quotidien", render: captioned("🍕", "j'ai faim", "mc-wiggle") },
  { id: "en-route", label: "En route", kind: "animated", pack: "quotidien", render: captioned("🚗", "en route", "mc-hop") },
  { id: "au-boulot", label: "Au boulot", kind: "animated", pack: "quotidien", render: captioned("💼", "au boulot", "mc-sway") },
  { id: "sport", label: "Sport", kind: "animated", pack: "quotidien", render: captioned("🏃", "sport", "mc-hop") },
  { id: "courses", label: "Courses", kind: "animated", pack: "quotidien", render: captioned("🛒", "courses", "mc-wiggle") },
  { id: "a-la-maison", label: "À la maison", kind: "animated", pack: "quotidien", render: captioned("🏠", "à la maison", "mc-float") },
  { id: "il-pleut", label: "Il pleut", kind: "animated", pack: "quotidien", render: captioned("☔", "il pleut", "mc-sway") },
  { id: "vacances", label: "Vacances", kind: "animated", pack: "quotidien", render: captioned("🏖️", "vacances", "mc-float") },
  { id: "bonne-nuit", label: "Bonne nuit", kind: "animated", pack: "quotidien", render: emoji("🌙", "mc-sway") },
  { id: "fete", label: "Fête", kind: "animated", pack: "quotidien", render: emoji("🎉", "mc-wiggle") },
  { id: "etincelles", label: "Étincelles", kind: "animated", pack: "quotidien", render: (size) => <SparkleMarks size={size} /> },
  { id: "anniversaire", label: "Joyeux anniversaire", kind: "animated", pack: "quotidien", render: captioned("🎂", "joyeux anniv", "mc-hop") },
  { id: "noel", label: "Joyeux Noël", kind: "animated", pack: "quotidien", render: captioned("🎄", "joyeux Noël", "mc-sway") },
  { id: "bonne-annee", label: "Bonne année", kind: "animated", pack: "quotidien", render: captioned("🎆", "bonne année", "mc-pulse") },

  // — Latino —
  { id: "que-chimba", label: "¡Qué chimba!", kind: "animated", pack: "latino", render: burst("¡qué chimba!", "linear-gradient(135deg,#ff5f6d,#ffc371)", "mc-wiggle") },
  { id: "ay-no", label: "Ay no…", kind: "animated", pack: "latino", render: says("cat", "ay no… 😩", "mc-shake") },
  { id: "dale", label: "¡Dale!", kind: "animated", pack: "latino", render: burst("¡dale!", "linear-gradient(135deg,#11998e,#38ef7d)", "mc-hop") },
  { id: "mi-amor", label: "Mi amor", kind: "animated", pack: "latino", render: note("mi amor", "💕") },
  { id: "que-onda", label: "¿Qué onda?", kind: "animated", pack: "latino", render: says("parrot", "¿qué onda?", "mc-hop") },
  { id: "no-manches", label: "No manches", kind: "animated", pack: "latino", render: captioned("🤯", "no manches", "mc-shake") },
  { id: "andale", label: "¡Ándale!", kind: "animated", pack: "latino", render: says("dog", "¡ándale!", "mc-hop") },
  { id: "te-quiero", label: "Te quiero mucho", kind: "animated", pack: "latino", render: note("te quiero mucho", "❤️") },
  { id: "chevere", label: "Chévere", kind: "animated", pack: "latino", render: captioned("😎", "chévere", "mc-wiggle") },
  { id: "que-rico", label: "¡Qué rico!", kind: "animated", pack: "latino", render: captioned("🌮", "¡qué rico!", "mc-wiggle") },
  { id: "ay-dios-mio", label: "¡Ay, Dios mío!", kind: "animated", pack: "latino", render: says("capybara", "¡ay, Dios mío!", "mc-shake") },
  { id: "besitos", label: "Besitos", kind: "animated", pack: "latino", render: captioned("😘", "besitos", "mc-pulse") },
  { id: "buenas-noches", label: "Buenas noches", kind: "animated", pack: "latino", render: captioned("🌙", "buenas noches", "mc-sway") },
  { id: "fiesta", label: "¡Fiesta!", kind: "animated", pack: "latino", render: burst("¡fiesta!", "linear-gradient(135deg,#f953c6,#b91d73)", "mc-hop") },

  // — Français —
  { id: "oh-la-la", label: "Oh là là", kind: "animated", pack: "francais", render: says("cat", "oh là là !", "mc-wiggle") },
  { id: "wesh", label: "Wesh", kind: "animated", pack: "francais", render: burst("wesh", "linear-gradient(135deg,#4776e6,#8e54e9)", "mc-wiggle") },
  { id: "la-hess", label: "C'est la hess", kind: "animated", pack: "francais", render: says("raccoon", "c'est la hess", "mc-sway") },
  { id: "trop-mims", label: "Trop mims", kind: "animated", pack: "francais", render: captioned("🥹", "trop mims", "mc-pulse") },
  { id: "grave", label: "Grave", kind: "animated", pack: "francais", render: burst("grave", "linear-gradient(135deg,#ff512f,#dd2476)", "mc-hop") },
  { id: "ca-roule", label: "Ça roule", kind: "animated", pack: "francais", render: captioned("🛼", "ça roule", "mc-sway") },
  { id: "chaud", label: "Chaud !", kind: "animated", pack: "francais", render: says("dog", "chaud !", "mc-hop") },
  { id: "tkt", label: "Tkt", kind: "animated", pack: "francais", render: says("capybara", "tkt 😌", "mc-float") },
  { id: "mdr", label: "Mdr", kind: "animated", pack: "francais", render: burst("mdr", "linear-gradient(135deg,#f7971e,#ffd200)", "mc-shake") },
  { id: "bon-app", label: "Bon app'", kind: "animated", pack: "francais", render: captioned("🥖", "bon app'", "mc-wiggle") },
  { id: "la-base", label: "La base", kind: "animated", pack: "francais", render: captioned("👌", "la base", "mc-pulse") },
  { id: "flemme-fr", label: "Flemme", kind: "animated", pack: "francais", render: says("cat", "flemme…", "mc-float") },
  { id: "bisous-fr", label: "Gros bisous", kind: "animated", pack: "francais", render: note("gros bisous", "😘") },
  { id: "cest-ouf", label: "C'est ouf", kind: "animated", pack: "francais", render: burst("c'est ouf", "linear-gradient(135deg,#00c6ff,#0072ff)", "mc-pulse") },

  // — English —
  { id: "omg", label: "OMG", kind: "animated", pack: "english", render: burst("omg", "linear-gradient(135deg,#ff416c,#ff4b2b)", "mc-shake") },
  { id: "bruh", label: "Bruh", kind: "animated", pack: "english", render: says("wolf", "bruh.", "mc-sway") },
  { id: "no-cap", label: "No cap", kind: "animated", pack: "english", render: captioned("🧢", "no cap", "mc-wiggle") },
  { id: "love-ya", label: "Love ya", kind: "animated", pack: "english", render: note("love ya", "💖") },
  { id: "mood", label: "Mood", kind: "animated", pack: "english", render: says("cat", "mood", "mc-float") },
  { id: "same", label: "Same", kind: "animated", pack: "english", render: says("raccoon", "same 😅", "mc-hop") },
  { id: "lol", label: "LOL", kind: "animated", pack: "english", render: burst("lol", "linear-gradient(135deg,#f7971e,#ffd200)", "mc-shake") },
  { id: "slay", label: "Slay", kind: "animated", pack: "english", render: burst("slay", "linear-gradient(135deg,#da22ff,#9733ee)", "mc-pulse") },
  { id: "vibes", label: "Vibes", kind: "animated", pack: "english", render: captioned("✨", "good vibes", "mc-float") },
  { id: "sus", label: "Sus", kind: "animated", pack: "english", render: says("lizard", "sus 🤨", "mc-sway") },
  { id: "miss-u", label: "Miss u", kind: "animated", pack: "english", render: note("miss u", "🥺") },
  { id: "lets-go", label: "Let's go", kind: "animated", pack: "english", render: burst("let's go!", "linear-gradient(135deg,#11998e,#38ef7d)", "mc-hop") },
  { id: "whatever", label: "Whatever", kind: "animated", pack: "english", render: captioned("🙄", "whatever", "mc-sway") },
  { id: "sweet-dreams", label: "Sweet dreams", kind: "animated", pack: "english", render: captioned("🌙", "sweet dreams", "mc-sway") },
];

const BY_ID = new Map(STICKERS.map((s) => [s.id, s]));

export function findSticker(id: string): Sticker | undefined {
  return BY_ID.get(id);
}

export function stickerToken(id: string): string {
  return `[[s:${id}]]`;
}
