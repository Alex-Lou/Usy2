import { apiRequest } from "../../lib/api/client";

/**
 * {@code c} choices (several can be ticked) · {@code u} one choice (this or that) ·
 * {@code e} a scale 0–10 · {@code o} a ranking · {@code h} a hangman word ·
 * {@code m} a short answer · {@code f} a sentence to complete · {@code l} own words ·
 * {@code p} just to talk.
 */
export type Kind = "c" | "u" | "e" | "o" | "h" | "m" | "f" | "l" | "p";
/** {@code some}: ticked choices only, under half of the ticks in common. */
export type Verdict = "right" | "close" | "some" | "wrong";

export interface NousTheme {
  id: string;
  label: string;
  emoji: string;
  color: string;
  total: number;
  guessable: number;
}

export interface NousCard {
  id: string;
  theme: string;
  kind: Kind;
  text: string;
  options: string[];
  fav: boolean;
  talked: boolean;
  answered: boolean;
}

export interface NousScore {
  right: number;
  close: number;
  some: number;
  wrong: number;
  pending: number;
  percent: number | null;
}

export interface NousOverview {
  partnerName: string | null;
  themes: NousTheme[];
  answerable: number;
  myAnswers: number;
  theirAnswers: number;
  toGuess: number;
  toJudge: number;
  /** How well I know the other one / how well they know me ({@code percent}: average points). */
  me: NousScore;
  them: NousScore;
  daily: NousCard | null;
  /** A proposal to start again for both, waiting for an answer. */
  reset: NousResetState | null;
}

export interface NousResetState {
  mine: boolean;
  byName: string;
  /** A theme id, or null for everything. */
  theme: string | null;
  createdAt: string;
}

export interface NousMine {
  id: string;
  theme: string;
  kind: Kind;
  text: string;
  options: string[];
  /** The options I ticked (one for u, the point 0–10 for e, the whole order for o). */
  choices: number[] | null;
  answer: string | null;
}

export interface NousToGuess {
  id: string;
  theme: string;
  kind: Kind;
  text: string;
  options: string[];
  /** A hangman: the word as found so far ("_" for a letter to find), and the letters tried. */
  pattern: string | null;
  tried: string | null;
}

export interface NousHangman {
  id: string;
  pattern: string;
  tried: string;
  errors: number;
  maxErrors: number;
  /** Once found or hanged. */
  reveal: NousReveal | null;
}

export interface NousReveal {
  guessId: number;
  id: string;
  theme: string;
  kind: Kind;
  text: string;
  options: string[];
  guessChoices: number[] | null;
  guessText: string | null;
  answerChoices: number[] | null;
  answerText: string | null;
  verdict: Verdict | null;
  note: string | null;
  createdAt: string;
  /**
   * 0–100: ticks in common ÷ ticks in all ({@code common}, {@code union}); a
   * ranking: well placed ÷ all (the same two); a scale: 100 less 20 a step
   * apart; a hangman: 100 less 10 an error ({@code letters}, {@code errors});
   * words: right 100, close 50, wrong 0.
   */
  points: number | null;
  common: number | null;
  union: number | null;
  letters: string | null;
  errors: number | null;
}

export interface NousAgreement {
  same: number;
  compared: number;
  percent: number | null;
}

export interface NousThemeScore {
  id: string;
  me: NousScore;
  them: NousScore;
  myAnswers: number;
  theirAnswers: number;
  guessable: number;
  agreement: NousAgreement;
}

export interface NousScores {
  me: NousScore;
  them: NousScore;
  agreement: NousAgreement;
  themes: NousThemeScore[];
}

export interface NousSaid {
  choices: number[] | null;
  text: string | null;
}

/** My answer and theirs, side by side ({@code locked}: theirs stays hidden until I guess it). */
export interface NousCompare {
  id: string;
  theme: string;
  kind: Kind;
  text: string;
  options: string[];
  mine: NousSaid | null;
  theirs: NousSaid | null;
  locked: boolean;
  same: boolean | null;
  myVerdict: Verdict | null;
  theirVerdict: Verdict | null;
}

export interface NousHistory {
  mine: NousReveal[];
  theirs: NousReveal[];
}

