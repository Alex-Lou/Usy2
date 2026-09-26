import { useEffect, useState } from "react";
import { ApiError } from "../../lib/api/client";
import { Confetti } from "../games/Confetti";
import { getDuel, MIX, type QuizChallenge, type QuizChallenges, type QuizDuel, type QuizTheme } from "./api";

const MIX_COLOR = "#7c6cf0";
const SHOWN_DONE = 5;

/**
 * 🎯 Défis: the win tally, "Défier …", the duels mine to play (or to finish),
 * the ones waiting on the other person, and the last finished ones.
 */
export function DuelsCard({ data, onNew, onPlay, onOpen }: {
  data: QuizChallenges;
  onNew: () => void;
  onPlay: (c: QuizChallenge) => void;
  onOpen: (id: number) => void;
}) {
  const partner = data.partnerName ?? "ton binôme";
  const toPlay = data.items.filter((c) => c.status === "play");
  const waiting = data.items.filter((c) => c.status === "wait");
  const done = data.items.filter((c) => c.status === "done").slice(0, SHOWN_DONE);
  const full = data.openSent >= data.maxOpen;
  const played = data.wins + data.losses + data.ties;
  return (
    <section className="card relative overflow-hidden p-4 animate-fade-up" aria-label="Défis" data-quiz-duels="">
      <div className="pointer-events-none absolute -right-5 -top-5 text-7xl opacity-15" aria-hidden="true">🎯</div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold">🎯 Défis</h2>
        {played > 0 && (
          <p className="text-sm font-semibold tabular-nums" aria-label={`${data.wins} victoire${data.wins > 1 ? "s" : ""}, ${data.losses} défaite${data.losses > 1 ? "s" : ""}, ${data.ties} égalité${data.ties > 1 ? "s" : ""}`}>
            Toi {data.wins} – {data.losses} {data.partnerName ?? ""}
            {data.ties > 0 && <span className="font-normal text-text-muted"> · {data.ties} égalité{data.ties > 1 ? "s" : ""}</span>}
          </p>
        )}
      </div>
      <p className="text-sm text-text-muted">Tu joues 10 questions, {partner} reçoit exactement les mêmes. Le meilleur score gagne.</p>

      <button
        type="button"
        onClick={onNew}
        disabled={!data.partnerName || full}
        className="btn-brand press mt-3 rounded-token px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
      >
        ⚔️ Défier {data.partnerName ?? ""}
      </button>
      {full && <p className="mt-1 text-xs text-text-muted">{partner} a déjà {data.maxOpen} défis à relever : attends qu'un défi soit joué.</p>}

      {toPlay.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2" aria-label="À relever">
          {toPlay.map((c) => (
            <li key={c.id} className="qz-pop flex items-center gap-3 rounded-token border-2 p-2.5" style={{ borderColor: c.color }}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl" style={{ background: c.color }} aria-hidden="true">{c.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.fromName} te défie · {what(c)}</p>
                <p className="text-xs text-text-muted">Score à battre : <b className="tabular-nums">{c.theirScore} pts</b></p>
              </div>
              <button type="button" onClick={() => onPlay(c)} className="qz-pulse btn-brand press shrink-0 rounded-token px-3 py-1.5 text-sm font-semibold" style={{ ["--qz" as string]: c.color }}>
                {c.answered > 0 ? `Reprendre ${c.answered}/${c.total}` : "Relever"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {waiting.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1" aria-label="En attente">
          {waiting.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-sm text-text-muted">
              <span aria-hidden="true">⏳</span>
              <span className="min-w-0 flex-1 truncate">{what(c)} : à {partner} de jouer (toi : {c.myScore} pts)</span>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5" aria-label="Derniers duels">
          {done.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onOpen(c.id)} className="press flex w-full items-center gap-2 rounded-token px-2 py-1.5 text-left text-sm hover:bg-surface-2">
                <span aria-hidden="true">{c.outcome === "win" ? "🏆" : c.outcome === "lose" ? "😅" : "🤝"}</span>
                <span className="min-w-0 flex-1 truncate">{what(c)}</span>
                <span className="shrink-0 font-semibold tabular-nums">{c.myScore} – {c.theirScore}</span>
                <span className="shrink-0 text-text-muted" aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function what(c: QuizChallenge): string {
  return `${c.emoji} ${c.label}${c.level > 0 ? ` · niv. ${c.level}` : ""}`;
}

/** What to defy with: the surprise mix, or one of my open levels. */
export function ChallengePicker({ themes, partnerName, onPick, onClose }: {
  themes: QuizTheme[];
  partnerName: string | null;
  onPick: (theme: string, level: number | null) => void;
  onClose: () => void;
}) {
  const [themeId, setThemeId] = useState(themes[0]?.id);
  const theme = themes.find((t) => t.id === themeId);
  return (
    <section className="card flex flex-col gap-3 p-4 animate-fade-up" aria-label="Nouveau défi">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onClose} aria-label="Fermer" className="chip press text-sm">✕</button>
        <h2 className="font-display text-lg font-bold">Défier {partnerName ?? ""}</h2>
      </div>
      <button
        type="button"
        onClick={() => onPick(MIX, null)}
        className="qz-pop press flex items-center gap-3 rounded-token p-4 text-left font-semibold text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${MIX_COLOR}, #ff6fa8)` }}
      >
        <span className="text-3xl" aria-hidden="true">🎲</span>
        <span>
          Mélange surprise
          <span className="block text-sm font-normal opacity-90">10 questions de tous les thèmes</span>
        </span>
      </button>
      <p className="text-sm text-text-muted">…ou un de tes niveaux :</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar" role="tablist" aria-label="Thèmes">
        {themes.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === themeId}
            onClick={() => setThemeId(t.id)}
            className={"chip press shrink-0 text-sm " + (t.id === themeId ? "font-semibold text-white" : "text-text-muted")}
            style={t.id === themeId ? { background: t.color, borderColor: t.color } : undefined}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>
      {theme && (
        <div className="flex flex-wrap gap-2" aria-label={`Niveaux ${theme.label}`}>
          {theme.levels.map((l) => (
            <button
              key={l.level}
              type="button"
              disabled={!l.unlocked}
              onClick={() => onPick(theme.id, l.level)}
              aria-label={`Niveau ${l.level}${l.unlocked ? "" : ", verrouillé"}`}
              className="qz-node press grid h-12 w-12 place-items-center rounded-full border-4 font-display text-lg font-bold disabled:cursor-not-allowed"
              style={
                l.unlocked
                  ? { background: theme.color, borderColor: `color-mix(in srgb, #fff 70%, ${theme.color})`, color: "#fff" }
                  : { background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text-muted)" }
              }
            >
              {l.unlocked ? l.level : "🔒"}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/** A finished duel: both scores side by side (confetti for the winner), then question by question. */
export function DuelView({ id, onBack }: { id: number; onBack: () => void }) {
  const [duel, setDuel] = useState<QuizDuel | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getDuel(id)
      .then((d) => alive && setDuel(d))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Duel introuvable."));
    return () => {
      alive = false;
    };
  }, [id]);

  if (error) {
    return (
      <div className="card flex flex-col items-center gap-3 p-6 text-center">
        <p className="text-sm">{error}</p>
        <button type="button" onClick={onBack} className="chip press">← Défis</button>
      </div>
    );
  }
  if (!duel) return <div className="card h-80 animate-pulse" />;

  const c = duel.challenge;
  const verdict = c.outcome === "win" ? "Tu gagnes !" : c.outcome === "lose" ? `${duel.theirName} gagne !` : "Égalité !";
  return (
    <div className="flex flex-col gap-3" data-quiz-duel="">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Retour aux défis" className="chip press text-sm">←</button>
        <p className="text-sm text-text-muted">{what(c)}</p>
      </div>
      <section className="card relative overflow-hidden p-5 text-center">
        {c.outcome === "win" && <Confetti />}
        <h2 className="qz-pop font-display text-3xl font-bold">{verdict}</h2>
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Side name={duel.myName} score={c.myScore ?? 0} crown={c.outcome === "win"} color={c.color} delay={0} />
          <span className="font-display text-xl font-bold text-text-muted" aria-hidden="true">VS</span>
          <Side name={duel.theirName} score={c.theirScore ?? 0} crown={c.outcome === "lose"} color={c.color} delay={150} />
        </div>
      </section>
      <ol className="flex flex-col gap-2" aria-label="Question par question">
        {duel.lines.map((l, i) => (
          <li key={i} className="qz-slide card p-3" style={{ animationDelay: `${i * 50}ms` }}>
            <p className="text-sm font-semibold">{i + 1}. {l.text}</p>
            <p className="mt-1 text-sm" style={{ color: "#3fbf7f" }}>✓ {l.options[l.correct]}</p>
            <div className="mt-1.5 flex gap-4 text-xs">
              <Mark name={duel.myName} right={l.mine} />
              <Mark name={duel.theirName} right={l.theirs} />
            </div>
          </li>
        ))}
      </ol>
      <button type="button" onClick={onBack} className="chip press self-center">← Défis</button>
    </div>
  );
}

function Side({ name, score, crown, color, delay }: { name: string; score: number; crown: boolean; color: string; delay: number }) {
  return (
    <div className="qz-pop flex flex-col items-center gap-1" style={{ animationDelay: `${delay}ms` }}>
      <span className={"text-2xl " + (crown ? "qz-star" : "opacity-0")} aria-hidden="true">👑</span>
      <span className="truncate text-sm font-semibold">{name}</span>
      <span className="font-display text-3xl font-bold tabular-nums" style={{ color: crown ? color : undefined }}>{score}</span>
    </div>
  );
}

function Mark({ name, right }: { name: string; right: boolean }) {
  return (
    <span className={right ? "font-semibold" : "text-text-muted"}>
      <span aria-hidden="true">{right ? "✅" : "❌"}</span> {name}
      <span className="sr-only">{right ? " : juste" : " : faux"}</span>
    </span>
  );
}
