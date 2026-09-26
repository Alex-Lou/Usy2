import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../lib/api/client";
import { forgetMine, getMine, MAX_TEXT, saveMine, toggled, type NousMine, type NousTheme } from "./api";
import { FilterChip } from "./NousCards";
import { Ticks } from "./Ticks";

/**
 * ✍️ My answers about me: tick one or several choices then « Valider », or a few words. Only
 * the other one's guesses ever reveal them; changing one lets them guess again.
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
        {shown.slice(0, 30).map((q) => (
          <MineItem key={q.id} q={q} color={themes.find((t) => t.id === q.theme)?.color ?? "#ff6fa8"} partnerName={partnerName} onSaved={saved} />
        ))}
      </ul>
      {shown.length > 30 && <p className="text-center text-xs text-text-muted">Réponds à celles-ci, les suivantes arrivent ensuite.</p>}
    </div>
  );
}

function MineItem({ q, color, partnerName, onSaved }: { q: NousMine; color: string; partnerName: string; onSaved: (q: NousMine) => void }) {
  const [text, setText] = useState(q.answer ?? "");
  const [ticks, setTicks] = useState<number[]>(q.choices ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const answered = q.choices != null || q.answer != null;
  const ticksChanged = ticks.join() !== (q.choices ?? []).join();

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
      setText("");
      setTicks([]);
      onSaved({ ...q, choices: null, answer: null });
    } catch {
      setError("Pas effacé, réessaie.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="card qz-slide flex flex-col gap-2 p-4" style={{ borderLeft: `4px solid ${color}` }}>
      <p className="font-semibold leading-snug">{q.text}</p>
      {q.kind === "c" ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-muted">Plusieurs réponses possibles, puis valide.</p>
          <Ticks options={q.options} ticked={ticks} color={color} disabled={busy} label="Ta réponse" onToggle={(i) => setTicks((t) => toggled(t, i))} />
          <button
            type="button"
            disabled={busy || ticks.length === 0 || !ticksChanged}
            onClick={() => void save(ticks, null)}
            className="btn-brand press self-start rounded-token px-4 py-1.5 text-sm font-semibold disabled:opacity-40"
          >
            {answered ? "Valider les changements" : `Valider${ticks.length > 1 ? ` (${ticks.length})` : ""}`}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
            rows={2}
            maxLength={MAX_TEXT}
            placeholder="Ta réponse, avec tes mots…"
            aria-label="Ta réponse"
            className="w-full resize-y rounded-token border border-border bg-surface-2 px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || !text.trim() || text.trim() === (q.answer ?? "")}
              onClick={() => void save(null, text.trim())}
              className="btn-brand press rounded-token px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
            >
              {answered ? "Modifier" : "Enregistrer"}
            </button>
            <span className="ml-auto text-xs tabular-nums text-text-muted">{text.length}/{MAX_TEXT}</span>
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 text-xs text-text-muted">
        {flash && <span className="qz-pop font-semibold" style={{ color }}>✓ Enregistré</span>}
        {answered && !flash && <span>Changer ta réponse laisse {partnerName} deviner à nouveau.</span>}
        {answered && <button type="button" onClick={() => void forget()} disabled={busy} className="ml-auto underline">Effacer</button>}
      </div>
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </li>
  );
}
