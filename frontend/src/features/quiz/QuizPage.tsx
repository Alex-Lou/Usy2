import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { onCoupleActivity } from "../couple/activity";
import { getChallenges, getQuiz, MIX, playChallenge, startChallenge, startRun, type QuizChallenges, type QuizOverview, type QuizTheme } from "./api";
import { ChallengePicker, DuelsCard, DuelView } from "./QuizDuels";
import { QuizPlay } from "./QuizPlay";

const THEME_KEY = "memocat.quiz.theme";
// The path winds: where each level sits across the map (percent from the left).
const PATH_X = [50, 78, 50, 22, 50];

/** {@code challenge}: a new duel (no id) or one sent to me (its id). */
type Playing = { theme: string; level: number | null; challenge?: { id?: number } };

/**
 * 🧠 Quiz: a map per theme (5 levels, the next one opens with a star), and
 * "défis" (the other one plays the very same questions; see QuizDuels).
 * "Toi & moi" moved to 💞 Nous deux (features/nous).
 */
export function QuizPage() {
  const [data, setData] = useState<QuizOverview | null>(null);
  const [failed, setFailed] = useState(false);
  const [themeId, setThemeId] = useState<string>(() => {
    try {
      return localStorage.getItem(THEME_KEY) ?? "histoire";
    } catch {
      return "histoire";
    }
  });
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [duels, setDuels] = useState<QuizChallenges | null>(null);
  const [picking, setPicking] = useState(false);
  const [params, setParams] = useSearchParams();
  const duelParam = Number(params.get("duel"));
  const [duel, setDuel] = useState<number | null>(Number.isInteger(duelParam) && duelParam > 0 ? duelParam : null);

  const loadDuels = useCallback(() => {
    getChallenges().then(setDuels).catch(() => undefined); // the rest of the quiz works without it
  }, []);
  const load = useCallback(() => {
    getQuiz()
      .then((d) => {
        setData(d);
        setFailed(false);
      })
      .catch(() => setFailed(true));
    loadDuels();
  }, [loadDuels]);
  useEffect(load, [load]);
  // A duel sent or played back (from the other phone): the list follows.
  useEffect(() => onCoupleActivity((a) => {
    if (a.kind === "quiz-challenge" || a.kind === "quiz-done") loadDuels();
  }), [loadDuels]);

  const choose = (id: string) => {
    setThemeId(id);
    try {
      localStorage.setItem(THEME_KEY, id);
    } catch {
      /* per-device nicety only */
    }
  };

  const theme = data?.themes.find((t) => t.id === themeId) ?? data?.themes[0];
  const back = () => {
    setPlaying(null);
    setPicking(false);
    setDuel(null);
    if (params.has("duel")) setParams({}, { replace: true });
    load();
  };

  if (duel != null) return <Frame><DuelView key={duel} id={duel} onBack={back} /></Frame>;
  if (playing) {
    const t = data?.themes.find((x) => x.id === playing.theme);
    const isMix = playing.theme === MIX;
    const level = playing.level ?? 0;
    const ch = playing.challenge;
    const begin = ch ? (ch.id != null ? () => playChallenge(ch.id!) : () => startChallenge(playing.theme, playing.level)) : () => startRun(playing.theme, playing.level);
    const label = isMix ? "🎲 Mélange surprise" : `${t?.emoji} ${t?.label} · niveau ${level}`;
    return (
      <Frame>
        <QuizPlay
          key={`${playing.theme}-${level}-${ch?.id ?? (ch ? "new" : "")}`}
          begin={begin}
          color={isMix ? "#7c6cf0" : t?.color ?? "#7c6cf0"}
          title={ch ? `🎯 Défi · ${label}` : label}
          partnerName={duels?.partnerName}
          onExit={back}
          onNext={!ch && level < 5 ? () => setPlaying({ theme: playing.theme, level: level + 1 }) : undefined}
          onDuel={(id) => {
            setPlaying(null);
            setDuel(id);
          }}
        />
      </Frame>
    );
  }
  if (picking && data) {
    return (
      <Frame>
        <ChallengePicker
          themes={data.themes}
          partnerName={duels?.partnerName ?? null}
          onPick={(theme, level) => {
            setPicking(false);
            setPlaying({ theme, level, challenge: {} });
          }}
          onClose={() => setPicking(false)}
        />
      </Frame>
    );
  }

  return (
    <Frame>
      <header className="flex items-center gap-3 animate-fade-up">
        <Link to="/jeux" aria-label="Retour aux jeux" className="chip press text-sm">←</Link>
        <div>
          <h1 className="font-display text-2xl font-bold">Quiz</h1>
          <p className="text-sm text-text-muted">Un thème, un chemin, trois étoiles par niveau.</p>
        </div>
        <Link to="/jeux/direct" className="chip press ml-auto shrink-0 text-sm font-semibold">⚡ En direct</Link>
      </header>

      {failed && <p className="card p-4 text-sm">Le quiz ne répond pas. <button type="button" onClick={load} className="underline">Réessayer</button></p>}
      {!data && !failed && <div className="card h-80 animate-pulse" />}

      {data && theme && (
        <>
          {duels && (
            <DuelsCard
              data={duels}
              onNew={() => setPicking(true)}
              onPlay={(c) => setPlaying({ theme: c.theme, level: c.level, challenge: { id: c.id } })}
              onOpen={setDuel}
            />
          )}

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar" role="tablist" aria-label="Thèmes">
            {data.themes.map((t) => {
              const stars = t.levels.reduce((n, l) => n + l.stars, 0);
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={t.id === theme.id}
                  onClick={() => choose(t.id)}
                  className={"chip press flex shrink-0 items-center gap-1.5 text-sm " + (t.id === theme.id ? "font-semibold text-white" : "text-text-muted")}
                  style={t.id === theme.id ? { background: t.color, borderColor: t.color } : undefined}
                >
                  <span aria-hidden="true">{t.emoji}</span> {t.label}
                  <span className="text-xs opacity-80">⭐{stars}</span>
                </button>
              );
            })}
          </div>

          <LevelPath key={theme.id} theme={theme} onPlay={(level) => setPlaying({ theme: theme.id, level })} />
        </>
      )}
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex max-w-xl flex-col gap-4">{children}</div>;
}

