import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { telepathy, type NousOverview, type NousScore } from "./api";

export type Mode = "guess" | "mine" | "talk";

/**
 * 💞 The menu: the two squares (how well each knows the other, a tap opens
 * the results), the question of the day, then the ways to play.
 */
export function NousHome({ data, partnerName, onResults, onDaily, onMode }: {
  data: NousOverview;
  partnerName: string;
  onResults: (side: "me" | "them", show?: "say") => void;
  onDaily: () => void;
  onMode: (m: Mode) => void;
}) {
  const daily = data.daily;
  const dailyState = !daily ? null
    : !daily.answered ? "Réponds →"
    : !data.dailyTheirs ? `En attente de ${partnerName} ⏳`
    : !data.dailyGuessed ? `Devine ${partnerName} →`
    : "Voir le résultat ✓";

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-3" aria-label="Ce qu'on sait l'un de l'autre">
        <Square title={`Toi → ${partnerName}`} score={data.me} onClick={() => onResults("me")} />
        <Square title={`${partnerName} → toi`} score={data.them} onClick={() => onResults("them")} />
      </section>

      {data.toSay > 0 && (
        <button type="button" onClick={() => onResults("me", "say")} className="card press flex items-center gap-2 p-3 text-left text-sm" data-nous-to-say="">
          <span aria-hidden="true">✍️</span>
          <span className="flex-1">Tu as {data.toSay} réponse{data.toSay > 1 ? "s" : ""} en mots à regarder : c'était ça ?</span>
          <span className="font-semibold text-primary">Voir →</span>
        </button>
      )}

      {daily && (
        <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={onDaily} className="nd-daily card press flex flex-col gap-1 p-4 text-left" data-nous-daily-card="">
          <span className="text-xs font-semibold uppercase tracking-wide opacity-90">✨ La question du jour</span>
          <span className="font-display text-lg font-bold leading-snug">{daily.text}</span>
          <span className="mt-1 self-end rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">{dailyState}</span>
        </motion.button>
      )}

      <section className="grid grid-cols-2 gap-3" aria-label="Jouer">
        <ModeTile emoji="🔮" title={`Deviner ${partnerName}`} detail={data.toGuess ? `${data.toGuess} à deviner` : "Rien de neuf pour l'instant"} onClick={() => onMode("guess")} />
        <ModeTile emoji="✍️" title="Répondre sur moi" detail={`${data.myAnswers} / ${data.answerable} réponses`} onClick={() => onMode("mine")} />
        <ModeTile emoji="💬" title="Cartes pour parler" detail="Juste pour discuter" onClick={() => onMode("talk")} />
        <Link to="/jeux/direct" className="card press flex flex-col gap-1 p-4 transition hover:-translate-y-0.5">
          <span className="text-3xl" aria-hidden="true">⚡</span>
          <span className="font-semibold">En direct</span>
          <span className="text-xs text-text-muted">Jouer en même temps</span>
        </Link>
      </section>
    </div>
  );
}

/** How well one knows the other: a big percentage and a kind word; opens the results. */
function Square({ title, score, onClick }: { title: string; score: NousScore; onClick: () => void }) {
  const guessed = score.right + score.close + score.some + score.wrong;
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="card press flex aspect-square flex-col justify-between p-4 text-left transition hover:-translate-y-0.5 sm:aspect-auto sm:min-h-44"
      aria-label={`${title} : ${score.percent == null ? "pas encore" : `${score.percent} %`}. Voir les résultats`}
      data-nous-square=""
    >
      <span className="truncate text-sm font-semibold text-text-muted">{title}</span>
      <span className="font-display text-4xl font-black tabular-nums text-grad">{score.percent == null ? "—" : `${score.percent} %`}</span>
      <span className="flex flex-col gap-0.5">
        <span className="text-xs leading-tight">{telepathy(score.percent)}</span>
        <span className="text-[11px] text-text-muted">{guessed ? `${guessed} devinée${guessed > 1 ? "s" : ""} · voir →` : "Voir →"}</span>
      </span>
    </motion.button>
  );
}

function ModeTile({ emoji, title, detail, onClick }: { emoji: string; title: string; detail: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="card press flex flex-col gap-1 p-4 text-left transition hover:-translate-y-0.5">
      <span className="text-3xl" aria-hidden="true">{emoji}</span>
      <span className="font-semibold">{title}</span>
      <span className="text-xs text-text-muted">{detail}</span>
    </button>
  );
}
