import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../lib/api/client";
import { Confetti } from "../games/Confetti";
import { answerRun, startRun, type QuizQuestion, type QuizResult } from "./api";

const LETTERS = ["A", "B", "C", "D"];
const PAUSE_MS = 1300; // time to see the right answer before the next question

type Picked = { choice: number; correctIndex: number; gained: number } | null;

/**
 * One run: a question at a time with its countdown ring, the answer checked
 * by the server (right one shown, wrong one shakes), points flying up, a streak
 * bonus, then the stars. {@code onNext} is only offered when the next level opened.
 */
export function QuizPlay({ theme, level, color, title, onExit, onNext }: {
  theme: string;
  level: number | null;
  color: string;
  title: string;
  onExit: () => void;
  onNext?: () => void;
}) {
  const [runId, setRunId] = useState<string | null>(null);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [picked, setPicked] = useState<Picked>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const busy = useRef(false);
  const pending = useRef<{ next: QuizQuestion | null; result: QuizResult | null } | null>(null);

  useEffect(() => {
    let alive = true;
    setRunId(null);
    setQuestion(null);
    setResult(null);
    setScore(0);
    setStreak(0);
    setPicked(null);
    setError(null);
    startRun(theme, level)
      .then((r) => {
        if (!alive) return;
        setRunId(r.id);
        setQuestion(r.question);
      })
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Impossible de lancer la partie."));
    return () => {
      alive = false;
    };
  }, [theme, level, attempt]);

  const answer = useCallback(
    async (choice: number) => {
      if (!runId || busy.current || picked) return;
      busy.current = true;
      try {
        const a = await answerRun(runId, choice);
        setPicked({ choice, correctIndex: a.correctIndex, gained: a.gained });
        setScore(a.score);
        setStreak(a.streak);
        pending.current = { next: a.next, result: a.result };
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Réponse non envoyée.");
      } finally {
        busy.current = false;
      }
    },
    [runId, picked],
  );

  // After an answer: a short pause on the verdict, then the next question or the end.
  useEffect(() => {
    if (!picked) return;
    const t = window.setTimeout(() => {
      const p = pending.current;
      pending.current = null;
      setPicked(null);
      if (p?.result) setResult(p.result);
      else if (p?.next) setQuestion(p.next);
    }, PAUSE_MS);
    return () => window.clearTimeout(t);
  }, [picked]);

  // The countdown: out of time counts as a wrong answer.
  useEffect(() => {
    if (!question || picked || result) return;
    const t = window.setTimeout(() => void answer(-1), question.seconds * 1000);
    return () => window.clearTimeout(t);
  }, [question, picked, result, answer]);

  // Keyboard: A–D or 1–4.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!question || picked) return;
      const i = "abcd".indexOf(e.key.toLowerCase());
      const n = "1234".indexOf(e.key);
      const pick = i >= 0 ? i : n;
      if (pick >= 0 && pick < question.options.length) void answer(pick);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, picked, answer]);

  const accent = { ["--qz" as string]: color };

  if (error) {
    return (
      <div className="card flex flex-col items-center gap-3 p-6 text-center" style={accent}>
        <p className="text-sm">{error}</p>
        <button type="button" onClick={onExit} className="chip press">← Retour à la carte</button>
      </div>
    );
  }

  if (result) return <ResultCard result={result} color={color} title={title} onReplay={() => setAttempt((a) => a + 1)} onExit={onExit} onNext={result.unlockedNext ? onNext : undefined} />;

  if (!question) {
    return (
      <div className="card grid h-72 place-items-center" style={accent}>
        <span className="qz-pulse grid h-16 w-16 place-items-center rounded-full text-3xl" style={{ background: color }} aria-hidden="true">?</span>
        <span className="sr-only">Chargement…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" style={accent} data-quiz-play="">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onExit} aria-label="Quitter la partie" className="chip press text-sm">✕</button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={question.total} aria-valuenow={question.index - 1}>
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${((question.index - (picked ? 0 : 1)) / question.total) * 100}%`, background: color }} />
        </div>
        <span className="text-sm tabular-nums text-text-muted">{question.index}/{question.total}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="font-display text-lg font-bold tabular-nums" aria-live="polite">{score} pts</span>
        {streak >= 2 && <span key={streak} className="qz-pop chip text-sm font-semibold">🔥 ×{streak}</span>}
        <Countdown key={`${question.index}-${attempt}`} seconds={question.seconds} running={!picked} color={color} />
      </div>

      <div key={question.index} className="qz-slide card relative p-5">
        {question.about && <p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color }}>À propos de {question.about}</p>}
        <h2 className="font-display text-xl font-bold leading-snug">{question.text}</h2>
        {picked && picked.gained > 0 && <span className="qz-float absolute right-4 top-3 font-display text-xl font-bold" style={{ color }}>+{picked.gained}</span>}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2" role="group" aria-label="Réponses">
        {question.options.map((o, i) => {
          const isRight = picked && i === picked.correctIndex;
          const isWrongPick = picked && i === picked.choice && i !== picked.correctIndex;
          return (
            <button
              key={`${question.index}-${i}`}
              type="button"
              disabled={!!picked}
              onClick={() => void answer(i)}
              className={
                "qz-option press flex items-center gap-3 rounded-token border-2 px-4 py-3 text-left font-semibold transition " +
                (isRight ? "qz-right" : isWrongPick ? "qz-wrong qz-shake" : picked ? "opacity-50" : "hover:-translate-y-0.5")
              }
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm" style={{ background: color, color: "#fff" }} aria-hidden="true">
                {isRight ? "✓" : isWrongPick ? "✕" : LETTERS[i]}
              </span>
              <span>{o}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The ring that empties over the question's time (the real limit is kept by the server). */
function Countdown({ seconds, running, color }: { seconds: number; running: boolean; color: string }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const t = window.setInterval(() => setLeft(Math.max(0, seconds - Math.floor((Date.now() - start) / 1000))), 250);
    return () => window.clearInterval(t);
  }, [seconds, running]);
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid h-11 w-11 place-items-center" role="timer" aria-label={`${left} secondes`}>
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={left <= 5 ? "var(--color-danger)" : color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          className="qz-ring"
          style={{ ["--qz-len" as string]: `${c}`, animationDuration: `${seconds}s`, animationPlayState: running ? "running" : "paused" }}
        />
      </svg>
      <span className={"text-sm font-bold tabular-nums " + (left <= 5 ? "text-danger" : "")}>{left}</span>
    </span>
  );
}

function ResultCard({ result, color, title, onReplay, onExit, onNext }: {
  result: QuizResult;
  color: string;
  title: string;
  onReplay: () => void;
  onExit: () => void;
  onNext?: () => void;
}) {
  const [shown, setShown] = useState(0);
  // The score counts up.
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 900);
      setShown(Math.round(result.score * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result.score]);
  const cheer = result.stars === 3 ? "Parfait !" : result.stars === 2 ? "Bravo !" : result.stars === 1 ? "Pas mal !" : "On retente ?";
  return (
    <div className="card relative flex flex-col items-center gap-3 overflow-hidden p-6 text-center" data-quiz-result="">
      {result.stars === 3 && <Confetti />}
      <p className="text-sm text-text-muted">{title}</p>
      <h2 className="qz-pop font-display text-3xl font-bold">{cheer}</h2>
      <div className="flex gap-2" aria-label={`${result.stars} étoile${result.stars > 1 ? "s" : ""} sur 3`}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={"text-4xl " + (i < result.stars ? "qz-star" : "opacity-20 grayscale")} style={{ animationDelay: `${250 + i * 220}ms` }} aria-hidden="true">⭐</span>
        ))}
      </div>
      <p className="font-display text-4xl font-bold tabular-nums" style={{ color }}>{shown}</p>
      <p className="text-sm text-text-muted">{result.correct} bonne{result.correct > 1 ? "s" : ""} réponse{result.correct > 1 ? "s" : ""} sur {result.total}</p>
      {result.newBest && <p className="qz-pop chip text-sm font-semibold">🏆 Nouveau record</p>}
      {result.unlockedNext && <p className="qz-pop chip text-sm font-semibold">🔓 Niveau suivant débloqué</p>}
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onReplay} className="chip press">↻ Rejouer</button>
        {onNext && <button type="button" onClick={onNext} className="btn-brand press rounded-token px-4 py-2 font-semibold">Niveau suivant →</button>}
        <button type="button" onClick={onExit} className="chip press">Carte</button>
      </div>
    </div>
  );
}

