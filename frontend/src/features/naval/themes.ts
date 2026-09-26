import type { NavalTheme } from "./api";

/** 🎨 The four looks of the battle, shared by both screens; words follow the theme. */
export interface ThemeInfo {
  id: NavalTheme;
  label: string;
  emoji: string;
  blurb: string;
  ships: string[]; // by type (5, 4, 3, 3, 2 long)
  fire: string;
  hit: string;
  miss: string;
  sunk: (ship: string) => string;
}

export const THEMES: ThemeInfo[] = [
  {
    id: "ocean",
    label: "Océan néon",
    emoji: "🌊",
    blurb: "Mer de nuit, radar et éclats néon.",
    ships: ["Porte-avions", "Cuirassé", "Croiseur", "Sous-marin", "Torpilleur"],
    fire: "Choisis ta cible",
    hit: "Touché ! 💥",
    miss: "Dans l'eau 💦",
    sunk: (s) => `${s} coulé ! 🔥`,
  },
  {
    id: "cartoon",
    label: "Cartoon compagnons",
    emoji: "🐾",
    blurb: "Bateaux tout ronds, vos compagnons à la barre.",
    ships: ["Grand navire", "Bateau-bus", "Chalutier", "Sous-marin jaune", "Petit canot"],
    fire: "Vise une case, et plouf !",
    hit: "Boing ! En plein dedans 💥",
    miss: "Splash ! 💦",
    sunk: (s) => `Glou glou… ${s} coulé ! 🫧`,
  },
  {
    id: "pirate",
    label: "Pirates",
    emoji: "🏴‍☠️",
    blurb: "Carte au trésor, galions et boulets de canon.",
    ships: ["Galion", "Frégate", "Brigantin", "Goélette", "Chaloupe"],
    fire: "Feu à volonté, moussaillon !",
    hit: "Par les mille sabords ! 💥",
    miss: "Plouf, à l'eau ! 🌊",
    sunk: (s) => `${s} envoyé par le fond ! ☠️`,
  },
  {
    id: "space",
    label: "Espace",
    emoji: "🚀",
    blurb: "Vaisseaux, lasers et champ d'étoiles.",
    ships: ["Croiseur stellaire", "Destroyer", "Frégate", "Chasseur furtif", "Navette"],
    fire: "Verrouille une cible",
    hit: "Impact ! ✨",
    miss: "Dans le vide 🌌",
    sunk: (s) => `${s} désintégré ! 💫`,
  },
];

export const themeOf = (id: string): ThemeInfo => THEMES.find((t) => t.id === id) ?? THEMES[0];
