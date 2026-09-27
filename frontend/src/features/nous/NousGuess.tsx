import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../lib/api/client";
import { Confetti } from "../games/Confetti";
import { AnswerForm } from "./formats";
import { HangmanBoard } from "./HangmanBoard";
import { CategoryGrid, countBy } from "./NousCategories";
import { phraseFor } from "./phrases";
import {
  getToGuess, KINDS, pointsDetail, saidText, sayGuess, sendGuess, VERDICTS,
  type NousReveal, type NousTheme, type NousToGuess, type Verdict,
} from "./api";

export const colorOf = (themes: NousTheme[], id: string) => themes.find((t) => t.id === id)?.color ?? "var(--nous-accent)";

/**
 * 🔮 Guessing the other one: a category, then one question at a time (any
 * format), then the reveal. What is tapped is marked at once; for words I
 * see their answer and say myself how close I was. A small counter keeps
 * the score of this game, nothing more.
 */
export function GuessMode({ themes, partnerName, theme, onTheme, onChange }: {
  themes: NousTheme[];
  partnerName: string;
  theme: string | null;
  onTheme: (t: string | null) => void;
  onChange: () => void;
}) {
  const [queue, setQueue] = useState<NousToGuess[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<NousReveal | null>(null);
  const [game, setGame] = useState({ played: 0, found: 0 });

  useEffect(() => {
    getToGuess()
      .then((list) => {
        const q = [...list];
        for (let i = q.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [q[i], q[j]] = [q[j], q[i]];
        }
        setQueue(q);
      })
      .catch(() => setFailed(true));
  }, []);

  const shown = useMemo(() => (queue ?? []).filter((q) => theme === "all" || q.theme === theme), [queue, theme]);
  const current = shown[0];

  if (failed) return <p className="card p-4 text-sm">Impossible de charger les questions.</p>;
  if (!queue) return <div className="card h-72 animate-pulse" />;

  if (!theme) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-muted">Choisis une catégorie : tu retrouves ce que {partnerName} a répondu.</p>
        <CategoryGrid themes={themes} counts={countBy(queue)} unit={(n) => (n ? `${n} à deviner` : "rien pour l'instant")} onPick={onTheme} />
      </div>
    );
  }

  const done = (r: NousReveal) => {
    setReveal(r);
    if (r.verdict) setGame((g) => ({ played: g.played + 1, found: g.found + (r.verdict === "right" ? 1 : 0) }));
    onChange();
  };
  const send = async (choices: number[] | null, words: string | null) => {
    if (!current || busy) return;
    setBusy(true);
    setError(null);
    try {
      done(await sendGuess(current.id, choices, words));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Pas envoyé, réessaie.");
    } finally {
      setBusy(false);
    }
  };
  const next = () => {
    const id = reveal?.id;
    setReveal(null);
    setError(null);
    setQueue((q) => q?.filter((x) => x.id !== id) ?? null);
  };
  const skip = () => current && setQueue((q) => (q ? [...q.filter((x) => x.id !== current.id), current] : q));

  const color = current ? colorOf(themes, (reveal ?? current).theme) : "var(--nous-accent)";
  return (
    <div className="flex flex-col gap-3">
      <GameBar game={game} left={shown.length} />
      {reveal ? (
        <RevealCard
          r={reveal}
          color={colorOf(themes, reveal.theme)}
          partnerName={partnerName}
          onSaid={(r) => done(r)}
          next={{ label: shown.length > 1 ? "Suivante →" : "Terminé ✓", onClick: next }}
        />
      ) : !current ? (
        <div className="card flex flex-col items-center gap-3 p-6 text-center" data-nous-empty="">
          <p className="text-sm text-text-muted">Plus rien à deviner ici pour l'instant 🎉 Quand {partnerName} répondra à d'autres questions, elles arriveront.</p>
          <button type="button" onClick={() => onTheme(null)} className="chip press text-sm">Autre catégorie</button>
        </div>
      ) : (
        <section key={current.id} className="nd-card card flex flex-col gap-4 p-5" style={{ ["--nd" as string]: color }} data-nous-guess={current.id}>
          <span className="nd-pill self-start rounded-full px-2.5 py-0.5 text-xs font-semibold text-white">{KINDS[current.kind].emoji} {KINDS[current.kind].label}</span>
          <h2 className="font-display text-2xl font-bold leading-snug">{current.kind === "f" ? current.text.replace("___", "…") : current.text}</h2>
          <p className="-mt-2 text-sm text-text-muted">{KINDS[current.kind].guess(partnerName)}</p>
          {current.kind === "h" ? (
            <HangmanBoard key={current.id} q={current} color={color} onReveal={done} />
          ) : (
            <AnswerForm key={current.id} q={current} mode="guess" color={color} busy={busy} onSubmit={(c, t) => void send(c, t)} />
          )}
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          {shown.length > 1 && <button type="button" onClick={skip} className="self-center text-sm text-text-muted underline">Passer</button>}
        </section>
      )}
    </div>
  );
}

