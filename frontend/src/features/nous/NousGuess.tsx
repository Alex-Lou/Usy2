import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ApiError } from "../../lib/api/client";
import { Confetti } from "../games/Confetti";
import { Ticks } from "./Ticks";
import {
  getHistory, getToGuess, judgeGuess, MAX_NOTE, MAX_TEXT, pointsDetail, sendGuess, toggled, VERDICTS,
  type NousReveal, type NousTheme, type NousToGuess, type Verdict,
} from "./api";

type Props = { themes: NousTheme[]; partnerName: string };

const colorOf = (themes: NousTheme[], id: string) => themes.find((t) => t.id === id)?.color ?? "#ff6fa8";

/**
 * 🔮 Guessing: one of the other one's answered questions at a time, then the
 * reveal. Ticked choices get their stamp at once (the same: right, some in
 * common: close); words wait for their verdict.
 */
export function GuessTab({ themes, partnerName, onChange }: Props & { onChange: () => void }) {
  const [queue, setQueue] = useState<NousToGuess[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  const [ticks, setTicks] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<NousReveal | null>(null);

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

  const current = queue?.[0];
  const send = async (choices: number[] | null, words: string | null) => {
    if (!current || busy) return;
    setBusy(true);
    setError(null);
    try {
      setReveal(await sendGuess(current.id, choices, words));
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Devinette non envoyée, réessaie.");
    } finally {
      setBusy(false);
    }
  };
  const next = () => {
    setReveal(null);
    setText("");
    setTicks([]);
    setQueue((q) => q?.slice(1) ?? null);
  };

  if (failed) return <p className="card p-4 text-sm">Impossible de charger les devinettes.</p>;
  if (!queue) return <div className="card h-72 animate-pulse" />;

  if (reveal) {
    const color = colorOf(themes, reveal.theme);
    return (
      <section className="card relative flex flex-col gap-3 overflow-hidden p-5" style={{ ["--nd" as string]: color }} data-nous-reveal="">
        {reveal.verdict === "right" && <Confetti />}
        <p className="font-semibold leading-snug">{reveal.text}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}>
            <Bubble who="Ta devinette" body={said(reveal, "guess")} muted />
          </motion.div>
          <motion.div initial={{ opacity: 0, rotateY: 90 }} animate={{ opacity: 1, rotateY: 0 }} transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 20 }}>
            <Bubble who={`La réponse de ${partnerName}`} body={said(reveal, "answer")} color={color} />
          </motion.div>
        </div>
        <Stamp verdict={reveal.verdict} partnerName={partnerName} />
        {pointsDetail(reveal) && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-center text-sm font-semibold tabular-nums text-text-muted" data-nous-points="">
            {pointsDetail(reveal)}
          </motion.p>
        )}
        <button type="button" onClick={next} className="btn-brand press self-center rounded-token px-5 py-2 font-semibold">
          {queue.length > 1 ? "Suivante →" : "Terminé ✓"}
        </button>
      </section>
    );
  }

  if (!current) {
    return (
      <p className="card p-6 text-center text-sm text-text-muted" data-nous-empty="">
        Rien à deviner pour l'instant 🕵️ Quand {partnerName} aura répondu à de nouvelles questions, elles arriveront ici.
      </p>
    );
  }

  const color = colorOf(themes, current.theme);
  return (
    <section key={current.id} className="nd-card card flex flex-col gap-4 p-5" style={{ ["--nd" as string]: color }} data-nous-guess={current.id}>
      <div className="flex items-center justify-between text-xs font-semibold text-text-muted">
        <span>🔮 Qu'a répondu {partnerName} ?</span>
        <span className="tabular-nums">encore {queue.length}</span>
      </div>
      <h2 className="font-display text-xl font-bold leading-snug">{current.text}</h2>
      {current.kind === "c" ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-muted">Coche tout ce que {partnerName} a coché. Points = cases en commun ÷ cases cochées en tout (oublis et cases en trop comptent pareil).</p>
          <Ticks options={current.options} ticked={ticks} color={color} disabled={busy} label="Ta devinette" onToggle={(i) => setTicks((t) => toggled(t, i))} />
          <button type="button" disabled={busy || ticks.length === 0} onClick={() => void send(ticks, null)}
            className="btn-brand press self-end rounded-token px-4 py-2 font-semibold disabled:opacity-40">
            Deviner 🔮
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))} rows={2} maxLength={MAX_TEXT}
            placeholder={`Selon toi, ${partnerName} a répondu…`} aria-label="Ta devinette"
            className="w-full resize-y rounded-token border border-border bg-surface-2 px-3 py-2 text-sm" />
          <button type="button" disabled={busy || !text.trim()} onClick={() => void send(null, text.trim())}
            className="btn-brand press self-end rounded-token px-4 py-2 font-semibold disabled:opacity-40">
            Deviner 🔮
          </button>
        </div>
      )}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </section>
  );
}

