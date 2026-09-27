import { motion } from "motion/react";
import { useState } from "react";
import { fold, MAX_SHORT, MAX_TEXT, SCALE_MAX, toggled, type Kind } from "./api";
import { Ticks } from "./Ticks";

/** A question as the forms need it. */
export interface Asked {
  id: string;
  kind: Kind;
  text: string;
  options: string[];
}

type Submit = (choices: number[] | null, text: string | null) => void;

/**
 * ✍️ How a question is answered, whatever its kind: about me ({@code mode}
 * "mine", with my answer so far) or guessing the other one ("guess"). A
 * single choice is sent with the tap itself; the others with their button.
 * (A hangman is guessed on its own board, see HangmanBoard.)
 */
export function AnswerForm({ q, mode, initial, color, busy, onSubmit }: {
  q: Asked;
  mode: "mine" | "guess";
  initial?: { choices: number[] | null; text: string | null };
  color: string;
  busy: boolean;
  onSubmit: Submit;
}) {
  const answered = initial != null && (initial.choices != null || initial.text != null);
  const label = mode === "guess" ? "Deviner 🔮" : answered ? "Modifier" : "Enregistrer";
  const aria = mode === "guess" ? "Ta devinette" : "Ta réponse";
  switch (q.kind) {
    case "c":
      return <ManyChoices q={q} initial={initial?.choices ?? []} color={color} busy={busy} label={mode === "guess" ? label : answered ? "Valider les changements" : "Valider"} aria={aria} onSubmit={onSubmit} />;
    case "u":
      return <OneChoice q={q} current={mode === "mine" ? initial?.choices?.[0] ?? null : null} color={color} busy={busy} aria={aria} onSubmit={onSubmit} />;
    case "e":
      return <Scale q={q} initial={initial?.choices?.[0] ?? null} color={color} busy={busy} label={label} aria={aria} onSubmit={onSubmit} />;
    case "o":
      return <Ranking q={q} initial={initial?.choices ?? null} color={color} busy={busy} label={label} aria={aria} onSubmit={onSubmit} />;
    case "f":
      return <FillBlank q={q} initial={initial?.text ?? ""} busy={busy} label={label} aria={aria} onSubmit={onSubmit} />;
    case "h":
    case "m":
      return <ShortWords kind={q.kind} initial={initial?.text ?? ""} busy={busy} label={label} aria={aria} onSubmit={onSubmit} />;
    default:
      return <Words initial={initial?.text ?? ""} busy={busy} label={label} aria={aria} guess={mode === "guess"} onSubmit={onSubmit} />;
  }
}

function SendButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="btn-brand press self-end rounded-token px-4 py-2 font-semibold disabled:opacity-40">
      {children}
    </button>
  );
}

function ManyChoices({ q, initial, color, busy, label, aria, onSubmit }: {
  q: Asked; initial: number[]; color: string; busy: boolean; label: string; aria: string; onSubmit: Submit;
}) {
  const [ticks, setTicks] = useState<number[]>(initial);
  const changed = ticks.join() !== initial.join();
  return (
    <div className="flex flex-col gap-2">
      <Ticks options={q.options} ticked={ticks} color={color} disabled={busy} label={aria} onToggle={(i) => setTicks((t) => toggled(t, i))} />
      <SendButton disabled={busy || ticks.length === 0 || !changed} onClick={() => onSubmit(ticks, null)}>
        {label}{ticks.length > 1 ? ` (${ticks.length})` : ""}
      </SendButton>
    </div>
  );
}

/** This or that: big buttons, the tap is the answer. */
function OneChoice({ q, current, color, busy, aria, onSubmit }: {
  q: Asked; current: number | null; color: string; busy: boolean; aria: string; onSubmit: Submit;
}) {
  return (
    <div className={"grid gap-2 " + (q.options.length === 3 ? "grid-cols-3" : "grid-cols-2")} role="radiogroup" aria-label={aria}>
      {q.options.map((o, i) => {
        const on = current === i;
        return (
          <motion.button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={busy || on}
            whileTap={{ scale: 0.94 }}
            onClick={() => onSubmit([i], null)}
            className={"press min-h-16 rounded-token border-2 px-3 py-3 text-center font-display text-base font-bold transition " + (on ? "text-white" : "border-border hover:-translate-y-0.5")}
            style={on ? { background: color, borderColor: color } : undefined}
          >
            {o}
          </motion.button>
        );
      })}
    </div>
  );
}