export const MAX_TEXT = 280;
export const MAX_NOTE = 140;
export const MAX_SHORT = 40;
/** A scale goes from 0 to this. */
export const SCALE_MAX = 10;

export const getNous = () => apiRequest<NousOverview>("/api/nous");
export const getCards = (theme?: string) => apiRequest<NousCard[]>(`/api/nous/cards${theme ? `?theme=${encodeURIComponent(theme)}` : ""}`);
export const markCard = (id: string, kind: "fav" | "talked", on: boolean) => apiRequest<void>("/api/nous/marks", { method: "PUT", body: { id, kind, on } });
export const getMine = () => apiRequest<NousMine[]>("/api/nous/me");
export const saveMine = (id: string, choices: number[] | null, text: string | null) => apiRequest<void>("/api/nous/me", { method: "PUT", body: { id, choices, text } });
export const forgetMine = (id: string) => apiRequest<void>(`/api/nous/me/${encodeURIComponent(id)}`, { method: "DELETE" });
export const getToGuess = () => apiRequest<NousToGuess[]>("/api/nous/guess");
export const sendGuess = (id: string, choices: number[] | null, text: string | null) => apiRequest<NousReveal>("/api/nous/guess", { method: "POST", body: { id, choices, text } });
export const getHistory = () => apiRequest<NousHistory>("/api/nous/history");
export const judgeGuess = (guessId: number, verdict: Verdict, note: string | null) => apiRequest<NousReveal>(`/api/nous/judge/${guessId}`, { method: "POST", body: { verdict, note } });
export const playLetter = (id: string, letter: string) => apiRequest<NousHangman>("/api/nous/hangman", { method: "POST", body: { id, letter } });
export const getScores = () => apiRequest<NousScores>("/api/nous/scores");
export const getCompare = () => apiRequest<NousCompare[]>("/api/nous/compare");
/** Starts my own answers again: a theme, or all of them (null). */
export const resetMine = (theme: string | null) => apiRequest<void>(`/api/nous/me${theme ? `?theme=${encodeURIComponent(theme)}` : ""}`, { method: "DELETE" });
export const proposeReset = (theme: string | null) => apiRequest<NousResetState>("/api/nous/reset", { method: "POST", body: { theme } });
export const acceptReset = () => apiRequest<void>("/api/nous/reset/accept", { method: "POST" });
/** Takes back my proposal, or says no to the other one's. */
export const dropReset = () => apiRequest<void>("/api/nous/reset", { method: "DELETE" });

/** Ticked options, in their order (toggling one in or out). */
export function toggled(list: number[], i: number): number[] {
  return list.includes(i) ? list.filter((x) => x !== i) : [...list, i].sort((a, b) => a - b);
}

export const VERDICTS: Record<Verdict, { label: string; emoji: string; color: string }> = {
  right: { label: "Juste !", emoji: "🎯", color: "var(--verdict-right)" },
  close: { label: "Presque !", emoji: "😏", color: "var(--verdict-close)" },
  some: { label: "Un peu", emoji: "🤏", color: "var(--verdict-some)" },
  wrong: { label: "Raté", emoji: "🙈", color: "var(--verdict-wrong)" },
};

/** Why a guess got its points, in a few words. */
export function pointsDetail(r: NousReveal): string | null {
  if (r.points == null) return null;
  const s = (n: number) => (n > 1 ? "s" : "");
  switch (r.kind) {
    case "o":
      return `${r.common} bien placé${s(r.common ?? 0)} sur ${r.union} · ${r.points} %`;
    case "e": {
      const apart = Math.abs((r.guessChoices?.[0] ?? 0) - (r.answerChoices?.[0] ?? 0));
      return apart === 0 ? `Pile le même cran · ${r.points} %` : `${apart} cran${s(apart)} d'écart · ${r.points} %`;
    }
    case "u":
      return `${r.points ? "Le même choix" : "Pas le même choix"} · ${r.points} %`;
    case "h":
      return r.verdict === "wrong" ? `Pendu 🪢 · ${r.points} %` : `Trouvé avec ${r.errors ?? 0} erreur${s(r.errors ?? 0)} · ${r.points} %`;
    case "c":
      if (r.common != null && r.union != null) {
        return `${r.common} case${s(r.common)} en commun sur ${r.union} cochée${s(r.union)} en tout · ${r.points} %`;
      }
  }
  if (r.kind === "m" && r.verdict === "right" && r.note == null && r.guessText && r.answerText
    && fold(r.guessText) === fold(r.answerText)) return `Le même mot · ${r.points} %`;
  return `Réponse en mots jugée ${r.verdict ? VERDICTS[r.verdict].label.toLowerCase().replace(" !", "") : ""} · ${r.points} %`;
}