/** ⚖️ The other one's guesses (in words) about me, waiting for my verdict. */
export function JudgeTab({ themes, partnerName, onChange }: Props & { onChange: () => void }) {
  const [items, setItems] = useState<NousReveal[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getHistory().then((h) => setItems(h.theirs.filter((r) => r.verdict == null))).catch(() => setFailed(true));
  }, []);

  if (failed) return <p className="card p-4 text-sm">Impossible de charger les devinettes à juger.</p>;
  if (!items) return <div className="card h-64 animate-pulse" />;
  if (items.length === 0) return <p className="card p-6 text-center text-sm text-text-muted">Rien à juger ⚖️ Tu es à jour.</p>;
  return (
    <ul className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {items.map((r) => (
          <JudgeItem key={r.guessId} r={r} color={colorOf(themes, r.theme)} partnerName={partnerName}
            onDone={() => {
              setItems((list) => list?.filter((x) => x.guessId !== r.guessId) ?? null);
              onChange();
            }} />
        ))}
      </AnimatePresence>
    </ul>
  );
}

function JudgeItem({ r, color, partnerName, onDone }: { r: NousReveal; color: string; partnerName: string; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Verdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const judge = async (v: Verdict) => {
    setBusy(true);
    setError(null);
    try {
      await judgeGuess(r.guessId, v, note.trim() || null);
      setDone(v);
      window.setTimeout(onDone, 1100);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Verdict non envoyé, réessaie.");
      setBusy(false);
    }
  };
  return (
    <motion.li layout exit={{ opacity: 0, x: 90, transition: { duration: 0.25 } }} className="card qz-slide relative flex flex-col gap-3 p-4" style={{ borderLeft: `4px solid ${color}` }} data-nous-judge={r.guessId}>
      <p className="font-semibold leading-snug">{r.text}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Bubble who="Ta réponse" body={r.answerText ?? "—"} color={color} />
        <Bubble who={`Devinette de ${partnerName}`} body={r.guessText ?? "—"} muted />
      </div>
      {done ? (
        <Stamp verdict={done} partnerName={partnerName} />
      ) : (
        <>
          <input value={note} onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE))} maxLength={MAX_NOTE}
            placeholder="Un petit mot avec ton verdict (facultatif)" aria-label="Petit mot"
            className="w-full rounded-token border border-border bg-surface-2 px-3 py-2 text-sm" />
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Verdict">
            {(["right", "close", "wrong"] as Verdict[]).map((v) => (
              <button key={v} type="button" disabled={busy} onClick={() => void judge(v)}
                className="press rounded-token px-2 py-2 text-sm font-bold text-white shadow"
                style={{ background: VERDICTS[v].color }}>
                {VERDICTS[v].emoji} {VERDICTS[v].label}
              </button>
            ))}
          </div>
        </>
      )}
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </motion.li>
  );
}

