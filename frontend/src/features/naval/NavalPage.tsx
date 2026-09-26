import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCompanion } from "../../app/companion";
import { ApiError } from "../../lib/api/client";
import { useAuth } from "../auth/useAuth";
import { Confetti } from "../games/Confetti";
import {
  cellsOf, chooseTheme, createNaval, getNaval, LENGTHS, onNaval, placeFleet, quitNaval, shoot,
  type NavalTheme, type NavalView, type Placement,
} from "./api";
import { Board, cellName, type Effect } from "./Board";
import { THEMES, themeOf } from "./themes";

type Run = (call: () => Promise<NavalView | void>) => Promise<boolean>;

/**
 * 🚢 Bataille navale, à deux et tour par tour (la partie attend l'autre) :
 * chacun place sa flotte, puis un tir chacun jusqu'à ce qu'une flotte coule.
 * Le serveur garde les flottes ; le thème vaut pour les deux écrans.
 */
export function NavalPage() {
  const { user } = useAuth();
  const myId = user?.id ?? -1;
  const [game, setGame] = useState<NavalView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [effect, setEffect] = useState<(Effect & { mine: boolean }) | null>(null);
  const [toast, setToast] = useState<{ key: number; text: string; good: boolean } | null>(null);
  const seen = useRef<{ id: number; shots: number } | null>(null);

  // A new shot since last time: animate it on the right sea and say what it did.
  const take = useCallback((g: NavalView | undefined) => {
    if (!g) return;
    const before = seen.current;
    seen.current = { id: g.id, shots: g.shots };
    setGame(g);
    if (!before || before.id !== g.id || g.shots <= before.shots || !g.last) return;
    const t = themeOf(g.theme);
    const mine = g.last.by === g.meId;
    const other = g.hostId === g.meId ? g.guestName : g.hostName;
    const what = g.last.sunk != null ? t.sunk(t.ships[g.last.sunk]) : g.last.hit ? t.hit : t.miss;
    setEffect({ key: g.shots, cell: g.last.cell, hit: g.last.hit, sunk: g.last.sunk != null, mine });
    setToast({ key: g.shots, text: mine ? what : `${other} vise ${cellName(g.last.cell)} : ${what}`, good: mine === g.last.hit });
  }, []);

  const load = useCallback(() => {
    getNaval()
      .then((g) => {
        take(g);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoaded(true));
  }, [take]);
  useEffect(load, [load]);
  useEffect(() => onNaval((p) => {
    if (p.hostId === myId || p.guestId === myId) load();
  }), [load, myId]);
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const run: Run = async (call) => {
    setError(null);
    try {
      const g = await call();
      if (g) take(g);
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ça n'est pas passé, réessaie.");
      return false;
    }
  };

  const other = game ? (game.hostId === game.meId ? game.guestName : game.hostName) : "";

  return (
    <div className={`mx-auto flex max-w-xl flex-col gap-4 nv-page nv-page--${game?.theme ?? "ocean"}`} data-naval="">
      <header className="flex items-center gap-3 animate-fade-up">
        <Link to="/jeux" aria-label="Retour aux jeux" className="chip press text-sm">←</Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold">🚢 Bataille navale</h1>
          <p className="text-sm text-text-muted">
            {game ? <>Victoires : toi <b>{game.myWins}</b> · {other} <b>{game.theirWins}</b></> : "À deux, un tir chacun. La partie vous attend."}
          </p>
        </div>
        {game && <span className="chip shrink-0 text-xs" title={themeOf(game.theme).label}>{themeOf(game.theme).emoji}<span className="ml-1 hidden sm:inline">{themeOf(game.theme).label}</span></span>}
      </header>

      {failed && <p className="card p-4 text-sm">La bataille ne répond pas. <button type="button" onClick={load} className="underline">Réessayer</button></p>}
      {!loaded && !failed && <div className="card aspect-square animate-pulse" />}
      {error && <p className="card p-3 text-sm text-danger" role="alert">{error}</p>}
      {toast && <p key={toast.key} className={`nv-toast ${toast.good ? "nv-toast--good" : ""}`} role="status">{toast.text}</p>}

      {loaded && !game && <Start run={run} />}
      {game?.status === "placing" && !game.mePlaced && <Placing key={game.id} g={game} run={run} />}
      {game?.status === "placing" && game.mePlaced && <Waiting g={game} other={other} run={run} />}
      {game?.status === "playing" && <Playing g={game} other={other} effect={effect} run={run} />}
      {game?.status === "done" && <Final key={game.id} g={game} other={other} run={run} />}
    </div>
  );
}

/** The very first game: whoever starts it picks the theme. */
function Start({ run }: { run: Run }) {
  const [theme, setTheme] = useState<NavalTheme>("ocean");
  return (
    <section className="card flex flex-col gap-4 p-4 animate-fade-up" aria-label="Première bataille">
      <p className="text-sm">Première bataille : choisis le thème. Ensuite, c'est le gagnant de chaque partie qui choisira celui de la suivante.</p>
      <ThemePicker value={theme} onPick={setTheme} />
      <button type="button" onClick={() => void run(() => createNaval(theme))} className="btn-brand press self-start rounded-token px-5 py-2 font-semibold">
        ⚓ Lancer la bataille
      </button>
    </section>
  );
}

function ThemePicker({ value, onPick }: { value: NavalTheme; onPick: (t: NavalTheme) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Thème">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={value === t.id}
          onClick={() => onPick(t.id)}
          className={`nv-theme-card nv-${t.id} press ${value === t.id ? "nv-theme-card--on" : ""}`}
        >
          <span className="nv-sea" aria-hidden="true" />
          <span className="relative text-2xl" aria-hidden="true">{t.emoji}</span>
          <span className="relative font-semibold">{t.label}</span>
          <span className="relative text-xs opacity-85">{t.blurb}</span>
        </button>
      ))}
    </div>
  );
}

