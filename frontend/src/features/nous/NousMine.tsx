import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../lib/api/client";
import { forgetMine, getMine, KINDS, saveMine, type NousMine, type NousTheme } from "./api";
import { AnswerForm } from "./formats";
import { FilterChip } from "./NousCards";

/**
 * ✍️ My answers about me, in every format (see AnswerForm). Only the other
 * one's guesses ever reveal them; changing one lets them guess again.
 */
export function MineTab({ themes, partnerName, onChange }: { themes: NousTheme[]; partnerName: string; onChange: () => void }) {
  const [items, setItems] = useState<NousMine[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [theme, setTheme] = useState<string>("all");
  const [todo, setTodo] = useState(true);

  useEffect(() => {
    getMine().then(setItems).catch(() => setFailed(true));
  }, []);

  const shown = useMemo(
    () => (items ?? []).filter((q) => (theme === "all" || q.theme === theme) && (!todo || (q.choices == null && q.answer == null))),
    [items, theme, todo],
  );
  const done = (items ?? []).filter((q) => q.choices != null || q.answer != null).length;

  const saved = (next: NousMine) => {
    setItems((list) => list?.map((q) => (q.id === next.id ? next : q)) ?? null);
    onChange();
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">
        Réponds sur toi : {partnerName} devra deviner. <b className="tabular-nums">{done}/{items?.length ?? "…"}</b> réponses.
      </p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar" role="tablist" aria-label="Thèmes">
        <FilterChip on={theme === "all"} onClick={() => setTheme("all")}>Tous</FilterChip>
        {themes.map((t) => <FilterChip key={t.id} on={theme === t.id} color={t.color} onClick={() => setTheme(t.id)}>{t.emoji} {t.label}</FilterChip>)}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={todo} onChange={(e) => setTodo(e.target.checked)} /> Seulement celles sans réponse
      </label>

      {failed && <p className="card p-4 text-sm">Tes réponses ne se chargent pas.</p>}
      {!items && !failed && <div className="card h-64 animate-pulse" />}
      {items && shown.length === 0 && <p className="card p-6 text-center text-sm text-text-muted">{todo ? "Tout est répondu ici 🎉" : "Rien ici."}</p>}

      <ul className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {shown.slice(0, 30).map((q) => (
            <MineItem key={q.id} q={q} color={themes.find((t) => t.id === q.theme)?.color ?? "var(--nous-accent)"} partnerName={partnerName} onSaved={saved} />
          ))}
        </AnimatePresence>
      </ul>
      {shown.length > 30 && <p className="text-center text-xs text-text-muted">Réponds à celles-ci, les suivantes arrivent ensuite.</p>}
    </div>
  );
}

function MineItem({ q, color, partnerName, onSaved }: { q: NousMine; color: string; partnerName: string; onSaved: (q: NousMine) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [version, setVersion] = useState(0); // a new form once erased
  const answered = q.choices != null || q.answer != null;
  const kind = KINDS[q.kind];

  const save = async (choices: number[] | null, words: string | null) => {
    setBusy(true);
    setError(null);
    try {
      await saveMine(q.id, choices, words);
      onSaved({ ...q, choices, answer: words?.trim() ?? null });
      setFlash(true);
      window.setTimeout(() => setFlash(false), 900);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Pas enregistré, réessaie.");
    } finally {
      setBusy(false);
    }
  };
  const forget = async () => {
    setBusy(true);
    try {
      await forgetMine(q.id);
      onSaved({ ...q, choices: null, answer: null });
      setVersion((v) => v + 1);
    } catch {
      setError("Pas effacé, réessaie.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.li layout exit={{ opacity: 0, scale: 0.9, height: 0, marginTop: -12, transition: { duration: 0.3 } }} className="card qz-slide flex flex-col gap-2 overflow-hidden p-4" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="flex items-start gap-2">
        <p className="font-semibold leading-snug">{q.kind === "f" ? q.text.replace("___", "…") : q.text}</p>
        <span className="ml-auto shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-text-muted" title={kind.label}>{kind.emoji} {kind.label}</span>
      </div>
      <p className="text-xs text-text-muted">{kind.answer}</p>
      <AnswerForm key={version} q={q} mode="mine" initial={{ choices: q.choices, text: q.answer }} color={color} busy={busy} onSubmit={(c, t) => void save(c, t)} />
      <div className="flex items-center gap-3 text-xs text-text-muted">
        {flash && <span className="qz-pop font-semibold" style={{ color }}>✓ Enregistré</span>}
        {answered && !flash && <span>Changer ta réponse laisse {partnerName} deviner à nouveau.</span>}
        {answered && <button type="button" onClick={() => void forget()} disabled={busy} className="ml-auto underline">Effacer</button>}
      </div>
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </motion.li>
  );
}
