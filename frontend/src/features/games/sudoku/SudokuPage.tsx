import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../../components/ui/Icon";
import { Confetti } from "../Confetti";
import { ShareScore } from "../ShareScore";
import { boxOf, colOf, generate, LEVELS, PEERS, rowOf, type Level } from "./engine";

const GAME_KEY = "memocat.sudoku.game";
const BEST_KEY = "memocat.sudoku.best";

interface Game {
  level: Level;
  puzzle: number[];
  solution: number[];
  values: number[];
  notes: number[]; // bit d set = pencil mark d
  mistakes: number;
  hints: number;
  seconds: number;
  done: boolean;
}
type Snapshot = { values: number[]; notes: number[] };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* not remembered, still playable */
  }
}

function newGame(level: Level): Game {
  const { puzzle, solution } = generate(level);
  return { level, puzzle, solution, values: [...puzzle], notes: new Array(81).fill(0), mistakes: 0, hints: 0, seconds: 0, done: false };
}

function isGame(g: Game | null): g is Game {
  return !!g && Array.isArray(g.values) && g.values.length === 81 && Array.isArray(g.solution) && g.solution.length === 81;
}

// Theme colours are CSS variables: tints are mixed in (Tailwind's /opacity can't apply to them).
const mix = (color: string, pct: number) => `color-mix(in srgb, var(${color}) ${pct}%, transparent)`;
const LINE = mix("--color-border", 100);
const BOX_LINE = mix("--color-primary", 55);

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * 🔢 Sudoku, solo: four levels, a fresh grid with a single solution each time,
 * pencil marks, wrong numbers in red, undo, hints, a timer and the best time
 * per level. The game in progress is kept on the device.
 */
