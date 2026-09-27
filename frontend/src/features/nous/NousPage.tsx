import { MotionConfig } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { onCoupleActivity } from "../couple/activity";
import { getNous, type NousOverview } from "./api";
import { TalkMode } from "./NousCards";
import { DailyView } from "./NousDaily";
import { GuessMode } from "./NousGuess";
import { NousHome, type Mode } from "./NousHome";
import { MineMode } from "./NousMine";
import { ResetBanner } from "./NousReset";
import { ResultsView } from "./NousScores";

const MODES: Record<Mode, string> = { guess: "🔮 Deviner", mine: "✍️ Répondre sur moi", talk: "💬 Cartes pour parler" };

/**
 * 💞 Nous deux, without tabs: the menu (two squares, the question of the
 * day, the ways to play), then a way to play → a category → the questions
 * one by one; a square opens the results. Where I am lives in the URL
 * (?v=play&mode=guess&theme=…, ?v=results&side=me, ?v=daily), so « back »
 * works as expected.
 */
export function NousPage() {
  const [params, setParams] = useSearchParams();
  const view = params.get("v");
  const mode = (params.get("mode") as Mode | null) ?? "guess";
  const theme = params.get("theme");
  const side = params.get("side") === "them" ? "them" : "me";
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
  // Something from the other phone: counts and squares follow.
  useEffect(() => onCoupleActivity((a) => {
    if (a.kind === "nous-guess" || a.kind === "nous-reset-ask" || a.kind === "nous-reset") load();
  }), [load]);

  const go = (next: Record<string, string>) => setParams(next);
  const home = () => go({});
  const partner = data?.partnerName ?? "ton amour";
  const title = view === "play" ? (theme ? `${MODES[mode]} · ${theme === "all" ? "toutes" : data?.themes.find((t) => t.id === theme)?.label ?? ""}` : MODES[mode])
    : view === "results" ? "📖 Résultats" : view === "daily" ? "✨ Question du jour" : null;
  // « Back »: from the questions to their categories, else to the menu.
  const back = view === "play" && theme ? () => go({ v: "play", mode }) : home;

  return (
    <MotionConfig reducedMotion="user">
    <div className="mx-auto flex max-w-xl flex-col gap-4" data-nous="">
      <header className="flex items-center gap-3 animate-fade-up">
        {view ? (
          <button type="button" onClick={back} aria-label="Retour" className="chip press text-sm">←</button>
        ) : (
          <Link to="/jeux" aria-label="Retour aux jeux" className="chip press text-sm">←</Link>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-bold">{title ?? "💞 Nous deux"}</h1>
          {!view && <p className="text-sm text-text-muted">Se découvrir encore, et deviner l'autre.</p>}
        </div>
      </header>

      {failed && <p className="card p-4 text-sm">Nous deux ne répond pas. <button type="button" onClick={load} className="underline">Réessayer</button></p>}
      {!data && !failed && <div className="card h-40 animate-pulse" />}

      {data && (
        <>
          {data.reset && <ResetBanner key={data.reset.createdAt} reset={data.reset} themes={data.themes} partnerName={partner} onDone={load} />}
          {!view && (
            <NousHome
              data={data}
              partnerName={partner}
              onResults={(s, show) => go(show ? { v: "results", side: s, show } : { v: "results", side: s })}
              onDaily={() => go({ v: "daily" })}
              onMode={(m) => go({ v: "play", mode: m })}
            />
          )}
          {view === "play" && mode === "guess" && (
            <GuessMode themes={data.themes} partnerName={partner} theme={theme} onTheme={(t) => go(t ? { v: "play", mode, theme: t } : { v: "play", mode })} onChange={load} />
          )}
          {view === "play" && mode === "mine" && (
            <MineMode themes={data.themes} partnerName={partner} theme={theme} onTheme={(t) => go(t ? { v: "play", mode, theme: t } : { v: "play", mode })} onChange={load} />
          )}
          {view === "play" && mode === "talk" && (
            <TalkMode themes={data.themes} theme={theme} onTheme={(t) => go(t ? { v: "play", mode, theme: t } : { v: "play", mode })} />
          )}
          {view === "results" && (
            <ResultsView
              key={side}
              side={side}
              themes={data.themes}
              partnerName={partner}
              toGuess={data.toGuess}
              pending={data.reset}
              initialShow={params.get("show") === "say" ? "say" : undefined}
              onGuess={() => go({ v: "play", mode: "guess", theme: "all" })}
              onChange={load}
            />
          )}
          {view === "daily" && data.daily && (
            <DailyView daily={data.daily} theirs={data.dailyTheirs} guessed={data.dailyGuessed} themes={data.themes} partnerName={partner} onChange={load} />
          )}
        </>
      )}
    </div>
    </MotionConfig>
  );
}
