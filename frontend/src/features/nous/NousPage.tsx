import { MotionConfig, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { onCoupleActivity } from "../couple/activity";
import { getNous, type NousOverview } from "./api";
import { CardsTab } from "./NousCards";
import { CompareTab } from "./NousCompare";
import { Gauge } from "./NousGauge";
import { GuessTab, HistoryTab, JudgeTab } from "./NousGuess";
import { MineTab } from "./NousMine";
import { ResetBanner } from "./NousReset";
import { ScoresTab } from "./NousScores";

type Tab = "cards" | "mine" | "guess" | "judge" | "history" | "scores" | "compare";
const TABS: { id: Tab; label: string }[] = [
  { id: "cards", label: "💬 Cartes" },
  { id: "mine", label: "✍️ Mes réponses" },
  { id: "guess", label: "🔮 Deviner" },
  { id: "judge", label: "⚖️ À juger" },
  { id: "history", label: "📜 Verdicts" },
  { id: "scores", label: "📊 Scores" },
  { id: "compare", label: "🔍 Comparer" },
];

/**
 * 💞 Nous deux: cards to talk about, my answers about me, guessing the other
 * one's in many formats (what is tapped is checked at once, words are judged
 * by the person it's about), scores by theme, our answers side by side, and
 * starting again.
 */
export function NousPage() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab") as Tab | null;
  const tab: Tab = TABS.some((t) => t.id === tabParam) ? (tabParam as Tab) : "cards";
  const compareTheme = params.get("theme") ?? "all";
  const [data, setData] = useState<NousOverview | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    getNous()
      .then((d) => {
        setData(d);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);
  // A guess or a verdict from the other phone: counts and lists follow.
  useEffect(() => onCoupleActivity((a) => {
    if (a.kind === "nous-guess" || a.kind === "nous-judged" || a.kind === "nous-reset-ask" || a.kind === "nous-reset") load();
  }), [load]);

  const go = (t: Tab, theme?: string) => setParams(t === "cards" ? {} : theme && theme !== "all" ? { tab: t, theme } : { tab: t }, { replace: true });
  const partner = data?.partnerName ?? "ton amour";

  return (
    <MotionConfig reducedMotion="user">
    <div className="mx-auto flex max-w-xl flex-col gap-4" data-nous="">
      <header className="flex items-center gap-3 animate-fade-up">
        <Link to="/jeux" aria-label="Retour aux jeux" className="chip press text-sm">←</Link>
        <div>
          <h1 className="font-display text-2xl font-bold">💞 Nous deux</h1>
          <p className="text-sm text-text-muted">Des questions pour se découvrir encore, et deviner l'autre.</p>
        </div>
        <Link to="/jeux/direct" className="chip press ml-auto shrink-0 text-sm font-semibold">⚡ En direct</Link>
      </header>

      {failed && <p className="card p-4 text-sm">Nous deux ne répond pas. <button type="button" onClick={load} className="underline">Réessayer</button></p>}
      {!data && !failed && <div className="card h-40 animate-pulse" />}

      {data && (
        <>
          {data.reset && <ResetBanner key={data.reset.createdAt} reset={data.reset} themes={data.themes} partnerName={partner} onDone={load} />}
          <section className="grid grid-cols-2 gap-3" aria-label="Télépathie">
            <Gauge title={`Toi → ${partner}`} score={data.me} />
            <Gauge title={`${partner} → toi`} score={data.them} />
          </section>

          <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar" role="tablist" aria-label="Nous deux">
            {TABS.map((t) => {
              const badge = t.id === "guess" ? data.toGuess : t.id === "judge" ? data.toJudge : t.id === "mine" ? null : 0;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => go(t.id)}
                  className={"chip press relative shrink-0 text-sm " + (tab === t.id ? "font-semibold text-white" : "text-text-muted")}
                >
                  {tab === t.id && <motion.span layoutId="nd-tab" className="nd-tab-pill absolute inset-0 rounded-full" transition={{ type: "spring", stiffness: 420, damping: 32 }} aria-hidden="true" />}
                  <span className="relative">{t.label}</span>
                  {t.id === "mine" && <span className="relative ml-1 text-xs opacity-80">{data.myAnswers}/{data.answerable}</span>}
                  {badge != null && badge > 0 && (
                    <span className="nd-badge relative ml-1.5 inline-grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold text-white" aria-label={`${badge} en attente`}>{badge}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {tab === "cards" && <CardsTab themes={data.themes} daily={data.daily} onAnswer={() => go("mine")} />}
          {tab === "mine" && <MineTab themes={data.themes} partnerName={partner} onChange={load} />}
          {tab === "guess" && <GuessTab themes={data.themes} partnerName={partner} onChange={load} />}
          {tab === "judge" && <JudgeTab themes={data.themes} partnerName={partner} onChange={load} />}
          {tab === "history" && <HistoryTab themes={data.themes} partnerName={partner} />}
          {tab === "scores" && (
            <ScoresTab key={data.reset?.createdAt ?? "none"} themes={data.themes} partnerName={partner} pending={data.reset} onCompare={(t) => go("compare", t)} onChange={load} />
          )}
          {tab === "compare" && (
            <CompareTab themes={data.themes} partnerName={partner} theme={compareTheme} onTheme={(t) => go("compare", t)} onGuess={() => go("guess")} onAnswer={() => go("mine")} />
          )}
        </>
      )}
    </div>
    </MotionConfig>
  );
}
