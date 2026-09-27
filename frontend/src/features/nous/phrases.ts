import type { Verdict } from "./api";

// 💬 Little words after a guess, picked at random so they don't repeat. Always
// kind: finding out something new about the other one is a win too.
// "{n}" is the other one's name.

const RIGHT = [
  "Télépathie confirmée 🔮",
  "Tu lis dans ses pensées, avoue 👀",
  "Dans le mille ! {n} est un livre ouvert pour toi 📖",
  "Connexion parfaite, zéro latence 📶",
  "Tu connais {n} par cœur 💘",
  "Même cerveau, deux cœurs 🧠💞",
  "C'est pas de la chance, c'est de l'amour 💞",
  "Radar à {n} : calibré au millimètre 📡",
  "{n} n'a plus aucun secret pour toi 🗝️",
  "Ça, c'est de l'écoute 👂✨",
  "Pile poil, comme toujours 🎯",
  "Vous êtes raccord, c'est beau 🎶",
];

const CLOSE = [
  "Pas loin du tout, ça brûle 🔥",
  "Tu tournes autour, c'est chaud 🌡️",
  "Bien vu… à un détail près 🔍",
  "La moitié du chemin, c'est déjà beaucoup 🌗",
  "On sent que tu connais le sujet 😌",
  "C'était là, sur le bout de la langue 👅",
  "Tu étais sur la bonne piste 🐾",
  "À un cheveu près 💇",
  "Presque dans le mille, tout en douceur 🪶",
];

const DISCOVER = [
  "Tu viens d'apprendre un truc sur {n} 🌱",
  "Nouvelle info débloquée 🔓",
  "Et voilà une jolie découverte ✨",
  "{n} a encore des surprises en réserve 🎁",
  "Plot twist ! Tu ne l'avais pas vue venir 🎬",
  "Note pour plus tard : ça, c'est {n} 📝",
  "De quoi en parler ce soir ☕",
  "Il reste des choses à découvrir, tant mieux 🌷",
  "Une pièce de plus au puzzle {n} 🧩",
  "Maintenant tu sais 😌",
];

const SAY = [
  "Voilà la réponse de {n}. Alors, c'était ça ? 🤔",
  "Compare avec ta réponse, et dis-le toi-même 😊",
  "À toi de dire si c'était proche 💭",
];

function pick(list: string[], name: string): string {
  return list[Math.floor(Math.random() * list.length)].replace(/\{n\}/g, name);
}

/** A little word after a guess: for what was found, what was close, what was discovered, or while I say how close it was. */
export function phraseFor(verdict: Verdict | null, name: string): string {
  if (verdict == null) return pick(SAY, name);
  if (verdict === "right") return pick(RIGHT, name);
  if (verdict === "wrong") return pick(DISCOVER, name);
  return pick(CLOSE, name);
}
