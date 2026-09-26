import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../lib/api/client";
import { useAuth } from "../auth/useAuth";
import { Confetti } from "../games/Confetti";
import { ShareScore } from "../games/ShareScore";
import { getNous, toggled, type NousTheme } from "../nous/api";
import { Ticks } from "../nous/Ticks";
import { getQuiz, MIX, type QuizTheme } from "../quiz/api";
import { ChallengePicker } from "../quiz/QuizDuels";
import {
  acceptLive, answerLive, createLive, declineLive, getCurrentLive, isActive, nudgeLive, onLive, quitLive, resumeLive,
  type LiveKind, type LiveRound, type LiveView,
} from "./api";

const QUIZ_COLOR = "#7c6cf0";
const NOUS_COLOR = "#ff6fa8";

/**
 * ⚡ En direct: a quiz duel or « Même longueur d'onde », the same question at
 * the same moment on both phones. The server holds the clock: when someone
 * doesn't answer in time the game pauses (24 h at most) until they're back.
 */
export function LivePage() {
  const { user } = useAuth();
  const myId = user?.id ?? -1;
  const [game, setGame] = useState<LiveView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const offset = useRef(0); // server clock − ours

  // Views can cross (an HTTP answer and a broadcast): keep the newest one.
  const take = useCallback((g: LiveView | undefined) => {
    if (!g) return;
    setGame((cur) => {
      if (cur && (g.id < cur.id || (g.id === cur.id && g.serverNow < cur.serverNow))) return cur;
      offset.current = g.serverNow - Date.now();
      return g;
    });
  }, []);

  const load = useCallback(() => {
    getCurrentLive()
      .then((g) => {
        take(g);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoaded(true));
  }, [take]);
  useEffect(load, [load]);
  useEffect(() => onLive((g) => {
    if (g.hostId === myId || g.guestId === myId) take(g);
  }), [take, myId]);
  // Back on the tab: the socket may have missed something.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const run = async (call: () => Promise<LiveView | void>) => {
    setError(null);
    try {
      const g = await call();
      if (g) take(g);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ça n'est pas passé, réessaie.");
    }
  };

  // A new game is only started once none is going on (the server refuses a second one).
  const showStart = !game || (starting && !isActive(game));

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4" data-live="">
      <header className="flex items-center gap-3 animate-fade-up">
        <Link to="/jeux" aria-label="Retour aux jeux" className="chip press text-sm">←</Link>
        <div>
          <h1 className="font-display text-2xl font-bold">⚡ En direct</h1>
          <p className="text-sm text-text-muted">La même question au même moment. Pas là à temps ? La partie attend.</p>
        </div>
      </header>

      {failed && <p className="card p-4 text-sm">Le direct ne répond pas. <button type="button" onClick={load} className="underline">Réessayer</button></p>}
      {!loaded && !failed && <div className="card h-64 animate-pulse" />}
      {error && <p className="card p-3 text-sm text-danger" role="alert">{error}</p>}

      {loaded && showStart && (
        <Start
          onCancel={game ? () => setStarting(false) : undefined}
          onCreate={(kind, theme, level) => run(async () => {
            const g = await createLive(kind, theme, level);
            setStarting(false);
            return g;
          })}
        />
      )}
      {game && !showStart && (
        <Game
          key={game.id}
          g={game}
          myId={myId}
          offset={offset}
          run={run}
          onNew={() => setStarting(true)}
        />
      )}
    </div>
  );
}

