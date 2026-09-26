import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCompanion } from "../../app/companion";
import { ApiError } from "../../lib/api/client";
import { useAuth } from "../auth/useAuth";
import { Confetti } from "../games/Confetti";
import { loadMemory } from "./ai";
import {
  chooseTheme, createNaval, getNaval, onNaval, placeFleet, quitNaval, shoot,
  type NavalTheme, type NavalView,
} from "./api";
import { Board, cellName, type Effect } from "./Board";
import { Steps, ThemePicker } from "./parts";
import { Placer } from "./Placer";
import { SoloGame } from "./SoloGame";
import { themeOf } from "./themes";

type Run = (call: () => Promise<NavalView | void>) => Promise<boolean>;
type Mode = "home" | "solo" | "duo";

/**
 * 🚢 Bataille navale : contre l'IA (dans le navigateur) ou à deux, tour par
 * tour (la partie attend l'autre ; le serveur garde les flottes et le thème
 * vaut pour les deux écrans). Une barre d'étapes dit toujours où on en est.
 */
export function NavalPage() {
  const { user } = useAuth();
  const myId = user?.id ?? -1;
  const [mode, setMode] = useState<Mode | null>(null);
  const [soloBusy, setSoloBusy] = useState(false);
  const [game, setGame] = useState<NavalView | null>(null);
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

  // First load: straight into a battle under way, else the choice solo / à deux.
  const load = useCallback(() => {
    getNaval()
      .then((g) => {
        take(g);
        setFailed(false);
        setMode((m) => m ?? (g && g.status !== "done" ? "duo" : "home"));
      })
      .catch(() => {
        setFailed(true);
        setMode((m) => m ?? "home");
      });
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

  const home = () => {
    if (mode === "solo" && soloBusy && !window.confirm("Quitter la partie contre l'IA ?")) return;
    setError(null);
    setMode("home");
  };

  const other = game ? (game.hostId === game.meId ? game.guestName : game.hostName) : "";
  const step = !game || game.status === "done" ? 0 : game.status === "placing" ? (game.mePlaced ? 2 : 1) : 3;

  return (
    <div className={`mx-auto flex max-w-xl flex-col gap-4 nv-page nv-page--${game?.theme ?? "ocean"}`} data-naval="">
      <header className="flex items-center gap-3 animate-fade-up">
        {mode === "solo" || mode === "duo" ? (
          <button type="button" onClick={home} aria-label="Retour au choix solo ou à deux" className="chip press text-sm">←</button>
        ) : (
          <Link to="/jeux" aria-label="Retour aux jeux" className="chip press text-sm">←</Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-bold">🚢 Bataille navale</h1>
          <p className="text-sm text-text-muted">
            {mode === "duo" && game ? <>Victoires : toi <b>{game.myWins}</b> · {other} <b>{game.theirWins}</b></> : mode === "solo" ? "Contre l'IA" : "Contre l'IA, ou à deux tour par tour."}
          </p>
        </div>
        {mode === "duo" && game && <span className="chip shrink-0 text-xs" title={themeOf(game.theme).label}>{themeOf(game.theme).emoji}<span className="ml-1 hidden sm:inline">{themeOf(game.theme).label}</span></span>}
      </header>

      {mode === null && <div className="card aspect-square animate-pulse" />}
      {error && mode !== "solo" && <p className="card p-3 text-sm text-danger" role="alert">{error}</p>}
      {mode === "home" && <Home game={game} other={other} failed={failed} onRetry={load} onSolo={() => setMode("solo")} onDuo={async () => {
        if (game?.status === "done" && !(await run(() => createNaval(game.nextTheme)))) return;
        setMode("duo");
      }} />}
      {mode === "solo" && <SoloGame onBusy={setSoloBusy} />}

      {mode === "duo" && (
        <>
          {game?.status !== "done" && <Steps steps={["Lancer", "Ta flotte", other ? `Attendre ${other}` : "Attendre l'autre", "Combat"]} at={step} />}
          {failed && <p className="card p-4 text-sm">La bataille ne répond pas. <button type="button" onClick={load} className="underline">Réessayer</button></p>}
          {toast && <p key={toast.key} className={`nv-toast ${toast.good ? "nv-toast--good" : ""}`} role="status">{toast.text}</p>}
          {!game && !failed && <Start run={run} />}
          {game?.status === "placing" && !game.mePlaced && <Placing key={game.id} g={game} other={other} run={run} />}
          {game?.status === "placing" && game.mePlaced && <Waiting g={game} other={other} run={run} />}
          {game?.status === "playing" && <Playing g={game} other={other} effect={effect} run={run} />}
          {game?.status === "done" && <Final key={game.id} g={game} other={other} run={run} />}
        </>
      )}
    </div>
  );
}

/** The choice: the AI now, or the other one (a battle to resume, or a new one). */
function Home({ game, other, failed, onRetry, onSolo, onDuo }: {
  game: NavalView | null;
  other: string;
  failed: boolean;
  onRetry: () => void;
  onSolo: () => void;
  onDuo: () => void;
}) {
  const solo = Object.values(loadMemory().wins).reduce((s, w) => ({ me: s.me + w.me, ai: s.ai + w.ai }), { me: 0, ai: 0 });
  const who = other || "l'autre";
  const duo = !game
    ? { title: "👥 À deux", text: "Défie l'autre : chacun place sa flotte, puis un tir chacun. La partie vous attend." }
    : game.status === "done"
      ? { title: `👥 Nouvelle bataille avec ${who}`, text: `Thème : ${themeOf(game.nextTheme).emoji} ${themeOf(game.nextTheme).label} · Victoires : toi ${game.myWins} · ${who} ${game.theirWins}` }
      : {
          title: `👥 Reprendre avec ${who}`,
          text: game.status === "placing"
            ? game.mePlaced ? `${who} place sa flotte…` : "⚓ Place ta flotte !"
            : game.turnId === game.meId ? "🎯 À toi de tirer !" : `⏳ Au tour de ${who}`,
        };
  return (
    <section className="grid gap-3 animate-fade-up" aria-label="Choisir une partie">
      <button type="button" onClick={onSolo} className="nv-mode press">
        <span className="nv-mode-title">🤖 Contre l'IA</span>
        <span className="text-sm">Trois niveaux : Moussaillon, Capitaine, Amiral. L'Amiral retient tes habitudes.</span>
        {solo.me + solo.ai > 0 && <span className="text-xs text-text-muted">Toi {solo.me} · IA {solo.ai}</span>}
      </button>
      <button type="button" onClick={onDuo} disabled={failed && !game} className="nv-mode press disabled:opacity-50">
        <span className="nv-mode-title">{duo.title}</span>
        <span className="text-sm">{duo.text}</span>
      </button>
      {failed && <p className="text-sm text-text-muted">La partie à deux ne répond pas. <button type="button" onClick={onRetry} className="underline">Réessayer</button></p>}
    </section>
  );
}

/** The very first battle for two: whoever starts it picks the theme. */
function Start({ run }: { run: Run }) {
  const [theme, setTheme] = useState<NavalTheme>("ocean");
  return (
    <section className="card flex flex-col gap-4 p-4 animate-fade-up" aria-label="Première bataille">
      <p className="text-sm">Première bataille à deux : choisis le thème. Ensuite, c'est le gagnant de chaque partie qui choisira celui de la suivante.</p>
      <ThemePicker value={theme} onPick={setTheme} />
      <button type="button" onClick={() => void run(() => createNaval(theme))} className="btn-brand press self-end rounded-token px-5 py-2 font-semibold">
        ⚓ Lancer et placer ma flotte →
      </button>
    </section>
  );
}

/** Placing my fleet (the other places theirs at the same time). */
function Placing({ g, other, run }: { g: NavalView; other: string; run: Run }) {
  const { companion } = useCompanion();
  const [busy, setBusy] = useState(false);
  return (
    <section className="flex flex-col gap-3 animate-fade-up" aria-label="Placer la flotte">
      <p className="nv-banner">{g.themPlaced ? `✓ ${other} est prêt·e : à toi de placer ta flotte` : `⚓ Place ta flotte · ${other} place la sienne en même temps`}</p>
      <Placer
        theme={g.theme}
        captain={companion}
        busy={busy}
        onReady={async (fleet) => {
          setBusy(true);
          await run(() => placeFleet(g.id, fleet));
          setBusy(false);
        }}
      />
      <Quit g={g} run={run} />
    </section>
  );
}

function Waiting({ g, other, run }: { g: NavalView; other: string; run: Run }) {
  const { companion } = useCompanion();
  return (
    <section className="flex flex-col gap-3 animate-fade-up" aria-label="En attente">
      <p className="nv-banner">✓ Ta flotte est prête · ⏳ {other} place la sienne<span className="nv-dots" /></p>
      <p className="text-center text-sm text-text-muted">Le combat commence dès que {other} a fini. Tu peux fermer : une notif te dira quand c'est à toi de tirer.</p>
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
