import { useEffect, useState } from "react";
import { ApiError } from "../../lib/api/client";
import { getHistory, KINDS, saveMine, sendGuess, type NousCard, type NousReveal, type NousTheme } from "./api";
import { AnswerForm } from "./formats";
import { colorOf, RevealCard } from "./NousGuess";

/**
 * ✨ The question of the day, the same for both of us: I answer it about me,
 * then (once the other one has answered too) I guess theirs and see at once
 * whether it was the same.
 */
export function DailyView({ daily, theirs, guessed, themes, partnerName, onChange }: {
  daily: NousCard;
  theirs: boolean;
  guessed: boolean;
  themes: NousTheme[];
  partnerName: string;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<NousReveal | null>(null);
  const color = colorOf(themes, daily.theme);

  // Already guessed (another day's visit, or the other phone): show how it went.
  useEffect(() => {
    if (!guessed || reveal) return;
    getHistory().then((h) => setReveal(h.mine.find((r) => r.id === daily.id) ?? null)).catch(() => {});
  }, [guessed, reveal, daily.id]);

  const run = async (call: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await call();
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Pas envoyé, réessaie.");
    } finally {
      setBusy(false);
    }
  };

  const step = !daily.answered ? "mine" : !theirs ? "wait" : !guessed && !reveal ? "guess" : "done";
  return (
    <div className="flex flex-col gap-3" data-nous-daily={step}>
      <section className="nd-daily card flex flex-col gap-1 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-90">✨ La question du jour · la même pour vous deux</p>
        <h2 className="font-display text-2xl font-bold leading-snug">{daily.text}</h2>
      </section>

      {step === "mine" && (
        <section className="card flex flex-col gap-3 p-5" style={{ ["--nd" as string]: color }}>
          <p className="font-semibold">1. Ta réponse <span className="font-normal text-text-muted">— {KINDS[daily.kind].answer}</span></p>
          <AnswerForm q={daily} mode="mine" color={color} busy={busy} onSubmit={(c, t) => void run(() => saveMine(daily.id, c, t))} />
        </section>
      )}
      {step === "wait" && (
        <p className="card p-5 text-center text-sm">✓ Ta réponse est enregistrée. {partnerName} n'a pas encore répondu : tu pourras deviner dès que ce sera fait 💌</p>
      )}
      {step === "guess" && (
        <section className="card flex flex-col gap-3 p-5" style={{ ["--nd" as string]: color }}>
          <p className="font-semibold">2. Et {partnerName} ? <span className="font-normal text-text-muted">— {KINDS[daily.kind].guess(partnerName)}</span></p>
          <AnswerForm q={daily} mode="guess" color={color} busy={busy}
            onSubmit={(c, t) => void run(async () => setReveal(await sendGuess(daily.id, c, t)))} />
        </section>
      )}
      {step === "done" && reveal && <RevealCard r={reveal} color={color} partnerName={partnerName} onSaid={(r) => { setReveal(r); onChange(); }} />}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}