/** Choosing a game: a quiz (mix or one of my levels) or « Même longueur d'onde » (every theme or one). */
function Start({ onCreate, onCancel }: { onCreate: (kind: LiveKind, theme: string | null, level: number | null) => void; onCancel?: () => void }) {
  const [quizThemes, setQuizThemes] = useState<QuizTheme[] | null>(null);
  const [nousThemes, setNousThemes] = useState<NousTheme[]>([]);
  const [partner, setPartner] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  useEffect(() => {
    getQuiz().then((q) => setQuizThemes(q.themes)).catch(() => setQuizThemes([]));
    getNous().then((n) => {
      setNousThemes(n.themes);
      setPartner(n.partnerName);
    }).catch(() => undefined);
  }, []);

  if (picking && quizThemes) {
    return <ChallengePicker themes={quizThemes} partnerName={partner} onPick={(t, l) => onCreate("quiz", t, l)} onClose={() => setPicking(false)} />;
  }
  return (
    <section className="flex flex-col gap-3 animate-fade-up" aria-label="Nouvelle partie en direct">
      {onCancel && <button type="button" onClick={onCancel} className="chip press self-start text-sm">✕ Revenir</button>}
      <div className="card flex flex-col gap-3 p-4">
        <h2 className="font-display text-lg font-bold">🎯 Quiz : duel en direct</h2>
        <p className="text-sm text-text-muted">20 s par question. Le plus rapide à trouver gagne le plus de points.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onCreate("quiz", MIX, null)} className="press rounded-token px-4 py-2 font-semibold text-white" style={{ background: `linear-gradient(135deg, ${QUIZ_COLOR}, ${NOUS_COLOR})` }}>
            🎲 Mélange surprise
          </button>
          <button type="button" disabled={!quizThemes?.length} onClick={() => setPicking(true)} className="chip press text-sm disabled:opacity-40">…ou un de mes niveaux</button>
        </div>
      </div>
      <div className="card flex flex-col gap-3 p-4">
        <h2 className="font-display text-lg font-bold">💞 Même longueur d'onde</h2>
        <p className="text-sm text-text-muted">30 s par question. Chacun coche pour soi, puis on compare : plus on coche pareil, plus on marque.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onCreate("nous", null, null)} className="press rounded-token px-4 py-2 font-semibold text-white" style={{ background: NOUS_COLOR }}>
            💞 Tous les thèmes
          </button>
          {nousThemes.filter((t) => t.guessable > 0).map((t) => (
            <button key={t.id} type="button" onClick={() => onCreate("nous", t.id, null)} className="chip press text-sm" style={{ borderColor: t.color }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Ticks every quarter second while {@code on} (for the countdowns). */
function useNow(on: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [on]);
  return now;
}

function Game({ g, myId, offset, run, onNew }: {
  g: LiveView;
  myId: number;
  offset: React.MutableRefObject<number>;
  run: (call: () => Promise<LiveView | void>) => Promise<void>;
  onNew: () => void;
}) {
  const host = g.hostId === myId;
  const other = host ? g.guestName : g.hostName;
  const color = g.kind === "quiz" ? QUIZ_COLOR : NOUS_COLOR;
  const ticking = (g.status === "playing" && g.deadline != null) || g.status === "paused";
  const now = useNow(ticking) + offset.current;

  const scores = (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="truncate font-semibold">{g.label}</span>
      {g.kind === "quiz" && (
        <span className="shrink-0 tabular-nums" aria-label="Scores">
          Toi <b>{host ? g.hostScore : g.guestScore}</b> · {other} <b>{host ? g.guestScore : g.hostScore}</b>
        </span>
      )}
    </div>
  );

  if (g.status === "invited") {
    return (
      <section className="card flex flex-col gap-3 p-5 qz-slide" aria-label="Invitation">
        <p className="text-4xl" aria-hidden="true">⚡</p>
        {host ? (
          <>
            <p className="font-display text-lg font-bold">En attente de {other}…</p>
            <p className="text-sm text-text-muted">{g.label} · {g.total} questions · {g.seconds} s chacune. L'invitation tient 24 h.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void run(() => nudgeLive(g.id))} className="btn-brand press rounded-token px-4 py-2 font-semibold">🔔 Relancer {other}</button>
              <button type="button" onClick={() => void run(() => declineLive(g.id))} className="chip press text-sm">Annuler</button>
            </div>
          </>
        ) : (
          <>
            <p className="font-display text-lg font-bold">{other} te propose une partie en direct</p>
            <p className="text-sm text-text-muted">{g.label} · {g.total} questions · {g.seconds} s chacune.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void run(() => acceptLive(g.id))} className="btn-brand press rounded-token px-5 py-2 font-semibold">C'est parti ⚡</button>
              <button type="button" onClick={() => void run(() => declineLive(g.id))} className="chip press text-sm">Pas maintenant</button>
            </div>
          </>
        )}
      </section>
    );
  }

  if (g.status === "paused") {
    const mine = g.waiting.includes(myId);
    const names = g.waiting.map((id) => (id === myId ? "toi" : other)).join(" et ");
    const left = Math.max(0, (g.pauseEnds ?? now) - now);
    const h = Math.floor(left / 3_600_000);
    const m = Math.floor((left % 3_600_000) / 60_000);
    return (
      <section className="card flex flex-col gap-3 p-5 qz-slide" aria-label="Partie en pause">
        {scores}
        <p className="font-display text-xl font-bold">⏸ En attente de {names}…</p>
        <p className="text-sm text-text-muted">
          Question {g.index + 1}/{g.total}. La partie reste en pause encore {h} h {String(m).padStart(2, "0")}, puis elle s'arrête.
          {!mine && " Ta réponse est gardée."}
        </p>
        <div className="flex flex-wrap gap-2">
          {mine
            ? <button type="button" onClick={() => void run(() => resumeLive(g.id))} className="btn-brand press rounded-token px-5 py-2 font-semibold">▶ Reprendre</button>
            : <button type="button" onClick={() => void run(() => nudgeLive(g.id))} className="btn-brand press rounded-token px-4 py-2 font-semibold">🔔 Relancer {other}</button>}
          <Quit g={g} run={run} />
        </div>
      </section>
    );
  }

  if (g.status === "playing" && g.phase === "reveal") {
    const round = g.rounds.find((r) => r.index === g.index);
    return (
      <section className="flex flex-col gap-3" aria-label="Réponses">
        {scores}
        {round && <RoundCard key={round.index} r={round} g={g} host={host} other={other} color={color} big />}
        <p className="text-center text-xs text-text-muted">{g.index + 1 < g.total ? "Question suivante dans un instant…" : "Et le résultat…"}</p>
      </section>
    );
  }

  if (g.status === "playing" && g.question) {
    return <Question key={`${g.index}:${g.deadline}`} g={g} host={host} other={other} color={color} now={now} run={run} scores={scores} />;
  }

  return <Final g={g} host={host} other={other} color={color} onNew={onNew} />;
}

function Quit({ g, run }: { g: LiveView; run: (call: () => Promise<LiveView | void>) => Promise<void> }) {
  return (
    <button
      type="button"
      onClick={() => window.confirm("Abandonner la partie en direct ?") && void run(() => quitLive(g.id))}
      className="chip press text-sm text-text-muted"
    >
      Abandonner
    </button>
  );
}

function Question({ g, host, other, color, now, run, scores }: {
  g: LiveView;
  host: boolean;
  other: string;
  color: string;
  now: number;
  run: (call: () => Promise<LiveView | void>) => Promise<void>;
  scores: React.ReactNode;
}) {
  const q = g.question!;
  const [ticks, setTicks] = useState<number[]>([]);
  const [sending, setSending] = useState(false);
  const iAnswered = host ? g.hostAnswered : g.guestAnswered;
  const theyAnswered = host ? g.guestAnswered : g.hostAnswered;
  const leftMs = Math.max(0, (g.deadline ?? now) - now);
  const over = leftMs === 0;
  const locked = iAnswered || sending || over;

  const send = async (choices: number[]) => {
    setSending(true);
    await run(() => answerLive(g.id, choices));
    setSending(false);
  };

  return (
    <section className="card flex flex-col gap-4 p-5 qz-slide" aria-label={`Question ${g.index + 1}`}>
      {scores}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-text-muted">Question {g.index + 1}/{g.total}</span>
        <Ring leftMs={leftMs} seconds={g.seconds} color={color} />
      </div>
      <p className="font-display text-xl font-bold leading-snug">{q.text}</p>
      {q.multi ? (
        <>
          <p className="text-xs text-text-muted">Coche ce qui est vrai pour toi (plusieurs possibles), puis valide.</p>
          <Ticks options={q.options} ticked={ticks} color={color} disabled={locked} label="Ta réponse" onToggle={(i) => setTicks((t) => toggled(t, i))} />
          {!iAnswered && (
            <button type="button" disabled={locked || ticks.length === 0} onClick={() => void send(ticks)} className="btn-brand press self-start rounded-token px-5 py-2 font-semibold disabled:opacity-40">
              Valider{ticks.length > 1 ? ` (${ticks.length})` : ""}
            </button>
          )}
        </>
      ) : (
        <div className="grid gap-2" role="group" aria-label="Choix">
          {q.options.map((o, i) => (
            <button
              key={o}
              type="button"
              disabled={locked}
              onClick={() => {
                setTicks([i]);
                void send([i]);
              }}
              className={"qz-option press rounded-token border-2 px-4 py-3 text-left font-semibold transition " + (ticks[0] === i ? "text-white" : "border-border")}
              style={ticks[0] === i ? { background: color, borderColor: color } : undefined}
            >
              {o}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 text-sm" aria-live="polite">
        {iAnswered && <span className="font-semibold">✓ Répondu{theyAnswered ? "" : ` · on attend ${other}…`}</span>}
        {!iAnswered && over && <span className="font-semibold text-danger">⏱ Temps écoulé…</span>}
        {theyAnswered && <span className="qz-pop text-text-muted">{other} a répondu ✓</span>}
        <span className="ml-auto"><Quit g={g} run={run} /></span>
      </div>
    </section>
  );
}

/** The shared countdown, drawn from the server's deadline (so both phones show the same). */
function Ring({ leftMs, seconds, color }: { leftMs: number; seconds: number; color: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const left = Math.ceil(leftMs / 1000);
  const low = left <= 5;
  return (
    <span className="relative grid h-11 w-11 place-items-center" role="timer" aria-label={`${left} secondes`}>
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--color-border)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={low ? "var(--color-danger)" : color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, leftMs / (seconds * 1000)))}
          style={{ transition: "stroke-dashoffset 0.25s linear" }}
        />
      </svg>
      <span className={"text-sm font-bold tabular-nums " + (low ? "text-danger" : "")}>{left}</span>
    </span>
  );
}

/**
 * One question once revealed: who answered what. Quiz: the right option in
 * green. Nous deux: what we both ticked stands out.
 */
function RoundCard({ r, g, host, other, color, big }: { r: LiveRound; g: LiveView; host: boolean; other: string; color: string; big?: boolean }) {
  const mine = (host ? r.host : r.guest) ?? [];
  const theirs = (host ? r.guest : r.host) ?? [];
  const myPoints = host ? r.hostPoints : r.guestPoints;
  const theirPoints = host ? r.guestPoints : r.hostPoints;
  const quiz = g.kind === "quiz";
  return (
    <article className={"card flex flex-col gap-2 " + (big ? "p-5 qz-pop" : "p-3")} aria-label={`Question ${r.index + 1}`}>
      <p className={big ? "font-display text-lg font-bold leading-snug" : "text-sm font-semibold"}>{r.text}</p>
      <ul className="flex flex-col gap-1.5">
        {r.options.map((o, i) => {
          const me = mine.includes(i);
          const them = theirs.includes(i);
          const good = quiz ? i === r.correct : me && them;
          if (!big && !me && !them && !good) return null;
          return (
            <li
              key={o}
              className={"flex items-center gap-2 rounded-token border-2 px-3 py-1.5 text-sm " + (good ? "font-semibold" : "border-border")}
              style={good ? { borderColor: quiz ? "var(--color-success, #22a06b)" : color, background: `color-mix(in srgb, ${quiz ? "#22a06b" : color} 14%, transparent)` } : undefined}
            >
              <span className="flex-1">{good && (quiz ? "✅ " : "💞 ")}{o}</span>
              {me && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold">Toi</span>}
              {them && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold">{other}</span>}
            </li>
          );
        })}
      </ul>
      <p className="text-sm tabular-nums">
        {quiz
          ? <>Toi <b>+{myPoints}</b> · {other} <b>+{theirPoints}</b>{r.host == null || r.guest == null ? " · ⏱ pas de réponse" : ""}</>
          : <><b>{myPoints} %</b> sur la même longueur d'onde{mine.length + theirs.length > 0 && ` (${mine.filter((i) => theirs.includes(i)).length} en commun)`}</>}
      </p>
    </article>
  );
}

const ENDED: Record<string, string> = {
  expired: "La partie s'est arrêtée : plus de 24 h sans nouvelles.",
  declined: "L'invitation a été refusée ou annulée.",
};

function Final({ g, host, other, color, onNew }: { g: LiveView; host: boolean; other: string; color: string; onNew: () => void }) {
  const me = host ? g.hostScore : g.guestScore;
  const them = host ? g.guestScore : g.hostScore;
  const played = g.rounds.filter((r) => r.host != null && r.guest != null);
  const compat = played.length ? Math.round(me / played.length) : 0;
  const finished = g.endedReason === "finished";
  const abandoned = g.endedReason === "abandon"; // no winner then: just « Partie abandonnée »
  const reason = g.status === "cancelled" && g.endedReason === "expired" ? "L'invitation a expiré (24 h)." : ENDED[g.endedReason ?? ""];
  const title = g.kind === "quiz"
    ? me > them ? "🏆 Tu gagnes !" : me < them ? `🏆 ${other} gagne !` : "🤝 Égalité !"
    : `💞 Compatibilité ${compat} %`;
  return (
    <section className="flex flex-col gap-3 qz-slide" aria-label="Fin de partie">
      {finished && (g.kind === "quiz" ? me > them : compat >= 60) && <Confetti />}
      <div className="card flex flex-col items-center gap-2 p-6 text-center">
        <p className="text-sm font-semibold text-text-muted">{g.label}</p>
        {abandoned && <p className="font-display text-2xl font-bold">🏳️ Partie abandonnée</p>}
        {!abandoned && g.status === "done" && (played.length > 0 || finished) && <p className="font-display text-2xl font-bold" style={{ color }}>{title}</p>}
        {!abandoned && g.kind === "quiz" && g.status === "done" && <p className="tabular-nums">Toi <b>{me}</b> · {other} <b>{them}</b></p>}
        {g.kind === "nous" && finished && <p className="text-sm text-text-muted">{compat >= 80 ? "Deux têtes, un seul cœur." : compat >= 50 ? "Joliment accordés." : "Assez différents pour ne jamais s'ennuyer."}</p>}
        {reason && <p className="text-sm text-text-muted">{reason}</p>}
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onNew} className="btn-brand press rounded-token px-5 py-2 font-semibold">⚡ Nouvelle partie</button>
          {g.status === "done" && played.length > 0 && (
            <ShareScore
              text={g.kind === "quiz"
                ? `⚡ Duel quiz en direct · ${g.label} : moi ${me} – ${them} ${other} · ${me > them ? "victoire 🏆" : me < them ? `victoire de ${other} 👑` : "égalité 🤝"}`
                : `💞 Même longueur d'onde en direct avec ${other} : ${compat} % de compatibilité sur ${played.length} question${played.length > 1 ? "s" : ""} !`}
            />
          )}
        </div>
      </div>
      {g.rounds.length > 0 && (
        <details className="card p-3">
          <summary className="cursor-pointer text-sm font-semibold">Revoir les {g.rounds.length} questions</summary>
          <div className="mt-3 flex flex-col gap-2">
            {g.rounds.map((r) => <RoundCard key={r.index} r={r} g={g} host={host} other={other} color={color} />)}
          </div>
        </details>
      )}
    </section>
  );
}
