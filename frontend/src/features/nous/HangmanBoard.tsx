import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "../../lib/api/client";
import { playLetter, type NousReveal, type NousToGuess } from "./api";

const ROWS = ["AZERTYUIOP", "QSDFGHJKLM", "WXCVBN"];
const MAX_ERRORS = 7;

/**
 * 🪢 The other one's word, letter by letter: the server keeps the word and
 * only sends it back as found so far. Seven wrong letters draw the hangman.
 * Letters can be typed on a keyboard too.
 */
export function HangmanBoard({ q, color, onReveal }: { q: NousToGuess; color: string; onReveal: (r: NousReveal) => void }) {
  const [pattern, setPattern] = useState(q.pattern ?? "");
  const [tried, setTried] = useState(q.tried ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrong = [...tried].filter((c) => !pattern.includes(c));
  const busyRef = useRef(false);

  const play = async (letter: string) => {
    if (busyRef.current || tried.includes(letter)) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const s = await playLetter(q.id, letter);
      setPattern(s.pattern);
      setTried(s.tried);
      if (s.reveal) window.setTimeout(() => onReveal(s.reveal!), 700);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Lettre non envoyée, réessaie.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement)?.closest("input, textarea")) return;
      const k = e.key.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
      if (/^[A-Z]$/.test(k)) void play(k);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex flex-col items-center gap-3" data-nous-hangman="">
      <Gallows errors={wrong.length} color={color} />
      <p className="text-xs font-semibold tabular-nums text-text-muted" aria-live="polite">
        {wrong.length}/{MAX_ERRORS} erreur{wrong.length > 1 ? "s" : ""}
        {wrong.length > 0 && <span className="ml-2 tracking-widest line-through opacity-70">{wrong.join(" ")}</span>}
      </p>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-2" aria-label={`Le mot : ${pattern.replace(/_/g, " blanc ").trim()}`} role="img">
        {pattern.split(" ").map((word, w) => (
          <span key={w} className="flex gap-1">
            {[...word].map((c, i) => (
              c === "-" || c === "'" ? (
                <span key={i} className="grid w-3 place-items-end font-display text-2xl font-black">{c}</span>
              ) : (
                <motion.span
                  key={`${i}-${c}`}
                  initial={c === "_" ? false : { rotateX: 90, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  className="grid h-10 w-8 place-items-center border-b-4 font-display text-2xl font-black"
                  style={{ borderColor: color }}
                >
                  {c === "_" ? "" : c}
                </motion.span>
              )
            ))}
          </span>
        ))}
      </div>
      <div className="flex w-full flex-col items-center gap-1.5" role="group" aria-label="Lettres">
        {ROWS.map((row) => (
          <div key={row} className="flex w-full justify-center gap-1">
            {[...row].map((l) => {
              const used = tried.includes(l);
              const hit = used && pattern.includes(l);
              return (
                <button
                  key={l}
                  type="button"
                  disabled={busy || used}
                  onClick={() => void play(l)}
                  aria-label={`Lettre ${l}${used ? (hit ? ", trouvée" : ", absente") : ""}`}
                  className={"press grid h-10 min-w-0 max-w-10 flex-1 place-items-center rounded-lg border text-sm font-bold transition "
                    + (hit ? "text-white" : used ? "border-border opacity-30" : "border-border bg-surface-2 hover:-translate-y-0.5")}
                  style={hit ? { background: color, borderColor: color } : undefined}
                >
                  {l}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}

/** The drawing, one piece per wrong letter (7 in all). */
function Gallows({ errors, color }: { errors: number; color: string }) {
  const parts = [
    "M20 112 H92",          // ground
    "M40 112 V14",          // post
    "M40 14 H86",           // beam
    "M86 14 V28",           // rope
    null,                   // head (a circle)
    "M86 50 V78",           // body
    "M86 58 L74 68 M86 58 L98 68 M86 78 L76 96 M86 78 L96 96", // arms and legs
  ];
  return (
    <svg viewBox="0 0 112 120" className="h-28 w-28" aria-hidden="true">
      {parts.map((d, i) => {
        if (i >= errors) return null;
        return d == null ? (
          <motion.circle key={i} cx="86" cy="39" r="11" fill="none" stroke={color} strokeWidth="4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }} />
        ) : (
          <motion.path key={i} d={d} fill="none" stroke={i >= 4 ? color : "currentColor"} strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }} />
        );
      })}
      {errors === 0 && <text x="56" y="70" textAnchor="middle" fontSize="30">🪢</text>}
    </svg>
  );
}
