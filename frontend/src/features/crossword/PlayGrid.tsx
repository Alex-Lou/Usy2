import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";
import { feel } from "../../lib/feel";
import { useOnRefresh } from "../../lib/refresh";
import { useAuth } from "../auth/useAuth";
import { Confetti } from "../games/Confetti";
import { ShareScore } from "../games/ShareScore";
import { createGame, getDaily, getGame, levelLabel, onCrossword, play, restartGame, starsFor, themeOf, type Change, type Clue, type Dir, type Game, type Level, type Size, type Theme } from "./api";
import { Grid } from "./Grid";
import { Keyboard } from "./Keyboard";
import { BLOCK, cellsOf, cluesByCell, keyToLetter, readingOrder, wordsByCell } from "./logic";
import { nextZoom, useZoom, zoomLabel, ZoomView } from "./ZoomView";

const SIZE_LABEL = { petite: "Petite grille", moyenne: "Grille moyenne", grande: "Grande grille" } as const;
const FLUSH_MS = 250;

function setAt(s: string, i: number, c: string): string {
  return s.slice(0, i) + c + s.slice(i + 1);
}

function minutesBetween(a: string, b: string): string {
  const m = Math.max(1, Math.round((Date.parse(b) - Date.parse(a)) / 60000));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}

/**
 * One grid being played. Letters show at once and are sent in small batches;
 * in a grid played together, the other one's letters arrive live (in colour).
 */