/** Upper case without accents, as the server compares words (Hangman.fold). */
export function fold(s: string): string {
  return s.trim().replace(/\s+/g, " ").replace(/œ/g, "oe").replace(/Œ/g, "OE").replace(/æ/g, "ae").replace(/Æ/g, "AE").replace(/’/g, "'")
    .normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

/** An answer as words: the options ticked, the point of a scale, the order of a ranking, or the words. */
export function saidText(kind: Kind, options: string[], choices: number[] | null, text: string | null): string {
  if (choices != null) {
    if (kind === "e") return `${choices[0]} / ${SCALE_MAX}`;
    if (kind === "o") return choices.map((i, n) => `${n + 1}. ${options[i] ?? "?"}`).join("\n");
    return choices.map((i) => options[i]).filter(Boolean).join(" · ") || "—";
  }
  return text ?? "—";
}

/** Each kind of question: its name, and how it is played (for me answering, for the other guessing). */
export const KINDS: Record<Kind, { emoji: string; label: string; answer: string; guess: (name: string) => string }> = {
  c: { emoji: "☑️", label: "Cases", answer: "Plusieurs réponses possibles, puis valide.",
    guess: (n) => `Coche tout ce que ${n} a coché. Points = cases en commun ÷ cases cochées en tout.` },
  u: { emoji: "✌️", label: "Ceci ou cela", answer: "Un seul choix : touche ta réponse.", guess: (n) => `Un seul choix : touche celui de ${n}.` },
  e: { emoji: "🎚️", label: "Échelle", answer: "Place le curseur de 0 à 10, puis valide.",
    guess: (n) => `Où ${n} a placé le curseur ? Pile dessus 100 %, chaque cran d'écart en retire 20.` },
  o: { emoji: "🥇", label: "Classement", answer: "Touche les propositions dans ton ordre, de la première à la dernière.",
    guess: (n) => `Retrouve l'ordre de ${n} : touche de la première à la dernière. Points = bien placées ÷ toutes.` },
  h: { emoji: "🪢", label: "Pendu", answer: "Un mot (ou deux), sans chiffres : l'autre le cherchera lettre par lettre.",
    guess: (n) => `Trouve le mot de ${n}, lettre par lettre. 7 erreurs et c'est le pendu.` },
  m: { emoji: "💬", label: "En un mot", answer: "Quelques mots au plus.",
    guess: (n) => `Le même mot que ${n} ? C'est juste d'office. Sinon, ${n} jugera.` },
  f: { emoji: "✏️", label: "Phrase à compléter", answer: "Complète la phrase avec tes mots.", guess: (n) => `Complète comme ${n} l'a fait : ${n} jugera.` },
  l: { emoji: "📝", label: "Tes mots", answer: "Réponds avec tes mots.", guess: (n) => `Selon toi, qu'a répondu ${n} ? ${n} jugera.` },
  p: { emoji: "💭", label: "Pour en parler", answer: "", guess: () => "" },
};

/** A little word for a telepathy score, from "strangers" to "soulmates". */
export function telepathy(percent: number | null): string {
  if (percent == null) return "À découvrir";
  if (percent >= 90) return "Âmes sœurs télépathes 🔮";
  if (percent >= 75) return "Connexion Wi-Fi du cœur 📶";
  if (percent >= 55) return "Sur la même longueur d'onde 📻";
  if (percent >= 35) return "Ça capte… par moments 📡";
  return "Mystère total, et c'est charmant 🕵️";
}
