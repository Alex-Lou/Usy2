import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../lib/api/client";
import { forgetMine, getMine, KINDS, saveMine, type NousMine, type NousTheme } from "./api";
import { AnswerForm } from "./formats";
import { CategoryGrid, FilterChip, countBy } from "./NousCategories";
import { colorOf } from "./NousGuess";

const isAnswered = (q: NousMine) => q.choices != null || q.answer != null;

/**
 * ✍️ Answering about me: a category, then one question at a time (saved, the
 * next one comes); « Passer » keeps it for later. Already answered ones can
 * be gone through again to change or erase them. Only the other one's
 * guesses ever reveal them.
 */
export function MineMode({ themes, partnerName, theme, onTheme, onChange }: {
  themes: NousTheme[];
  partnerName: string;
  theme: string | null;
  onTheme: (t: string | null) => void;
  onChange: () => void;
}) {
  const [items, setItems] = useState<NousMine[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [review, setReview] = useState(false);
  const [order, setOrder] = useState<string[]>([]); // skipped ones go last
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    getMine().then(setItems).catch(() => setFailed(true));
  }, []);

  const inTheme = useMemo(() => (items ?? []).filter((q) => theme === "all" || q.theme === theme), [items, theme]);
  const list = useMemo(() => {
    const l = inTheme.filter((q) => isAnswered(q) === review);
    const rank = (id: string) => order.indexOf(id);
    return [...l].sort((a, b) => rank(a.id) - rank(b.id));
  }, [inTheme, review, order]);
  const current = list[0];
  const todo = inTheme.filter((q) => !isAnswered(q)).length;

  if (failed) return <p className="card p-4 text-sm">Tes réponses ne se chargent pas.</p>;
  if (!items) return <div className="card h-72 animate-pulse" />;

  if (!theme) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-muted">Choisis une catégorie : tu réponds sur toi, {partnerName} devinera.</p>
        <CategoryGrid themes={themes} counts={countBy(items.filter((q) => !isAnswered(q)))} unit={(n) => (n ? `${n} sans réponse` : "tout est répondu ✓")} onPick={onTheme} />
      </div>
    );
  }

  const replace = (next: NousMine) => setItems((l) => l?.map((q) => (q.id === next.id ? next : q)) ?? null);
  const run = async (call: () => Promise<void>, next: NousMine) => {
    setBusy(true);
    setError(null);
    try {
      await call();
      replace(next);
      onChange();
      setFlash(true);
      window.setTimeout(() => setFlash(false), 900);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Pas enregistré, réessaie.");
    } finally {
      setBusy(false);
    }
  };
  const save = (q: NousMine, choices: number[] | null, words: string | null) =>
    void run(() => saveMine(q.id, choices, words), { ...q, choices, answer: words?.trim() ?? null });
  const forget = (q: NousMine) => void run(() => forgetMine(q.id), { ...q, choices: null, answer: null });
  // Skipped (or kept as it is): to the end of the line.
  const later = (q: NousMine) => setOrder((o) => [...o.filter((id) => id !== q.id), q.id]);

  const color = current ? colorOf(themes, current.theme) : "var(--nous-accent)";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip on={!review} onClick={() => setReview(false)}>À répondre <span className="ml-1 opacity-80">{todo}</span></FilterChip>
        <FilterChip on={review} onClick={() => setReview(true)}>Déjà répondues <span className="ml-1 opacity-80">{inTheme.length - todo}</span></FilterChip>
        <AnimatePresence>{flash && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-auto text-sm font-semibold text-primary">✓ Enregistré</motion.span>}</AnimatePresence>
      </div>

      {!current ? (
        <div className="card flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-sm text-text-muted">{review ? "Pas encore de réponse ici." : "Tout est répondu dans cette catégorie 🎉"}</p>
          <button type="button" onClick={() => onTheme(null)} className="chip press text-sm">Autre catégorie</button>
        </div>
      ) : (
        <section key={current.id + String(isAnswered(current))} className="nd-card card flex flex-col gap-4 p-5" style={{ ["--nd" as string]: color }} data-nous-mine={current.id}>
          <div className="flex items-center justify-between gap-2">
            <span className="nd-pill rounded-full px-2.5 py-0.5 text-xs font-semibold text-white">{KINDS[current.kind].emoji} {KINDS[current.kind].label}</span>
            <span className="text-xs tabular-nums text-text-muted">encore {list.length}</span>
          </div>
          <h2 className="font-display text-2xl font-bold leading-snug">{current.kind === "f" ? current.text.replace("___", "…") : current.text}</h2>
          <p className="-mt-2 text-sm text-text-muted">{KINDS[current.kind].answer}</p>
          <AnswerForm q={current} mode="mine" initial={{ choices: current.choices, text: current.answer }} color={color} busy={busy} onSubmit={(c, t) => save(current, c, t)} />
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <div className="flex items-center justify-center gap-4 text-sm text-text-muted">
            {list.length > 1 && <button type="button" onClick={() => later(current)} className="underline">{review ? "Suivante" : "Passer"}</button>}
            {review && <button type="button" onClick={() => forget(current)} disabled={busy} className="underline">Effacer ma réponse</button>}
          </div>
          {review && <p className="text-center text-xs text-text-muted">Changer ta réponse laisse {partnerName} deviner à nouveau.</p>}
        </section>
      )}
    </div>
  );
}
