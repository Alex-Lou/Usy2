import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCompanion } from "../../app/companion";
import { Animal } from "../../components/ui/animals";
import { PageHeader } from "../../components/ui/PageHeader";
import { useOnRefresh } from "../../lib/refresh";
import { getDaily } from "../crossword/api";
import { getNaval } from "../naval/api";
import { listGames as listPetitBac } from "../petitbac/api";

interface GameCard {
  to: string;
  title: string;
  tagline: string;
  mode: string;
  emoji: string;
}

const GAMES: GameCard[] = [
  {
    to: "/jeux/quiz",
    title: "Quiz",
    tagline: "9 thèmes, 450 questions sur un chemin de niveaux… et des défis à se lancer.",
    mode: "Solo · à deux",
    emoji: "🧠",
  },
  {
    to: "/jeux/chat",
    title: "La maison du chat",
    tagline: "Nourrissez-le, brossez-le, jouez au laser… et offrez-lui des accessoires.",
    mode: "À deux · en direct",
    emoji: "🐱",
  },
  {
    to: "/jeux/chat/peche",
    title: "La pêche",
    tagline: "Attrapez un max de poissons pour nourrir le chat… gare aux vieilles bottes.",
    mode: "Solo · arcade",
    emoji: "🎣",
  },
  {
    to: "/jeux/direct",
    title: "En direct",
    tagline: "Quiz en duel ou « Même longueur d'onde » : la même question au même moment. Pas là ? La partie attend.",
    mode: "À deux · en direct",
    emoji: "⚡",
  },
  {
    to: "/jeux/bataille",
    title: "Bataille navale",
    tagline: "Placez vos flottes, un tir chacun… Le gagnant choisit le thème de la revanche.",
    mode: "À deux · tour par tour",
    emoji: "🚢",
  },
  {
    to: "/jeux/morpion",
    title: "Morpion",
    tagline: "Alignez vos compagnons, à deux, en temps réel.",
    mode: "À deux · en ligne",
    emoji: "⭕",
  },
  {
    to: "/jeux/snake",
    title: "Snake",
    tagline: "Grignotez un max de fruits sans vous mordre la queue.",
    mode: "Solo · arcade",
    emoji: "🐍",
  },
  {
    to: "/jeux/mots-fleches",
    title: "Mots fléchés",
    tagline: "Une nouvelle grille à chaque partie, en trois tailles. Seul, ou à deux sur la même grille en direct.",
    mode: "Solo · à deux",
    emoji: "✏️",
  },
  {
    to: "/jeux/petit-bac",
    title: "Petit Bac",
    tagline: "Une lettre, vos catégories : le premier qui crie « Stop ! »… et chacun valide les réponses de l'autre.",
    mode: "À deux · direct ou à son rythme",
    emoji: "🎲",
  },
  {
    to: "/jeux/sudoku",
    title: "Sudoku",
    tagline: "Quatre niveaux, de Facile à Expert : une nouvelle grille à chaque partie.",
    mode: "Solo · réflexion",
    emoji: "🔢",
  },
];

/** What waits for me, per game (its path → the pill on its tile). A failed call just shows nothing. */
function usePending(): Record<string, string> {
  const [pending, setPending] = useState<Record<string, string>>({});
  const load = useCallback(() => {
    const next: Record<string, string> = {};
    const petitBac = listPetitBac().then((games) => {
      const n = games.filter((g) => g.status === "a-toi" || g.status === "a-valider").length;
      if (n > 0) next["/jeux/petit-bac"] = n > 1 ? `${n} à toi` : "À toi";
    });
    const naval = getNaval().then((v) => {
      if (v && ((v.status === "playing" && v.turnId === v.meId) || (v.status === "placing" && !v.mePlaced))) {
        next["/jeux/bataille"] = "À toi";
      }
    });
    const daily = getDaily().then((d) => {
      if (!d.finished) next["/jeux/mots-fleches"] = "📅 du jour";
    });
    void Promise.allSettled([petitBac, naval, daily]).then(() => setPending(next));
  }, []);
  useEffect(load, [load]);
  useOnRefresh(load);
  return pending;
}

export function GamesHub() {
  const { companion } = useCompanion();
  const pending = usePending();

  return (
    <div className="mx-auto max-w-2xl lg:max-w-content">
      <div className="mb-4">
        <PageHeader title="Jeux" subtitle="On joue ensemble ? 💕" leading={<Animal species={companion} size={44} />} />
      </div>

      <Link
        to="/jeux/nous"
        className="nd-hero card group relative mb-4 flex items-center gap-4 overflow-hidden p-5 press animate-fade-up"
        aria-label="Nous deux : questions entre amoureux et devine-moi"
      >
        <span className="nd-float text-5xl" aria-hidden="true">💞</span>
        <span className="flex-1">
          <span className="block font-display text-xl font-bold">Nous deux</span>
          <span className="block text-sm opacity-90">Questions entre amoureux, et devine ce que l'autre a répondu…</span>
        </span>
        <span className="rounded-full bg-white/25 px-3 py-1.5 text-sm font-semibold">Jouer →</span>
      </Link>

      {/* Tiles, two per row even on a phone: the whole tile opens the game. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {GAMES.map((g) => (
          <Link key={g.to} to={g.to} className="card group relative flex flex-col gap-1.5 p-4 press transition hover:border-primary/60">
            {pending[g.to] && (
              <span className="absolute right-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground shadow-glow animate-pop">
                {pending[g.to]}
              </span>
            )}
            <span className="text-3xl transition group-hover:scale-110" aria-hidden="true">{g.emoji}</span>
            <h2 className="font-display text-base font-bold leading-tight">{g.title}</h2>
            <p className="line-clamp-2 text-xs text-text-muted">{g.tagline}</p>
            <span className="mt-auto pt-1 text-[11px] font-medium text-text-muted">{g.mode}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