export function PlayGrid({ id }: { id: number }) {
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [letters, setLetters] = useState("");
  const [authors, setAuthors] = useState("");
  const [finishedAt, setFinishedAt] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ cell: number; dir: Dir }>({ cell: -1, dir: "right" });
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [flash, setFlash] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getGame(id)
      .then((g) => {
        setGame(g);
        setLetters(g.letters);
        setAuthors(g.authors);
        setFinishedAt(g.finishedAt);
        setError(null);
      })
      .catch(() => setError("Cette grille n'a pas pu s'ouvrir."));
  }, [id]);
  useEffect(load, [load]);

  const width = game?.width ?? 1;
  const myMark = game && user?.id === game.ownerId ? "a" : "b";
  const words = useMemo(() => (game ? wordsByCell(game.clues, width) : new Map()), [game, width]);
  const clueCells = useMemo(() => (game ? cluesByCell(game.clues) : new Map<number, Clue[]>()), [game]);
  const order = useMemo(() => (game ? readingOrder(game.clues) : []), [game]);

  // Start on the first word.
  useEffect(() => {
    if (game && cursor.cell < 0 && order.length > 0) setCursor({ cell: order[0].start, dir: order[0].dir });
  }, [game, order, cursor.cell]);

  const activeClue: Clue | null = useMemo(() => {
    const w = words.get(cursor.cell);
    return (w?.[cursor.dir] ?? w?.right ?? w?.down ?? null) as Clue | null;
  }, [words, cursor]);
  const wordCells = useMemo(() => new Set(activeClue ? cellsOf(activeClue, width) : []), [activeClue, width]);
  const [zoom, chooseZoom, defaultZoom] = useZoom(game?.size ?? "petite");
  // What the grid keeps in view when zoomed: the clue, then its word.
  const focus = useMemo(() => (activeClue ? [activeClue.cell, ...cellsOf(activeClue, width)] : []), [activeClue, width]);

  // Full screen while playing: no tab bar under the keyboard (the ‹ goes back to the grids).
  // The page itself does not zoom either (only the grid does, see ZoomView): a page zoomed with
  // the fingers would leave the keyboard out of the screen. Android: the viewport; iPhone: its gesture.
  useEffect(() => {
    document.documentElement.dataset.immersive = "";
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const before = meta?.content;
    if (meta) meta.content = `${before}, maximum-scale=1, user-scalable=no`;
    const noPageZoom = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", noPageZoom);
    return () => {
      delete document.documentElement.dataset.immersive;
      if (meta && before !== undefined) meta.content = before;
      document.removeEventListener("gesturestart", noPageZoom);
    };
  }, []);

  // Sending: changes wait a moment and leave together.
  const pending = useRef(new Map<number, Change>());
  const timer = useRef<number>();
  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const changes = [...pending.current.values()];
    pending.current.clear();
    if (changes.length === 0) return;
    play(id, changes)
      .then((p) => p.finishedAt && setFinishedAt(p.finishedAt))
      .catch(() => {
        setMessage("La connexion a sauté : grille rechargée.");
        load();
      });
  }, [id, load]);
  const send = useCallback(
    (change: Change) => {
      pending.current.set(change.cell, change);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, FLUSH_MS);
    },
    [flush],
  );
  useEffect(() => () => flush(), [flush]); // leaving: nothing is lost

  // The other one's letters, live.
  useEffect(
    () =>
      onCrossword((p) => {
        if (p.gameId !== id || p.by === user?.id) return;
        setLetters((s) => p.cells.reduce((acc, c) => setAt(acc, c.cell, c.letter || "."), s));
        setAuthors((s) => p.cells.reduce((acc, c) => setAt(acc, c.cell, c.author), s));
        setFlash(new Set(p.cells.map((c) => c.cell)));
        window.setTimeout(() => setFlash(new Set()), 900);
        if (p.finishedAt) setFinishedAt(p.finishedAt);
      }),
    [id, user?.id],
  );
  // Back in the app after a while: what was played meanwhile.
  useOnRefresh(load);

  const done = Boolean(finishedAt) || (game !== null && letters === game.solution);

  // After a letter: the next empty cell of the word (the next cell when correcting one already
  // written); the word full, the next one still to fill (no letter written over the last one, no
  // cell to pick again).
  const advance = useCallback(
    (now: string, correcting: boolean) => {
      if (!activeClue) return;
      const cells = cellsOf(activeClue, width);
      const at = cells.indexOf(cursor.cell);
      const empty = (c: number) => now[c] === ".";
      const inWord = cells.slice(at + 1).find(empty) ?? cells.slice(0, at).find(empty);
      if (correcting && at + 1 < cells.length) return setCursor({ cell: cells[at + 1], dir: activeClue.dir });
      if (inWord !== undefined) return setCursor({ cell: inWord, dir: activeClue.dir });
      const i = order.indexOf(activeClue);
      for (let k = 1; k < order.length; k++) {
        const next = order[(i + k) % order.length];
        const first = cellsOf(next, width).find(empty);
        if (first !== undefined) return setCursor({ cell: first, dir: next.dir });
      }
    },
    [activeClue, width, cursor.cell, order],
  );

  // A cell shown wrong stops being red once it is typed again.
  const unmark = useCallback(
    (cell: number) =>
      setWrong((w) => {
        if (!w.has(cell)) return w;
        const next = new Set(w);
        next.delete(cell);
        return next;
      }),
    [],
  );

  const typeLetter = useCallback(
    (l: string) => {
      if (!game || done || cursor.cell < 0) return;
      feel.tap();
      if (authors[cursor.cell] !== "*") {
        unmark(cursor.cell);
        setLetters((s) => setAt(s, cursor.cell, l));
        setAuthors((s) => setAt(s, cursor.cell, myMark));
        send({ cell: cursor.cell, letter: l });
      }
      advance(authors[cursor.cell] === "*" ? letters : setAt(letters, cursor.cell, l), letters[cursor.cell] !== ".");
    },
    [game, done, cursor.cell, authors, letters, myMark, send, advance, unmark],
  );

  const erase = useCallback(() => {
    if (!game || done || cursor.cell < 0) return;
    let cell = cursor.cell;
    if (letters[cell] === "." && activeClue) {
      const cells = cellsOf(activeClue, width);
      const prev = cells[cells.indexOf(cell) - 1];
      if (prev === undefined) return;
      cell = prev;
      setCursor({ cell, dir: activeClue.dir });
    }
    if (authors[cell] === "*" || letters[cell] === ".") return;
    setLetters((s) => setAt(s, cell, "."));
    setAuthors((s) => setAt(s, cell, "."));
    send({ cell, letter: "" });
  }, [game, done, cursor.cell, letters, authors, activeClue, width, send]);

  const toggleDir = useCallback(() => {
    const other: Dir = cursor.dir === "right" ? "down" : "right";
    if (words.get(cursor.cell)?.[other]) setCursor({ cell: cursor.cell, dir: other });
  }, [cursor, words]);

  const tapCell = useCallback(
    (cell: number) => {
      if (!game) return;
      if (game.solution[cell] === BLOCK) {
        const here = clueCells.get(cell);
        if (!here) return;
        // Two clues in the cell: a second tap goes to the other one.
        const pick: Clue = here.length > 1 && activeClue === here[0] ? here[1] : here[0];
        setCursor({ cell: pick.start, dir: pick.dir });
        return;
      }
      const w = words.get(cell);
      if (cell === cursor.cell) {
        toggleDir();
        return;
      }
      setCursor({ cell, dir: w?.[cursor.dir] ? cursor.dir : w?.right ? "right" : "down" });
    },
    [game, clueCells, activeClue, words, cursor, toggleDir],
  );

  const goWord = useCallback(
    (delta: 1 | -1) => {
      if (!activeClue || order.length === 0) return;
      const i = order.indexOf(activeClue);
      const next = order[(i + delta + order.length) % order.length];
      const firstEmpty = cellsOf(next, width).find((c) => letters[c] === ".");
      setCursor({ cell: firstEmpty ?? next.start, dir: next.dir });
    },
    [activeClue, order, width, letters],
  );

  const reveal = useCallback(() => {
    if (!game || done || cursor.cell < 0 || authors[cursor.cell] === "*") return;
    const cell = cursor.cell;
    setLetters((s) => setAt(s, cell, game.solution[cell]));
    setAuthors((s) => setAt(s, cell, "*"));
    send({ cell, reveal: true });
    advance(setAt(letters, cell, game.solution[cell]), letters[cell] !== ".");
  }, [game, done, cursor.cell, authors, letters, send, advance]);

  const check = useCallback(() => {
    if (!game || !activeClue) return;
    const cells = cellsOf(activeClue, width);
    const bad = cells.filter((c) => letters[c] !== "." && letters[c] !== game.solution[c]);
    const empty = cells.some((c) => letters[c] === ".");
    setWrong(new Set(bad));
    window.setTimeout(() => setWrong(new Set()), 2200);
    setMessage(bad.length > 0 ? `${bad.length} lettre${bad.length > 1 ? "s" : ""} à revoir` : empty ? "Rien de faux pour l'instant" : "✓ Mot juste !");
  }, [game, activeClue, width, letters]);

  // The grid full but not right: its wrong letters in red (until typed again), the cursor on the first.
  const showErrors = useCallback(() => {
    if (!game) return;
    const bad = [...game.solution].flatMap((c, i) => (c !== BLOCK && letters[i] !== c ? [i] : []));
    setWrong(new Set(bad));
    const first = bad[0];
    if (first === undefined) return;
    const w = words.get(first);
    setCursor({ cell: first, dir: w?.[cursor.dir] ? cursor.dir : w?.right ? "right" : "down" });
  }, [game, letters, words, cursor.dir]);

  // A finished grid: the next one, as it was set (same size, theme, level, alone or together), in one tap.
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const another = useCallback(() => {
    if (!game || starting) return;
    setStarting(true);
    createGame(game.size as Size, game.shared, game.theme as Theme, game.level as Level)
      .then((g) => navigate(`/jeux/mots-fleches?partie=${g.id}`))
      .catch(() => {
        setStarting(false);
        setMessage("La nouvelle grille n'a pas pu se créer.");
      });
  }, [game, starting, navigate]);

  // The grid of the day done: how many days in a row now.
  const [streak, setStreak] = useState<number | null>(null);
  useEffect(() => {
    if (!done || !game?.daily) return;
    getDaily()
      .then((d) => setStreak(d.streak))
      .catch(() => setStreak(null));
  }, [done, game?.daily]);

  // Starting over: whatever was waiting to be sent goes, the empty grid comes back from the server.
  const restart = useCallback(() => {
    const ask = game?.shared ? "Recommencer la grille ? Toutes les lettres seront effacées, pour vous deux." : "Recommencer la grille ? Toutes les lettres seront effacées.";
    if (!window.confirm(ask)) return;
    window.clearTimeout(timer.current);
    pending.current.clear();
    restartGame(id)
      .then(() => {
        setCursor({ cell: -1, dir: "right" }); // back to the first word
        load();
      })
      .catch(() => setMessage("La grille n'a pas pu être recommencée."));
  }, [game?.shared, id, load]);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 2200);
    return () => window.clearTimeout(t);
  }, [message]);

  // A computer keyboard works too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const letter = keyToLetter(e.key);
      if (letter) {
        e.preventDefault();
        typeLetter(letter);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        erase();
      } else if (e.key === " " || e.key === "Tab") {
        e.preventDefault();
        if (e.key === "Tab") goWord(e.shiftKey ? -1 : 1);
        else toggleDir();
      } else if (e.key.startsWith("Arrow") && game) {
        e.preventDefault();
        const dir: Dir = e.key === "ArrowLeft" || e.key === "ArrowRight" ? "right" : "down";
        const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -width, ArrowDown: width }[e.key] ?? 0;
        let cell = cursor.cell + step;
        while (cell >= 0 && cell < game.solution.length && game.solution[cell] === BLOCK) {
          if (dir === "right" && Math.floor(cell / width) !== Math.floor(cursor.cell / width)) break;
          cell += step;
        }
        if (cell >= 0 && cell < game.solution.length && game.solution[cell] !== BLOCK && (dir === "down" || Math.floor(cell / width) === Math.floor(cursor.cell / width))) {
          setCursor({ cell, dir: words.get(cell)?.[dir] ? dir : cursor.dir });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [typeLetter, erase, toggleDir, goWord, game, cursor, width, words]);

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-danger">{error}</p>
        <Link to="/jeux/mots-fleches" className="mt-3 inline-block text-primary underline-offset-2 hover:underline">
          Retour aux grilles
        </Link>
      </div>
    );
  }
  if (!game) return <p className="p-8 text-center text-text-muted">Chargement…</p>;

  const letterCells = [...game.solution].filter((c) => c !== BLOCK).length;
  const filled = [...letters].filter((c) => c !== BLOCK && c !== ".").length;
  // Every cell written but the grid not right: nothing would happen without telling how many are wrong.
  const errors = !done && filled === letterCells ? [...game.solution].filter((c, i) => c !== BLOCK && letters[i] !== c).length : 0;
  const revealed = [...authors].filter((c) => c === "*").length;
  const stars = starsFor(revealed);
  const took = finishedAt ? minutesBetween(game.createdAt, finishedAt) : null;
  const title = game.daily ? "📅 Grille du jour" : `${themeOf(game.theme).emoji} ${SIZE_LABEL[game.size]}`;

  return (
    // One screen high: the grid takes what the header and the keyboard leave (it zooms inside).
    <div
      className="flex h-[calc(100dvh-var(--topbar-h)-var(--tabbar-h)-2rem)] touch-manipulation flex-col gap-2 lg:h-[calc(100dvh-var(--desk-topbar-h)-5rem)]"
      data-no-pull
    >
      <header className="flex shrink-0 items-center gap-2">
        <Link to="/jeux/mots-fleches" aria-label="Retour aux grilles" className="grid h-9 w-9 place-items-center rounded-full text-text-muted press hover:text-text">
          <Icon name="chevronLeft" size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-bold leading-tight">
            {title}
          </h1>
          <p className="truncate text-xs text-text-muted">
            {themeOf(game.theme).label} · {levelLabel(game.level)} · {game.shared ? "à deux 💞" : "seul"} · {Math.round((filled * 100) / letterCells)} %
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => chooseZoom(nextZoom(zoom ?? 1))}
            aria-label={`Zoom de la grille : ${zoomLabel(zoom ?? 1)}, toucher pour changer (ou pincer la grille)`}
            title="Zoom (ou pincez la grille)"
            className="chip press tabular-nums hover:border-primary/50"
          >
            🔍{(zoom ?? 1) > 1.05 && <span className="hidden text-xs sm:inline"> {zoomLabel(zoom ?? 1)}</span>}
          </button>
        {!done && (
          <>
            {filled > 0 && (
              <button type="button" onClick={restart} aria-label="Recommencer la grille" title="Recommencer la grille" className="chip press hover:border-primary/50">
                ↺
              </button>
            )}
            <button type="button" onClick={check} aria-label="Vérifier le mot" title="Vérifier le mot" className="chip press hover:border-primary/50">
              ✓<span className="hidden sm:inline"> Mot</span>
            </button>
            <button type="button" onClick={reveal} aria-label="Révéler la lettre" title="Révéler la lettre" className="chip press hover:border-primary/50">
              💡<span className="hidden sm:inline"> Lettre</span>
            </button>
          </>
        )}
        </div>
      </header>

      <ZoomView
        cols={width}
        rows={game.height}
        size={game.size}
        zoom={zoom}
        onZoom={chooseZoom}
        onDefaultZoom={defaultZoom}
        focus={done ? [] : focus}
        cursor={done ? -1 : cursor.cell}
      >
        <Grid
        width={width}
        solution={game.solution}
        letters={letters}
        authors={authors}
        myMark={myMark}
        clueCells={clueCells}
        wordCells={wordCells}
        cursor={done ? -1 : cursor.cell}
        activeClue={done ? null : activeClue}
        wrong={wrong}
        flash={flash}
        onCell={tapCell}
        />
      </ZoomView>

      {done ? (
        <div className="card relative shrink-0 overflow-hidden p-4 text-center animate-pop">
          <Confetti />
          <p className="font-display text-2xl font-bold">Bravo ! 🎉</p>
          <p className="mt-1 text-2xl" aria-label={`${stars} étoile${stars > 1 ? "s" : ""} sur 3`}>
            {"⭐".repeat(stars)}
            <span className="opacity-25">{"⭐".repeat(3 - stars)}</span>
          </p>
          <p className="mt-1 text-text-muted">
            Grille terminée{took ? ` en ${took}` : ""}
            {game.shared ? ", à deux" : ""}
            {revealed === 0 ? ", sans aide !" : `, ${revealed} lettre${revealed > 1 ? "s" : ""} révélée${revealed > 1 ? "s" : ""}.`}
          </p>
          {game.daily && (
            <p className="mt-1 text-sm font-semibold">
              {streak && streak > 1 ? `🔥 ${streak} jours d'affilée !` : "🔥 Première grille du jour de la série !"} La prochaine, demain.
            </p>
          )}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <ShareScore
              text={`✏️ ${game.daily ? "Grille du jour" : `Mots fléchés · ${SIZE_LABEL[game.size].toLowerCase()}`} (${levelLabel(game.level).toLowerCase()}) terminée${took ? ` en ${took}` : ""}${game.shared ? " à deux 💞" : ""} ${"⭐".repeat(stars)}${revealed === 0 ? " · sans aide !" : ""}`}
            />
            {game.daily ? (
              <Link to="/jeux/mots-fleches" className="inline-block rounded-full btn-brand px-5 py-2 text-sm font-semibold press">
                Une autre grille
              </Link>
            ) : (
              <>
                <button type="button" onClick={another} disabled={starting} className="rounded-full btn-brand px-5 py-2 text-sm font-semibold press disabled:opacity-60">
                  {starting ? "Création…" : "Nouvelle grille"}
                </button>
                <Link to="/jeux/mots-fleches" className="chip press self-center">
                  Toutes les grilles
                </Link>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex shrink-0 flex-col gap-2 rounded-token border border-border bg-surface p-2 shadow-card">
          {errors > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-token bg-danger/10 px-2 py-1.5 text-center text-sm animate-pop" role="status">
              <span>
                🧐 Grille pleine, mais {errors} lettre{errors > 1 ? "s" : ""} fausse{errors > 1 ? "s" : ""}
              </span>
              <button type="button" onClick={showErrors} className="chip press text-xs font-semibold">
                {errors > 1 ? "Les montrer" : "La montrer"}
              </button>
            </div>
          )}
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => goWord(-1)} aria-label="Mot précédent" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-muted press hover:text-text">
              <Icon name="chevronLeft" size={18} />
            </button>
            <p className="line-clamp-2 min-h-[2.5rem] min-w-0 flex-1 content-center text-center text-[15px] font-semibold leading-tight" aria-live="polite">
              {message ?? (activeClue ? `${activeClue.dir === "right" ? "→" : "↓"} ${activeClue.text} (${activeClue.length})` : "")}
            </p>
            <button type="button" onClick={() => goWord(1)} aria-label="Mot suivant" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-muted press hover:text-text">
              <Icon name="chevronLeft" size={18} className="rotate-180" />
            </button>
          </div>
          {/* A computer with a mouse types on its own keyboard: the grid gets the room. */}
          <div className="lg:[@media(pointer:fine)]:hidden">
            <Keyboard dir={cursor.dir} onLetter={typeLetter} onErase={erase} onToggleDir={toggleDir} />
          </div>
        </div>
      )}
    </div>
  );
}
