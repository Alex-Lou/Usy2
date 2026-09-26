import { Link } from "react-router-dom";
import { useCompanion } from "../../app/companion";
import { Animal } from "../../components/ui/animals";
import { Icon } from "../../components/ui/Icon";

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
    to: "/jeux/sudoku",
    title: "Sudoku",
    tagline: "Quatre niveaux, de Facile à Expert : une nouvelle grille à chaque partie.",
    mode: "Solo · réflexion",
    emoji: "🔢",
  },
];

export function GamesHub() {
  const { companion } = useCompanion();

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-5 flex items-center gap-3 animate-fade-up">
        <Animal species={companion} size={52} />
        <div>
          <h1 className="font-display text-2xl font-bold">Jeux</h1>
          <p className="text-sm text-text-muted">On joue ensemble ? 💕</p>
        </div>
      </header>

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

      <div className="grid gap-4 sm:grid-cols-2">
        {GAMES.map((g, i) => (
          <Link
            key={g.to}
            to={g.to}
            className="card group flex flex-col gap-2 p-5 press animate-fade-up transition hover:border-primary/60"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-4xl transition group-hover:scale-110">{g.emoji}</span>
              <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-text-muted">
                {g.mode}
              </span>
            </div>
            <h2 className="font-display text-lg font-bold">{g.title}</h2>
            <p className="text-sm text-text-muted">{g.tagline}</p>
            <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Icon name="gamepad" size={16} /> Jouer
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
