import type { Verdict } from "./api";

// 💬 Little words after a guess, picked at random so they don't repeat:
// cheers, "presque", misses, and while waiting. "{n}" is the other one's name.

const RIGHT = [
  "Télépathie confirmée 🔮",
  "Tu lis dans ses pensées, avoue 👀",
  "Dans le mille ! {n} est un livre ouvert pour toi 📖",
  "Connexion parfaite, zéro latence 📶",
  "Tu connais {n} par cœur 💘",
  "Même cerveau, deux corps 🧠🧠",
  "Bingo ! On vous marie une deuxième fois ? 💍",
  "C'est pas de la chance, c'est de l'amour 💞",
  "Radar à {n} : calibré au millimètre 📡",
  "Âmes sœurs, preuve à l'appui 🎯",
  "Tu as triché ? Non ? Alors chapeau 🎩",
  "Encore un point pour l'équipe Nous deux 🏆",
  "{n} n'a plus aucun secret pour toi 🗝️",
  "Parfait. Rien à ajouter. Le silence admiratif 🤫",
  "Ça, c'est de l'écoute active 👂✨",
];

const CLOSE = [
  "Presque ! Ça brûle 🔥",
  "Tu tournes autour, c'est chaud 🌡️",
  "Pas loin du tout, {n} doit être fier·e de toi 😏",
  "Un poil à côté, mais l'intention y est 🪶",
  "Bien vu… à un détail près 🔍",
  "Demi-télépathie, c'est déjà beaucoup 🌗",
  "On sent que tu connais le sujet 😌",
  "Le radar capte, il faut juste régler l'antenne 📻",
  "C'était là, sur le bout de la langue 👅",
  "Presque parfait, donc presque adorable 🥰",
  "Tu étais sur la bonne piste 🐾",
  "À un cheveu près ! 💇",
];

const WRONG = [
  "Raté… mais tu viens d'apprendre un truc 🙈",
  "Ah. Petite discussion à prévoir ce soir ? ☕",
  "Mystère total, et c'est ce qui fait le charme 🕵️",
  "Complètement à côté, mais avec panache 🎭",
  "{n} reste imprévisible, c'est officiel 🎲",
  "Plot twist ! Tu ne l'avais pas vue venir 🎬",
  "Note pour plus tard : ça, c'est {n} 📝",
  "Bon. On dira que c'était un test 🧪",
  "Le radar a pris sa soirée 📡💤",
  "Zéro pointé, cent pour cent de mignonnerie 💯",
  "Il y a encore des choses à découvrir, tant mieux 🌱",
  "Raté, mais maintenant tu sais 😌",
  "La prochaine sera la bonne 🍀",
];

const WAIT = [
  "Réponse envoyée ! {n} va juger ⏳",
  "Le verdict arrive… suspense 🥁",
  "{n} va lire ça avec un petit sourire ⏳",
  "C'est entre les mains de {n} maintenant ⚖️",
  "Patience… le jury délibère 🧑‍⚖️",
  "Envoyé ! Croise les doigts 🤞",
];

function pick(list: string[], name: string): string {
  return list[Math.floor(Math.random() * list.length)].replace(/\{n\}/g, name);
}

/** A little word for a guess: its verdict (some counts as close), or the wait for it. */
export function phraseFor(verdict: Verdict | null, name: string): string {
  if (verdict == null) return pick(WAIT, name);
  if (verdict === "right") return pick(RIGHT, name);
  if (verdict === "wrong") return pick(WRONG, name);
  return pick(CLOSE, name);
}