/** This game's little score: found out of played, and what is left. */
function GameBar({ game, left }: { game: { played: number; found: number }; left: number }) {
  return (
    <div className="flex items-center justify-between text-sm text-text-muted" data-nous-game="">
      <span aria-live="polite">{game.played > 0 ? <>💞 <b className="tabular-nums text-text">{game.found}</b> sur <b className="tabular-nums text-text">{game.played}</b> cette partie</> : "Nouvelle partie"}</span>
      <span className="tabular-nums">encore {left}</span>
    </div>
  );
}

/**
 * The reveal of a guess: my guess next to their answer, a kind word and,
 * for words, the three buttons to say how close it was.
 */
export function RevealCard({ r, color, partnerName, onSaid, next }: {
  r: NousReveal;
  color: string;
  partnerName: string;
  onSaid: (r: NousReveal) => void;
  next?: { label: string; onClick: () => void };
}) {
  const [phrase, setPhrase] = useState(() => phraseFor(r.verdict, partnerName));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const say = async (v: Verdict) => {
    setBusy(true);
    setError(null);
    try {
      const done = await sayGuess(r.guessId, v);
      setPhrase(phraseFor(done.verdict, partnerName));
      onSaid(done);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Pas enregistré, réessaie.");
    } finally {
      setBusy(false);
    }
  };
  const detail = pointsDetail(r);
  return (
    <section className="card relative flex flex-col gap-3 overflow-hidden p-5" style={{ ["--nd" as string]: color }} data-nous-reveal={r.id}>
      {r.verdict === "right" && <Confetti />}
      <p className="font-semibold leading-snug">{r.kind === "f" ? r.text.replace("___", "…") : r.text}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}>
          <Bubble who={r.kind === "h" ? "Ta partie" : "Ta réponse"} body={said(r, "guess")} muted />
        </motion.div>
        <motion.div initial={{ opacity: 0, rotateY: 90 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 20 }}>
          <Bubble who={`Celle de ${partnerName}`} body={said(r, "answer")} color={color} />
        </motion.div>
      </div>
      {r.verdict ? <VerdictChip verdict={r.verdict} /> : (
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="C'était proche ?">
          {(["right", "close", "wrong"] as Verdict[]).map((v) => (
            <button key={v} type="button" disabled={busy} onClick={() => void say(v)} className="press flex flex-col items-center justify-center gap-0.5 rounded-token border border-border bg-surface-2 px-2 py-2.5 text-center text-sm font-semibold leading-tight hover:border-primary/50">
              <span className="text-lg" aria-hidden="true">{VERDICTS[v].emoji}</span>{VERDICTS[v].label}
            </button>
          ))}
        </div>
      )}
      <motion.p key={phrase} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center font-display text-base font-bold" data-nous-phrase="">
        {phrase}
      </motion.p>
      {detail && <p className="text-center text-xs text-text-muted">{detail}</p>}
      {error && <p className="text-center text-sm text-danger" role="alert">{error}</p>}
      {next && r.verdict && (
        <button type="button" onClick={next.onClick} className="btn-brand press self-center rounded-token px-5 py-2 font-semibold">{next.label}</button>
      )}
    </section>
  );
}

/** How it went, softly: a small coloured chip, never a stamp. */
export function VerdictChip({ verdict, small }: { verdict: Verdict; small?: boolean }) {
  const v = VERDICTS[verdict];
  return (
    <motion.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 18 }}
      className={"inline-flex shrink-0 items-center gap-1 self-center whitespace-nowrap rounded-full font-semibold text-white " + (small ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-sm")}
      style={{ background: v.color }}
    >
      {v.emoji} {v.label}
    </motion.span>
  );
}

export function said(r: NousReveal, which: "guess" | "answer"): string {
  if (which === "guess" && r.kind === "h") {
    const e = r.errors ?? 0;
    return r.verdict === "wrong" ? `Le mot est resté caché (lettres : ${r.letters ?? ""})` : `Trouvé, ${e} erreur${e > 1 ? "s" : ""} (lettres : ${r.letters ?? ""})`;
  }
  return which === "guess" ? saidText(r.kind, r.options, r.guessChoices, r.guessText) : saidText(r.kind, r.options, r.answerChoices, r.answerText);
}

function Bubble({ who, body, color, muted }: { who: string; body: string; color?: string; muted?: boolean }) {
  return (
    <div className={"rounded-token p-3 " + (muted ? "bg-surface-2" : "text-white")} style={muted ? undefined : { background: color }}>
      <p className={"text-[11px] font-semibold uppercase tracking-wide " + (muted ? "text-text-muted" : "opacity-90")}>{who}</p>
      <p className="mt-0.5 whitespace-pre-wrap break-words font-semibold">{body}</p>
    </div>
  );
}