/** The winding path of a theme's levels: done ones show their stars, the next one pulses, locked ones wait. */
function LevelPath({ theme, onPlay }: { theme: QuizTheme; onPlay: (level: number) => void }) {
  const next = theme.levels.find((l) => l.unlocked && l.stars === 0)?.level;
  const height = theme.levels.length * 104;
  const points = theme.levels.map((_, i) => [PATH_X[i % PATH_X.length], 52 + i * 104] as const);
  const d = points.map(([x, y], i) => {
    if (i === 0) return `M ${x} ${y}`;
    const [px, py] = points[i - 1];
    return `C ${px} ${py + 52}, ${x} ${y - 52}, ${x} ${y}`;
  }).join(" ");
  return (
    <section className="card relative overflow-hidden p-2" aria-label={`Niveaux ${theme.label}`} style={{ ["--qz" as string]: theme.color }}>
      <div className="pointer-events-none absolute -left-4 top-4 text-8xl opacity-10" aria-hidden="true">{theme.emoji}</div>
      <div className="relative mx-auto w-full max-w-sm" style={{ height }}>
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path d={d} fill="none" stroke={theme.color} strokeOpacity="0.35" strokeWidth="6" strokeLinecap="round" strokeDasharray="1 12" vectorEffect="non-scaling-stroke" />
        </svg>
        {theme.levels.map((l, i) => {
          const [x, y] = points[i];
          const current = l.level === next;
          return (
            <button
              key={l.level}
              type="button"
              disabled={!l.unlocked}
              onClick={() => onPlay(l.level)}
              aria-label={`Niveau ${l.level}${l.unlocked ? "" : ", verrouillé"}${l.stars ? `, ${l.stars} étoile${l.stars > 1 ? "s" : ""}` : ""}`}
              className="qz-node absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 press disabled:cursor-not-allowed"
              style={{ left: `${x}%`, top: y, animationDelay: `${i * 80}ms` }}
            >
              <span
                className={"grid h-16 w-16 place-items-center rounded-full border-4 font-display text-2xl font-bold shadow-lg " + (current ? "qz-pulse" : "")}
                style={
                  l.unlocked
                    ? { background: theme.color, borderColor: "color-mix(in srgb, #fff 70%, " + theme.color + ")", color: "#fff" }
                    : { background: "var(--color-surface-2)", borderColor: "var(--color-border)", color: "var(--color-text-muted)" }
                }
              >
                {l.unlocked ? l.level : "🔒"}
              </span>
              <span className="text-sm leading-none" aria-hidden="true">
                {[0, 1, 2].map((s) => (
                  <span key={s} className={s < l.stars ? "" : "opacity-25 grayscale"}>⭐</span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