export function SudokuPage() {
  const [game, setGame] = useState<Game>(() => {
    const saved = read<Game>(GAME_KEY);
    return isGame(saved) ? saved : newGame("facile");
  });
  const [best, setBest] = useState<Partial<Record<Level, number>>>(() => read(BEST_KEY) ?? {});
  const [selected, setSelected] = useState<number | null>(null);
  const [pencil, setPencil] = useState(false);
  const [history, setHistory] = useState<Snapshot[]>([]);

  useEffect(() => write(GAME_KEY, game), [game]);

  // The clock runs while playing, on screen.
  useEffect(() => {
    if (game.done) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") setGame((g) => (g.done ? g : { ...g, seconds: g.seconds + 1 }));
    }, 1000);
    return () => window.clearInterval(t);
  }, [game.done]);

  const start = useCallback(
    (level: Level) => {
      const moved = game.values.some((v, i) => v !== game.puzzle[i]);
      if (!game.done && moved && !window.confirm("Abandonner la partie en cours ?")) return;
      setGame(newGame(level));
      setHistory([]);
      setSelected(null);
    },
    [game],
  );

  /** Applies a change to the grid (kept for undo), and checks for the win. */
  const change = useCallback(
    (next: (g: Game) => Partial<Game>) => {
      if (game.done) return;
      const n = { ...game, ...next(game) };
      setHistory((h) => [...h.slice(-199), { values: game.values, notes: game.notes }]);
      if (n.values.every((v, i) => v === n.solution[i])) {
        n.done = true;
        const prev = best[n.level];
        if (prev === undefined || n.seconds < prev) {
          const out = { ...best, [n.level]: n.seconds };
          write(BEST_KEY, out);
          setBest(out);
        }
      }
      setGame(n);
    },
    [game, best],
  );

  const put = useCallback(
    (d: number) => {
      if (selected === null || game.puzzle[selected] !== 0 || game.values[selected] === game.solution[selected]) return;
      const i = selected;
      if (pencil) {
        if (game.values[i] !== 0) return;
        change((g) => ({ notes: g.notes.map((m, k) => (k === i ? m ^ (1 << d) : m)) }));
        return;
      }
      change((g) => {
        const values = g.values.map((v, k) => (k === i ? d : v));
        // A right number clears that pencil mark around it.
        const notes = g.notes.map((m, k) => (k === i ? 0 : d === g.solution[i] && PEERS[i].includes(k) ? m & ~(1 << d) : m));
        return { values, notes, mistakes: g.mistakes + (d !== g.solution[i] ? 1 : 0) };
      });
    },
    [selected, pencil, game, change],
  );

  const erase = useCallback(() => {
    if (selected === null || game.puzzle[selected] !== 0) return;
    const i = selected;
    if (game.values[i] === 0 && game.notes[i] === 0) return;
    change((g) => ({ values: g.values.map((v, k) => (k === i ? 0 : v)), notes: g.notes.map((m, k) => (k === i ? 0 : m)) }));
  }, [selected, game, change]);

  function undo() {
    const last = history[history.length - 1];
    if (!last || game.done) return;
    setHistory((h) => h.slice(0, -1));
    setGame((g) => ({ ...g, ...last }));
  }

  function hint() {
    if (game.done) return;
    const wrongOrEmpty = (k: number) => game.values[k] !== game.solution[k];
    const i = selected !== null && wrongOrEmpty(selected) ? selected : game.values.findIndex((_, k) => wrongOrEmpty(k));
    if (i < 0) return;
    setSelected(i);
    change((g) => ({
      values: g.values.map((v, k) => (k === i ? g.solution[i] : v)),
      notes: g.notes.map((m, k) => (k === i ? 0 : PEERS[i].includes(k) ? m & ~(1 << g.solution[i]) : m)),
      hints: g.hints + 1,
    }));
  }

  // Keyboard: arrows move, 1-9 write, Backspace erases, N toggles pencil marks.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^[1-9]$/.test(e.key)) put(Number(e.key));
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") erase();
      else if (e.key === "n" || e.key === "N") setPencil((p) => !p);
      else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        setSelected((s) => {
          const i = s ?? 40;
          const r = rowOf(i), c = colOf(i);
          if (e.key === "ArrowUp") return ((r + 8) % 9) * 9 + c;
          if (e.key === "ArrowDown") return ((r + 1) % 9) * 9 + c;
          if (e.key === "ArrowLeft") return r * 9 + ((c + 8) % 9);
          return r * 9 + ((c + 1) % 9);
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [put, erase]);

  const left = useMemo(() => {
    const n = new Array(10).fill(9);
    game.values.forEach((v, i) => v !== 0 && v === game.solution[i] && n[v]--);
    return n;
  }, [game]);

  const sel = selected;
  const selValue = sel !== null ? game.values[sel] : 0;
  const levelLabel = LEVELS.find((l) => l.id === game.level)!.label;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3">
      <header className="flex items-center gap-2 animate-fade-up">
        <Link to="/jeux" aria-label="Retour aux jeux" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface press hover:border-primary/50">
          <Icon name="chevronLeft" size={18} />
        </Link>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold leading-tight">Sudoku</h1>
          <p className="text-xs text-text-muted">
            {levelLabel}
            {best[game.level] !== undefined && ` · record ${clock(best[game.level]!)}`}
          </p>
        </div>
        <span className="ml-auto rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold tabular-nums" aria-label="Temps">
          ⏱ {clock(game.seconds)}
        </span>
        <span className={"rounded-full border px-3 py-1.5 text-sm font-semibold " + (game.mistakes ? "border-danger text-danger" : "border-border text-text-muted")} aria-label="Erreurs">
          ✗ {game.mistakes}
        </span>
      </header>

      <div className="flex gap-1.5" role="group" aria-label="Niveau">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => start(l.id)}
            aria-pressed={game.level === l.id}
            className={"chip press flex-1 justify-center text-sm " + (game.level === l.id ? "border-primary bg-surface-2 font-semibold text-primary" : "text-text-muted hover:border-primary/50")}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <div role="grid" aria-label="Grille de sudoku" className="grid aspect-square grid-cols-9 overflow-hidden rounded-token border-2 bg-surface shadow-card" style={{ borderColor: BOX_LINE }} data-sudoku="">
          {game.values.map((v, i) => {
            const r = rowOf(i), c = colOf(i);
            const given = game.puzzle[i] !== 0;
            const wrong = v !== 0 && v !== game.solution[i];
            const isSel = sel === i;
            const peer = sel !== null && (rowOf(sel) === r || colOf(sel) === c || boxOf(sel) === boxOf(i));
            const same = selValue !== 0 && v === selValue;
            const bg = isSel
              ? mix("--color-primary", 38)
              : wrong
                ? mix("--color-danger", 18)
                : same
                  ? mix("--color-primary", 24)
                  : peer
                    ? mix("--color-primary", 11)
                    : (Math.floor(r / 3) + Math.floor(c / 3)) % 2
                      ? mix("--color-surface-2", 70)
                      : undefined;
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                aria-label={`Ligne ${r + 1}, colonne ${c + 1}${v ? `, ${v}` : ", vide"}`}
                aria-selected={isSel}
                data-cell={i}
                onClick={() => setSelected(i)}
                style={{
                  background: bg,
                  borderRight: c < 8 ? (c % 3 === 2 ? `2px solid ${BOX_LINE}` : `1px solid ${LINE}`) : undefined,
                  borderBottom: r < 8 ? (r % 3 === 2 ? `2px solid ${BOX_LINE}` : `1px solid ${LINE}`) : undefined,
                }}
                className={
                  "relative grid place-items-center text-[clamp(1rem,5.2vw,1.6rem)] leading-none transition-colors " +
                  (given ? "font-bold text-text" : wrong ? "font-semibold text-danger" : "font-semibold text-primary")
                }
              >
                {v !== 0 ? (
                  <span className={same && !isSel ? "animate-pop" : undefined}>{v}</span>
                ) : game.notes[i] ? (
                  <span className="grid h-full w-full grid-cols-3 p-[2px] text-[clamp(0.45rem,2vw,0.65rem)] font-medium leading-none text-text-muted">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                      <span key={d} className="grid place-items-center">{game.notes[i] & (1 << d) ? d : ""}</span>
                    ))}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {game.done && (
          <div className="absolute inset-0 grid place-items-center rounded-token backdrop-blur-sm animate-fade-up" style={{ background: mix("--color-bg", 70) }} data-sudoku-won="">
            <Confetti />
            <div className="card flex flex-col items-center gap-2 p-5 text-center">
              <span className="text-4xl" aria-hidden="true">🎉</span>
              <p className="font-display text-xl font-bold">Bravo !</p>
              <p className="text-sm text-text-muted">
                {levelLabel} en {clock(game.seconds)}
                {best[game.level] === game.seconds && " · nouveau record 🏆"}
              </p>
              <p className="text-xs text-text-muted">
                {game.mistakes} erreur{game.mistakes > 1 ? "s" : ""} · {game.hints} indice{game.hints > 1 ? "s" : ""}
              </p>
              <button type="button" onClick={() => start(game.level)} className="mt-1 rounded-full btn-brand px-5 py-2 text-sm font-semibold press">
                Nouvelle grille
              </button>
              <ShareScore
                text={`🔢 Sudoku ${levelLabel} terminé en ${clock(game.seconds)}${best[game.level] === game.seconds ? " · nouveau record 🏆" : ""} (${game.mistakes} erreur${game.mistakes > 1 ? "s" : ""}, ${game.hints} indice${game.hints > 1 ? "s" : ""})`}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <Tool icon="↶" label="Annuler" onClick={undo} disabled={history.length === 0 || game.done} />
        <Tool icon="✏️" label={pencil ? "Notes : oui" : "Notes"} onClick={() => setPencil((p) => !p)} pressed={pencil} />
        <Tool icon="⌫" label="Effacer" onClick={erase} disabled={game.done} />
        <Tool icon="💡" label={game.hints ? `Indice (${game.hints})` : "Indice"} onClick={hint} disabled={game.done} />
      </div>

      <div className="grid grid-cols-9 gap-1" role="group" aria-label="Chiffres">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => put(d)}
            disabled={left[d] === 0 || game.done}
            aria-label={`${d} (encore ${left[d]})`}
            className="flex flex-col items-center rounded-token border border-border bg-surface py-2 press hover:border-primary/60 disabled:opacity-25"
          >
            <span className={"text-xl font-bold " + (pencil ? "text-text-muted" : "text-primary")}>{d}</span>
            <span className="text-[10px] text-text-muted">{left[d]}</span>
          </button>
        ))}
      </div>
      <p className="text-center text-[11px] text-text-muted">Touche une case puis un chiffre. ✏️ pour noter des possibilités.</p>
    </div>
  );
}

function Tool({ icon, label, onClick, disabled, pressed }: { icon: string; label: string; onClick: () => void; disabled?: boolean; pressed?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={
        "flex flex-col items-center gap-0.5 rounded-token border px-1 py-2 text-[11px] font-semibold press disabled:opacity-40 " +
        (pressed ? "border-primary bg-surface-2 text-primary" : "border-border bg-surface text-text-muted hover:border-primary/50")
      }
    >
      <span className="text-lg" aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}