/** A slider from 0 to 10, with the words at both ends. */
function Scale({ q, initial, color, busy, label, aria, onSubmit }: {
  q: Asked; initial: number | null; color: string; busy: boolean; label: string; aria: string; onSubmit: Submit;
}) {
  const [value, setValue] = useState<number>(initial ?? Math.round(SCALE_MAX / 2));
  return (
    <div className="flex flex-col gap-2">
      <motion.p key={value} initial={{ scale: 0.7, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className="text-center font-display text-4xl font-black tabular-nums" style={{ color }} aria-hidden="true">
        {value}
      </motion.p>
      <input
        type="range"
        min={0}
        max={SCALE_MAX}
        step={1}
        value={value}
        disabled={busy}
        onChange={(e) => setValue(Number(e.target.value))}
        aria-label={aria}
        aria-valuetext={`${value} sur ${SCALE_MAX}`}
        className="w-full"
        style={{ accentColor: color }}
      />
      <div className="flex justify-between gap-3 text-xs font-semibold text-text-muted">
        <span>0 · {q.options[0]}</span>
        <span className="text-right">{q.options[1]} · {SCALE_MAX}</span>
      </div>
      <SendButton disabled={busy || value === initial} onClick={() => onSubmit([value], null)}>
        {label}
      </SendButton>
    </div>
  );
}

/** Tap the options in order, first to last; a tap on a ranked one takes it (and the ones after) back. */
function Ranking({ q, initial, color, busy, label, aria, onSubmit }: {
  q: Asked; initial: number[] | null; color: string; busy: boolean; label: string; aria: string; onSubmit: Submit;
}) {
  const [order, setOrder] = useState<number[]>(initial ?? []);
  const full = order.length === q.options.length;
  const tap = (i: number) => setOrder((o) => (o.includes(i) ? o.slice(0, o.indexOf(i)) : [...o, i]));
  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-2" aria-label={aria}>
        {q.options.map((o, i) => {
          const rank = order.indexOf(i);
          const on = rank >= 0;
          return (
            <li key={o}>
              <motion.button
                layout
                type="button"
                disabled={busy}
                onClick={() => tap(i)}
                aria-label={on ? `${o} : ${rank + 1}e, toucher pour retirer` : `${o} : toucher pour le mettre ${order.length + 1}e`}
                className={"press flex w-full items-center gap-3 rounded-token border-2 px-3 py-2 text-left text-sm font-semibold " + (on ? "text-white" : "border-border")}
                style={on ? { background: color, borderColor: color } : undefined}
              >
                <span className={"grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-black " + (on ? "bg-white/25" : "border-2 border-dashed border-current opacity-50")}>
                  {on ? rank + 1 : ""}
                </span>
                {o}
              </motion.button>
            </li>
          );
        })}
      </ol>
      <div className="flex items-center gap-2">
        {order.length > 0 && <button type="button" onClick={() => setOrder([])} disabled={busy} className="text-xs text-text-muted underline">Recommencer</button>}
        <span className="ml-auto text-xs text-text-muted">{full ? "C'est rangé !" : `Touche la n° ${order.length + 1}`}</span>
        <SendButton disabled={busy || !full || (initial != null && order.join() === initial.join())} onClick={() => onSubmit(order, null)}>{label}</SendButton>
      </div>
    </div>
  );
}

/** The sentence, with a box where its blank is. */
function FillBlank({ q, initial, busy, label, aria, onSubmit }: {
  q: Asked; initial: string; busy: boolean; label: string; aria: string; onSubmit: Submit;
}) {
  const [text, setText] = useState(initial);
  const [before, ...rest] = q.text.split("___");
  const after = rest.join("___");
  return (
    <div className="flex flex-col gap-2">
      <p className="rounded-token bg-surface-2 p-3 text-base leading-relaxed">
        {before}
        <input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
          maxLength={MAX_TEXT}
          aria-label={aria}
          placeholder="…"
          className="mx-1 inline-block w-48 max-w-full rounded-md border-b-2 border-primary bg-surface px-2 py-0.5 font-semibold outline-none"
        />
        {after}
      </p>
      <SendButton disabled={busy || !text.trim() || text.trim() === initial} onClick={() => onSubmit(null, text.trim())}>{label}</SendButton>
    </div>
  );
}

/** A word (or two) for a hangman, as the server takes it (Hangman.playable). */
export function playable(word: string): boolean {
  const f = fold(word);
  const letters = f.replace(/[^A-Z]/g, "").length;
  return word.trim().length <= 24 && /^[A-Z][A-Z '-]*[A-Z]$/.test(f) && letters >= 2 && letters <= 20;
}

/** A short answer, or a hangman word (checked as it is typed). */
function ShortWords({ kind, initial, busy, label, aria, onSubmit }: {
  kind: "h" | "m"; initial: string; busy: boolean; label: string; aria: string; onSubmit: Submit;
}) {
  const [text, setText] = useState(initial);
  const max = kind === "h" ? 24 : MAX_SHORT;
  const ok = kind === "h" ? playable(text) : text.trim().length > 0;
  return (
    <div className="flex flex-col gap-1.5">
      <input
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, max))}
        maxLength={max}
        aria-label={aria}
        placeholder={kind === "h" ? "Un mot…" : "En quelques mots…"}
        className="w-full rounded-token border border-border bg-surface-2 px-3 py-2 text-base font-semibold"
      />
      <div className="flex items-center gap-2">
        {kind === "h" && text.trim() && !ok && <span className="text-xs text-danger">2 à 20 lettres, sans chiffres ni symboles</span>}
        <span className="ml-auto text-xs tabular-nums text-text-muted">{text.length}/{max}</span>
        <SendButton disabled={busy || !ok || text.trim() === initial} onClick={() => onSubmit(null, text.trim())}>{label}</SendButton>
      </div>
    </div>
  );
}

function Words({ initial, busy, label, aria, guess, onSubmit }: {
  initial: string; busy: boolean; label: string; aria: string; guess: boolean; onSubmit: Submit;
}) {
  const [text, setText] = useState(initial);
  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
        rows={2}
        maxLength={MAX_TEXT}
        placeholder={guess ? "Selon toi, la réponse est…" : "Ta réponse, avec tes mots…"}
        aria-label={aria}
        className="w-full resize-y rounded-token border border-border bg-surface-2 px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-2">
        <span className="text-xs tabular-nums text-text-muted">{text.length}/{MAX_TEXT}</span>
        <SendButton disabled={busy || !text.trim() || text.trim() === initial} onClick={() => onSubmit(null, text.trim())}>{label}</SendButton>
      </div>
    </div>
  );
}