/** 📜 Every guess, both ways, with its stamp and the little notes. */
export function HistoryTab({ themes, partnerName }: Props) {
  const [side, setSide] = useState<"mine" | "theirs">("mine");
  const [data, setData] = useState<{ mine: NousReveal[]; theirs: NousReveal[] } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    getHistory().then(setData).catch(() => setFailed(true));
  }, []);
  if (failed) return <p className="card p-4 text-sm">Impossible de charger les verdicts.</p>;
  if (!data) return <div className="card h-64 animate-pulse" />;
  const list = data[side];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2" role="tablist" aria-label="Sens">
        <button type="button" role="tab" aria-selected={side === "mine"} onClick={() => setSide("mine")}
          className={"chip press text-sm " + (side === "mine" ? "nd-tab-on font-semibold text-white" : "text-text-muted")}>Mes devinettes</button>
        <button type="button" role="tab" aria-selected={side === "theirs"} onClick={() => setSide("theirs")}
          className={"chip press text-sm " + (side === "theirs" ? "nd-tab-on font-semibold text-white" : "text-text-muted")}>Celles de {partnerName}</button>
      </div>
      {list.length === 0 && <p className="card p-6 text-center text-sm text-text-muted">Pas encore de devinette ici.</p>}
      <ul className="flex flex-col gap-2">
        {list.map((r, i) => (
          <li key={r.guessId} className="card qz-slide flex flex-col gap-2 p-3" style={{ animationDelay: `${Math.min(i, 10) * 40}ms`, borderLeft: `4px solid ${colorOf(themes, r.theme)}` }}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold leading-snug">{r.text}</p>
              <span className="shrink-0 text-lg" title={r.verdict ? VERDICTS[r.verdict].label : "En attente"} aria-label={r.verdict ? VERDICTS[r.verdict].label : "En attente"}>
                {r.verdict ? VERDICTS[r.verdict].emoji : "⏳"}
              </span>
            </div>
            <p className="text-xs text-text-muted">
              {side === "mine" ? "Ta devinette" : `Devinette de ${partnerName}`} : <b className="text-text">{said(r, "guess")}</b>
              {" · "}{side === "mine" ? `Réponse de ${partnerName}` : "Ta réponse"} : <b className="text-text">{said(r, "answer")}</b>
            </p>
            {pointsDetail(r) && <p className="text-xs font-semibold tabular-nums">{pointsDetail(r)}</p>}
            {r.note && <p className="nd-note rounded-token px-2.5 py-1.5 text-xs">💬 {r.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function said(r: NousReveal, which: "guess" | "answer"): string {
  const choices = which === "guess" ? r.guessChoices : r.answerChoices;
  const text = which === "guess" ? r.guessText : r.answerText;
  if (choices != null) return choices.map((i) => r.options[i]).filter(Boolean).join(" · ") || "—";
  return text ?? "—";
}

function Bubble({ who, body, color, muted }: { who: string; body: string; color?: string; muted?: boolean }) {
  return (
    <div className={"rounded-token p-3 " + (muted ? "bg-surface-2" : "text-white")} style={muted ? undefined : { background: color }}>
      <p className={"text-[11px] font-semibold uppercase tracking-wide " + (muted ? "text-text-muted" : "opacity-90")}>{who}</p>
      <p className="mt-0.5 whitespace-pre-wrap break-words font-semibold">{body}</p>
    </div>
  );
}

/** The verdict, stamped on with a thump (or the wait for the other one's). */
function Stamp({ verdict, partnerName }: { verdict: Verdict | null; partnerName: string }) {
  if (!verdict) return <p className="qz-pop self-center text-sm font-semibold text-text-muted">⏳ {partnerName} va juger ta réponse…</p>;
  const v = VERDICTS[verdict];
  return (
    <motion.p
      initial={{ opacity: 0, scale: 2.6, rotate: -18 }}
      animate={{ opacity: 1, scale: 1, rotate: -6 }}
      transition={{ delay: 0.35, type: "spring", stiffness: 520, damping: 16 }}
      className="self-center rounded-token border-4 px-4 py-1 font-display text-2xl font-black uppercase tracking-wider"
      style={{ color: v.color, borderColor: v.color }}
      role="status"
    >
      {v.emoji} {v.label}
    </motion.p>
  );
}
