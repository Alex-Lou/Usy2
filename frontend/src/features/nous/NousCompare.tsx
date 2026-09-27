import { useEffect, useMemo, useState } from "react";
import { getCompare, KINDS, saidText, VERDICTS, type NousCompare, type NousTheme, type Verdict } from "./api";
import { FilterChip } from "./NousCards";

type Show = "all" | "same" | "diff" | "locked" | "todo";
const SHOWS: { id: Show; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "same", label: "🤝 Pareil" },
  { id: "diff", label: "↔️ Différent" },
  { id: "locked", label: "🔒 À deviner" },
  { id: "todo", label: "✍️ À répondre" },
];

/**
 * 🔍 Our answers side by side, theme by theme. The other one's answer stays
 * locked until I have guessed it, so the game is never spoilt.
 */
export function CompareTab({ themes, partnerName, theme, onTheme, onGuess, onAnswer }: {
  themes: NousTheme[];
  partnerName: string;
  theme: string;
  onTheme: (t: string) => void;
  onGuess: () => void;
  onAnswer: () => void;
}) {
  const [items, setItems] = useState<NousCompare[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [show, setShow] = useState<Show>("all");

  useEffect(() => {
    getCompare().then(setItems).catch(() => setFailed(true));
  }, []);

  const inTheme = useMemo(() => (items ?? []).filter((c) => theme === "all" || c.theme === theme), [items, theme]);
  const shown = inTheme.filter((c) =>
    show === "all" ? true
    : show === "same" ? c.same === true
    : show === "diff" ? c.same === false
    : show === "locked" ? c.locked
    : c.mine == null);
  const count = (s: Show) => inTheme.filter((c) =>
    s === "same" ? c.same === true : s === "diff" ? c.same === false : s === "locked" ? c.locked : s === "todo" ? c.mine == null : true).length;

  if (failed) return <p className="card p-4 text-sm">La comparaison ne se charge pas.</p>;
  if (!items) return <div className="card h-72 animate-pulse" />;

  return (
    <div className="flex flex-col gap-3" data-nous-compare="">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar" role="tablist" aria-label="Catégories">
        <FilterChip on={theme === "all"} onClick={() => onTheme("all")}>Toutes</FilterChip>
        {themes.map((t) => <FilterChip key={t.id} on={theme === t.id} color={t.color} onClick={() => onTheme(t.id)}>{t.emoji} {t.label}</FilterChip>)}
      </div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Afficher">
        {SHOWS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={show === s.id}
            onClick={() => setShow(s.id)}
            className={"chip press text-xs " + (show === s.id ? "nd-tab-on font-semibold text-white" : "text-text-muted")}
          >
            {s.label} <span className="ml-1 tabular-nums opacity-80">{count(s.id)}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="card p-6 text-center text-sm text-text-muted">
          {items.length === 0 ? "Rien à comparer pour l'instant : répondez chacun·e à quelques questions 💞" : "Rien ici pour ce filtre."}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {shown.slice(0, 60).map((c, i) => {
          const t = themes.find((x) => x.id === c.theme);
          return (
            <li key={c.id} className="card qz-slide flex flex-col gap-2 p-3" style={{ borderLeft: `4px solid ${t?.color ?? "var(--nous-accent)"}`, animationDelay: `${Math.min(i, 10) * 35}ms` }} data-nous-compare-item={c.id}>
              <div className="flex items-start gap-2">
                <p className="text-sm font-semibold leading-snug">{c.kind === "f" ? c.text.replace("___", "…") : c.text}</p>
                <span className="ml-auto shrink-0 text-xs" title={KINDS[c.kind].label} aria-label={KINDS[c.kind].label}>{KINDS[c.kind].emoji}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Side who="Toi" verdict={c.theirVerdict} verdictWho={`Devinette de ${partnerName}`}>
                  {c.mine ? saidText(c.kind, c.options, c.mine.choices, c.mine.text) : (
                    <button type="button" onClick={onAnswer} className="text-xs text-primary underline">Pas encore répondu → répondre</button>
                  )}
                </Side>
                <Side who={partnerName} verdict={c.myVerdict} verdictWho="Ta devinette" muted>
                  {c.locked ? (
                    <button type="button" onClick={onGuess} className="text-xs font-semibold text-primary underline">🔒 Devine-la d'abord</button>
                  ) : c.theirs ? saidText(c.kind, c.options, c.theirs.choices, c.theirs.text) : (
                    <span className="text-xs text-text-muted">Pas encore répondu</span>
                  )}
                </Side>
              </div>
              {c.same != null && (
                <p className={"self-start rounded-full px-2 py-0.5 text-[11px] font-bold " + (c.same ? "text-white" : "bg-surface-2 text-text-muted")} style={c.same ? { background: "var(--verdict-right)" } : undefined}>
                  {c.same ? "🤝 Pareil !" : "↔️ Différent"}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {shown.length > 60 && <p className="text-center text-xs text-text-muted">Les 60 premières : choisis une catégorie pour voir les autres.</p>}
    </div>
  );
}

function Side({ who, verdict, verdictWho, muted, children }: {
  who: string;
  verdict: Verdict | null;
  verdictWho: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={"flex min-w-0 flex-col gap-1 rounded-token p-2.5 " + (muted ? "bg-surface-2" : "nd-note")}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{who}</p>
      <div className="whitespace-pre-line break-words text-sm font-semibold">{children}</div>
      {verdict && (
        <p className="text-[11px] text-text-muted" title={`${verdictWho} : ${VERDICTS[verdict].label}`}>
          {verdictWho} : {VERDICTS[verdict].emoji}
        </p>
      )}
    </div>
  );
}
