import { useEffect, useMemo, useState } from "react";
import { getHistory, getScores, telepathy, type NousHistory, type NousResetState, type NousReveal, type NousScores, type NousTheme, type Verdict } from "./api";
import { FilterChip } from "./NousCategories";
import { colorOf, RevealCard, said, VerdictChip } from "./NousGuess";
import { ResetPanel } from "./NousReset";

type Show = "all" | "right" | "close" | "wrong" | "say";
const RESULTS: { id: Show; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "right", label: "💞 C'était ça" },
  { id: "close", label: "🌗 Pas loin" },
  { id: "wrong", label: "🌱 À découvrir" },
  { id: "say", label: "✍️ À dire" },
];
const fits = (show: Show, v: Verdict | null) =>
  show === "all" || (show === "say" ? v == null : show === "close" ? v === "close" || v === "some" : v === show);

/**
 * 📖 One side of what we know of each other, opened from its square on the
 * menu: « me » what I know of the other one (their answers and my guesses),
 * « them » what they know of me. Every guessed question with both answers,
 * filtered by category or by how it went, and a kind word at the top.
 */
export function ResultsView({ side, themes, partnerName, toGuess, pending, initialShow, onGuess, onChange }: {
  side: "me" | "them";
  themes: NousTheme[];
  partnerName: string;
  toGuess: number;
  pending: NousResetState | null;
  initialShow?: Show;
  onGuess: () => void;
  onChange: () => void;
}) {
  const [history, setHistory] = useState<NousHistory | null>(null);
  const [scores, setScores] = useState<NousScores | null>(null);
  const [failed, setFailed] = useState(false);
  const [theme, setTheme] = useState("all");
  const [show, setShow] = useState<Show>(initialShow ?? "all");
  const [open, setOpen] = useState<number | null>(null); // a guess in words I am saying how close it was

  const load = () => {
    Promise.all([getHistory(), getScores()]).then(([h, s]) => { setHistory(h); setScores(s); }).catch(() => setFailed(true));
  };
  useEffect(load, []);

  const list = history ? (side === "me" ? history.mine : history.theirs) : [];
  const shown = useMemo(() => list.filter((r) => (theme === "all" || r.theme === theme) && fits(show, r.verdict)), [list, theme, show]);
  const present = useMemo(() => themes.filter((t) => list.some((r) => r.theme === t.id)), [themes, list]);

  if (failed) return <p className="card p-4 text-sm">Les résultats ne se chargent pas.</p>;
  if (!history || !scores) return <div className="card h-72 animate-pulse" />;

  const score = side === "me" ? scores.me : scores.them;
  const themeScore = (id: string) => scores.themes.find((t) => t.id === id)?.[side];
  const toSay = side === "me" ? list.filter((r) => r.verdict == null).length : 0;
  const saved = (r: NousReveal) => {
    setHistory((h) => h && { ...h, mine: h.mine.map((x) => (x.guessId === r.guessId ? r : x)) });
    // The last one said: back to everything rather than an empty list.
    if (show === "say" && toSay <= 1) setShow("all");
    setOpen(null);
    onChange();
    getScores().then(setScores).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-4" data-nous-results={side}>
      <section className="nd-hero card flex flex-col items-center gap-1 p-6 text-center">
        <p className="text-sm font-semibold opacity-90">{side === "me" ? `Ce que tu sais de ${partnerName}` : `Ce que ${partnerName} sait de toi`}</p>
        <p className="font-display text-5xl font-black tabular-nums">{score.percent == null ? "—" : `${score.percent} %`}</p>
        <p className="font-semibold">{telepathy(score.percent)}</p>
        <p className="text-xs opacity-85">
          {list.length} question{list.length > 1 ? "s" : ""} devinée{list.length > 1 ? "s" : ""}
          {side === "me" && toGuess > 0 && ` · ${toGuess} à deviner encore`}
          {scores.agreement.compared > 0 && ` · 🤝 ${scores.agreement.same} réponse${scores.agreement.same > 1 ? "s" : ""} identique${scores.agreement.same > 1 ? "s" : ""}`}
        </p>
      </section>

      {side === "me" && toGuess > 0 && (
        <button type="button" onClick={onGuess} className="btn-brand press self-center rounded-token px-5 py-2 font-semibold">🔮 Deviner les {toGuess} autres</button>
      )}

      {list.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar" aria-label="Catégories">
            <FilterChip on={theme === "all"} onClick={() => setTheme("all")}>Toutes</FilterChip>
            {present.map((t) => {
              const p = themeScore(t.id)?.percent;
              return <FilterChip key={t.id} on={theme === t.id} color={t.color} onClick={() => setTheme(t.id)}>{t.emoji} {t.label}{p != null && <span className="ml-1 opacity-80">{p} %</span>}</FilterChip>;
            })}
          </div>
          <div className="flex flex-wrap gap-1.5" aria-label="Résultat">
            {RESULTS.filter((r) => r.id !== "say" || side === "me").map((r) => (
              <FilterChip key={r.id} on={show === r.id} onClick={() => setShow(r.id)}>
                {r.label}{r.id === "say" && toSay > 0 && <span className="ml-1 opacity-80">{toSay}</span>}
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      {list.length === 0 && (
        <p className="card p-6 text-center text-sm text-text-muted">
          {side === "me" ? `Pas encore de devinette : lance « 🔮 Deviner ${partnerName} » depuis le menu.` : `${partnerName} n'a encore rien deviné sur toi.`}
        </p>
      )}
      {list.length > 0 && shown.length === 0 && <p className="card p-6 text-center text-sm text-text-muted">Rien ici pour ce filtre.</p>}

      <ul className="flex flex-col gap-2">
        {shown.map((r) => open === r.guessId ? (
          <li key={r.guessId}><RevealCard r={r} color={colorOf(themes, r.theme)} partnerName={partnerName} onSaid={saved} /></li>
        ) : (
          <li key={r.guessId} className="card flex flex-col gap-2 p-3" style={{ borderLeft: `4px solid ${colorOf(themes, r.theme)}` }} data-nous-result={r.id}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold leading-snug">{r.kind === "f" ? r.text.replace("___", "…") : r.text}</p>
              {r.verdict && <VerdictChip verdict={r.verdict} small />}
            </div>
            <dl className="grid gap-1 text-sm sm:grid-cols-2">
              <div className="rounded-token-sm bg-surface-2 px-2.5 py-1.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{side === "me" ? partnerName : "Toi"}</dt>
                <dd className="whitespace-pre-line break-words font-semibold">{said(r, "answer")}</dd>
              </div>
              <div className="rounded-token-sm bg-surface-2 px-2.5 py-1.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{side === "me" ? "Ta devinette" : `Devinette de ${partnerName}`}</dt>
                <dd className="whitespace-pre-line break-words font-semibold">{said(r, "guess")}</dd>
              </div>
            </dl>
            {r.note && <p className="nd-note rounded-token px-2.5 py-1.5 text-xs">💬 {r.note}</p>}
            {r.verdict == null && (side === "me"
              ? <button type="button" onClick={() => setOpen(r.guessId)} className="chip press self-start text-sm font-semibold">✍️ Dire si c'était ça</button>
              : <p className="text-xs text-text-muted">{partnerName} n'a pas encore dit si c'était proche.</p>)}
          </li>
        ))}
      </ul>

      <ResetPanel themes={themes} partnerName={partnerName} pending={pending} onDone={() => { load(); onChange(); }} />
    </div>
  );
}