/** Placing my fleet: pick a ship, tap where it starts, turn it if needed. */
function Placing({ g, run }: { g: NavalView; run: Run }) {
  const { companion } = useCompanion();
  const t = themeOf(g.theme);
  const [ships, setShips] = useState<(Placement | null)[]>(() => LENGTHS.map(() => null));
  const [vertical, setVertical] = useState<boolean[]>(() => LENGTHS.map(() => false));
  const [selected, setSelected] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [bad, setBad] = useState(0);
  const [busy, setBusy] = useState(false);

  const fits = (type: number, p: Placement) => {
    const cells = cellsOf(p, LENGTHS[type]);
    if (!cells) return null;
    const taken = new Set(ships.flatMap((s, i) => (s && i !== type ? cellsOf(s, LENGTHS[i]) ?? [] : [])));
    return cells.some((c) => taken.has(c)) ? null : cells;
  };
  const put = (cell: number) => {
    const p = { cell, vertical: vertical[selected] };
    if (!fits(selected, p)) {
      setBad((b) => b + 1);
      return;
    }
    const next = ships.map((s, i) => (i === selected ? p : s));
    setShips(next);
    const free = next.findIndex((s) => s == null);
    if (free >= 0) setSelected(free);
  };
  const turn = () => {
    const v = !vertical[selected];
    const placed = ships[selected];
    if (placed && !fits(selected, { cell: placed.cell, vertical: v })) {
      setBad((b) => b + 1);
      return;
    }
    setVertical((vs) => vs.map((x, i) => (i === selected ? v : x)));
    if (placed) setShips((s) => s.map((x, i) => (i === selected ? { cell: placed.cell, vertical: v } : x)));
  };

  const hoverCells = hover == null ? null : cellsOf({ cell: hover, vertical: vertical[selected] }, LENGTHS[selected]);
  const preview = hover == null ? null : { cells: hoverCells ?? [hover], ok: !!fits(selected, { cell: hover, vertical: vertical[selected] }) };
  const ready = ships.every((s) => s != null);

  return (
    <section className="flex flex-col gap-3 animate-fade-up" aria-label="Placer la flotte">
      <p className="text-sm">Choisis un bateau, touche la case où il commence, pivote-le si besoin. Les bateaux peuvent se toucher.</p>
      <Board
        theme={g.theme}
        label="Ta mer"
        ships={ships.flatMap((s, i) => (s ? [{ type: i, cells: cellsOf(s, LENGTHS[i]) ?? [], selected: i === selected }] : []))}
        shots={[]}
        onCell={put}
        onShip={setSelected}
        onHover={setHover}
        preview={preview}
        shake={bad}
        captain={companion}
      />
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Bateaux">
        {LENGTHS.map((len, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={selected === i}
            onClick={() => setSelected(i)}
            className={`chip press text-sm ${selected === i ? "nv-chip--on" : ""}`}
          >
            {ships[i] ? "✓ " : ""}{t.ships[i]} <span className="nv-len" aria-label={`${len} cases`}>{"▮".repeat(len)}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={turn} className="chip press text-sm">↻ Pivoter ({vertical[selected] ? "vertical" : "horizontal"})</button>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={async () => {
            setBusy(true);
            await run(() => placeFleet(g.id, ships as Placement[]));
            setBusy(false);
          }}
          className="btn-brand press ml-auto rounded-token px-5 py-2 font-semibold disabled:opacity-40"
        >
          {ready ? "⚓ Flotte prête !" : `${ships.filter(Boolean).length}/5 placés`}
        </button>
      </div>
      <Quit g={g} run={run} />
    </section>
  );
}

function Waiting({ g, other, run }: { g: NavalView; other: string; run: Run }) {
  const { companion } = useCompanion();
  return (
    <section className="flex flex-col gap-3 animate-fade-up" aria-label="En attente">
      <p className="nv-banner">⏳ {other} place sa flotte<span className="nv-dots" /></p>
      <Board theme={g.theme} label="Ta flotte" ships={g.myFleet} shots={[]} small captain={companion} />
      <Quit g={g} run={run} />
    </section>
  );
}

function Playing({ g, other, effect, run }: { g: NavalView; other: string; effect: (Effect & { mine: boolean }) | null; run: Run }) {
  const { companion } = useCompanion();
  const t = themeOf(g.theme);
  const myTurn = g.turnId === g.meId;
  const [busy, setBusy] = useState(false);
  const shot = new Set(g.myShots.map((s) => s.cell));
  const myLeft = g.myFleet.filter((s) => !s.sunk).length;
  const theirLeft = 5 - g.theirShips.length;

  const fire = async (cell: number) => {
    if (busy || !myTurn || shot.has(cell)) return;
    setBusy(true);
    await run(() => shoot(g.id, cell));
    setBusy(false);
  };

  return (
    <section className="flex flex-col gap-3" aria-label="Bataille">
      <p className={`nv-banner ${myTurn ? "nv-banner--turn" : ""}`} aria-live="polite">
        {myTurn ? `🎯 À toi ! ${t.fire}` : <>🔭 {other} vise<span className="nv-dots" /></>}
      </p>
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>Mer de {other} · encore <b>{theirLeft}</b> bateau{theirLeft > 1 ? "x" : ""}</span>
        <span>{g.myShots.filter((s) => s.hit).length} touché{g.myShots.filter((s) => s.hit).length > 1 ? "s" : ""} / {g.myShots.length} tirs</span>
      </div>
      <Board
        theme={g.theme}
        label={`Mer de ${other}`}
        ships={g.theirShips}
        shots={g.myShots}
        onCell={(c) => void fire(c)}
        canAim={(c) => myTurn && !busy && !shot.has(c)}
        effect={effect?.mine ? effect : null}
        radar={myTurn}
      />
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>Ta flotte · encore <b>{myLeft}</b> bateau{myLeft > 1 ? "x" : ""}</span>
        <Quit g={g} run={run} />
      </div>
      <Board
        theme={g.theme}
        label="Ta flotte"
        ships={g.myFleet}
        shots={g.theirShots}
        effect={effect && !effect.mine ? effect : null}
        shake={effect && !effect.mine && effect.hit ? effect.key : undefined}
        small
        captain={companion}
      />
    </section>
  );
}

function Quit({ g, run }: { g: NavalView; run: Run }) {
  return (
    <button type="button" onClick={() => window.confirm("Abandonner la bataille ?") && void run(() => quitNaval(g.id))} className="chip press self-start text-xs text-text-muted">
      Abandonner
    </button>
  );
}

/** The end: who won, both seas uncovered, the winner's pick for next time, and a new battle. */
function Final({ g, other, run }: { g: NavalView; other: string; run: Run }) {
  const { companion } = useCompanion();
  const won = g.winnerId === g.meId;
  const abandoned = g.endedReason === "abandon";
  const [pick, setPick] = useState<NavalTheme>(g.nextTheme);
  const next = themeOf(g.nextTheme);
  return (
    <section className="flex flex-col gap-3 animate-fade-up" aria-label="Fin de la bataille">
      {won && <Confetti />}
      <div className="card flex flex-col items-center gap-2 p-5 text-center">
        <p className="nv-result font-display text-3xl font-bold">
          {abandoned ? "🏳️ Bataille abandonnée" : won ? "🏆 Victoire !" : `⚓ ${other} gagne !`}
        </p>
        {!abandoned && <p className="text-sm text-text-muted">{won ? `Toute la flotte de ${other} est au fond.` : "Ta flotte a coulé… revanche ?"}</p>}
        {won ? (
          <div className="mt-2 flex w-full flex-col gap-2 text-left">
            <p className="text-sm font-semibold">Choisis le thème de la prochaine bataille (pour vous deux) :</p>
            <ThemePicker value={pick} onPick={setPick} />
            <button type="button" disabled={pick === g.nextTheme} onClick={() => void run(() => chooseTheme(g.id, pick))} className="chip press self-start text-sm disabled:opacity-40">
              {pick === g.nextTheme ? `✓ ${next.emoji} ${next.label} choisi` : "Choisir ce thème"}
            </button>
          </div>
        ) : (
          <p className="text-sm">Prochaine bataille : {next.emoji} {next.label}{!abandoned && ` (au choix de ${other})`}</p>
        )}
        <button type="button" onClick={() => void run(() => createNaval(g.nextTheme))} className="btn-brand press mt-2 rounded-token px-5 py-2 font-semibold">
          ⚓ Nouvelle bataille
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-text-muted">Mer de {other}</p>
          <Board theme={g.theme} label={`Mer de ${other}`} ships={g.theirShips} shots={g.myShots} small />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-text-muted">Ta flotte</p>
          <Board theme={g.theme} label="Ta flotte" ships={g.myFleet} shots={g.theirShots} small captain={companion} />
        </div>
      </div>
    </section>
  );
}
