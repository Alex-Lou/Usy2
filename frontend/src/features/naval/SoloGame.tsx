import { useEffect, useState } from "react";
import { useCompanion } from "../../app/companion";
import { Confetti } from "../games/Confetti";
import { aiShot, learn, LEVELS, loadMemory, nextStyle, saveMemory, type Memory } from "./ai";
import { cellsOf, LENGTHS, type Placement, type Shot } from "./api";
import { Board, cellName, type Effect } from "./Board";
import { randomFleet } from "./fleet";
import { Steps, ThemePicker } from "./parts";
import { Placer } from "./Placer";
import { themeOf } from "./themes";

type Phase = "setup" | "placing" | "playing" | "done";
type Side = "me" | "ai";

const STEPS = ["Réglages", "Ta flotte", "Combat"];
const cellsOfFleet = (f: Placement[]) => f.map((p, i) => cellsOf(p, LENGTHS[i]) ?? []);
const sunkFlags = (ships: number[][], shots: Shot[]) => {
  const hit = new Set(shots.filter((s) => s.hit).map((s) => s.cell));
  return ships.map((s) => s.every((c) => hit.has(c)));
};

/**
 * 🤖 Solo contre l'IA, tout dans le navigateur : réglages (niveau, thème),
 * placement, puis un tir chacun. L'IA varie son placement à chaque partie et,
 * au niveau Amiral, se souvient de tes habitudes.
 */
export function SoloGame({ onBusy }: { onBusy: (busy: boolean) => void }) {
  const { companion } = useCompanion();
  const [mem, setMem] = useState<Memory>(loadMemory);
  const [phase, setPhase] = useState<Phase>("setup");
  const [myFleet, setMyFleet] = useState<Placement[] | null>(null);
  const [mine, setMine] = useState<number[][]>([]);
  const [theirs, setTheirs] = useState<number[][]>([]);
  const [myShots, setMyShots] = useState<Shot[]>([]);
  const [aiShots, setAiShots] = useState<Shot[]>([]);
  const [turn, setTurn] = useState<Side>("me");
  const [winner, setWinner] = useState<Side | null>(null);
  const [effect, setEffect] = useState<(Effect & { by: Side }) | null>(null);
  const [toast, setToast] = useState<{ key: number; text: string; good: boolean } | null>(null);

  const t = themeOf(mem.theme);
  const lv = LEVELS.find((l) => l.id === mem.level) ?? LEVELS[1];
  const foe = `${lv.emoji} ${lv.label}`;
  const record = mem.wins[mem.level];

  useEffect(() => onBusy(phase === "placing" || phase === "playing"), [phase, onBusy]);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const settle = (next: Memory) => {
    setMem(next);
    saveMemory(next);
  };

  const start = (fleet: Placement[]) => {
    const style = nextStyle(mem.lastStyle);
    const ai = randomFleet(style, Math.random, mem.level === "amiral" ? mem.shotHeat : undefined);
    settle({ ...mem, lastStyle: style });
    const first: Side = Math.random() < 0.5 ? "me" : "ai";
    setMyFleet(fleet);
    setMine(cellsOfFleet(fleet));
    setTheirs(cellsOfFleet(ai));
    setMyShots([]);
    setAiShots([]);
    setEffect(null);
    setWinner(null);
    setTurn(first);
    setPhase("playing");
    setToast({ key: Date.now(), text: first === "me" ? "🪙 Pile ou face : à toi de commencer !" : `🪙 Pile ou face : ${foe} commence`, good: first === "me" });
  };

  /** One shot, by either side: marks it, animates it, says what it did, ends or passes the turn. */
  const fire = (by: Side, cell: number) => {
    const ships = by === "me" ? theirs : mine;
    const before = by === "me" ? myShots : aiShots;
    if (before.some((s) => s.cell === cell)) return;
    const hit = ships.some((s) => s.includes(cell));
    const shots = [...before, { cell, hit }];
    const was = sunkFlags(ships, before);
    const sunk = sunkFlags(ships, shots).findIndex((s, i) => s && !was[i]);
    (by === "me" ? setMyShots : setAiShots)(shots);
    const what = sunk >= 0 ? t.sunk(t.ships[sunk]) : hit ? t.hit : t.miss;
    setEffect({ key: Date.now(), cell, hit, sunk: sunk >= 0, by });
    setToast({ key: Date.now(), text: by === "me" ? what : `${foe} vise ${cellName(cell)} : ${what}`, good: (by === "me") === hit });

    if (shots.filter((s) => s.hit).length === ships.flat().length) {
      setWinner(by);
      setPhase("done");
      const wins = { ...mem.wins, [mem.level]: { me: record.me + (by === "me" ? 1 : 0), ai: record.ai + (by === "ai" ? 1 : 0) } };
      settle({ ...learn(mem, mine.flat(), by === "me" ? shots : myShots), wins });
      return;
    }
    setTurn(by === "me" ? "ai" : "me");
  };

  // The AI takes a moment to aim, like a person would.
  useEffect(() => {
    if (phase !== "playing" || turn !== "ai") return;
    const id = window.setTimeout(() => {
      const sunk = mine.filter((_, i) => sunkFlags(mine, aiShots)[i]);
      fire("ai", aiShot(mem.level, { shots: aiShots, sunk }, Math.random, mem.level === "amiral" ? mem.fleetHeat : undefined));
    }, 800 + Math.random() * 700);
    return () => window.clearTimeout(id);
    // fire reads this render's state, which is exactly the state the AI aims at.
  }, [phase, turn, aiShots]);

  const quit = () => {
    if (window.confirm("Abandonner la partie contre l'IA ?")) setPhase("setup");
  };

  const theirView = theirs.flatMap((cells, type) => (phase === "done" || sunkFlags(theirs, myShots)[type] ? [{ type, cells, sunk: sunkFlags(theirs, myShots)[type] }] : []));
  const myView = mine.map((cells, type) => ({ type, cells, sunk: sunkFlags(mine, aiShots)[type] }));
  const shotAt = new Set(myShots.map((s) => s.cell));
  const theirLeft = LENGTHS.length - sunkFlags(theirs, myShots).filter(Boolean).length;
  const myLeft = LENGTHS.length - sunkFlags(mine, aiShots).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3">
      {phase !== "done" && <Steps steps={STEPS} at={phase === "setup" ? 0 : phase === "placing" ? 1 : 2} />}
      {toast && <p key={toast.key} className={`nv-toast ${toast.good ? "nv-toast--good" : ""}`} role="status">{toast.text}</p>}

      {phase === "setup" && (
        <section className="card flex flex-col gap-4 p-4 animate-fade-up" aria-label="Réglages">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Ton adversaire</p>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Niveau">
              {LEVELS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={mem.level === l.id}
                  onClick={() => settle({ ...mem, level: l.id })}
                  className={`nv-level press ${mem.level === l.id ? "nv-level--on" : ""}`}
                >
                  <span className="text-2xl" aria-hidden="true">{l.emoji}</span>
                  <span className="font-semibold">{l.label}</span>
                  <span className="text-xs text-text-muted">{l.blurb}</span>
                  <span className="text-xs">Toi <b>{mem.wins[l.id].me}</b> · IA <b>{mem.wins[l.id].ai}</b></span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Le thème</p>
            <ThemePicker value={mem.theme} onPick={(theme) => settle({ ...mem, theme })} />
          </div>
          <button type="button" onClick={() => setPhase("placing")} className="btn-brand press self-end rounded-token px-5 py-2 font-semibold">
            Suivant : placer ma flotte →
          </button>
        </section>
      )}

      {phase === "placing" && (
        <section className="flex flex-col gap-3 animate-fade-up" aria-label="Placer la flotte">
          <Placer theme={mem.theme} captain={companion} initial={myFleet ?? undefined} onReady={start} />
          <button type="button" onClick={() => setPhase("setup")} className="chip press self-start text-xs text-text-muted">← Réglages</button>
        </section>
      )}

      {phase === "playing" && (
        <section className="flex flex-col gap-3" aria-label="Bataille contre l'IA">
          <p className={`nv-banner ${turn === "me" ? "nv-banner--turn" : ""}`} aria-live="polite">
            {turn === "me" ? `🎯 À toi ! ${t.fire}` : <>🔭 {foe} vise<span className="nv-dots" /></>}
          </p>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Mer de l'IA · encore <b>{theirLeft}</b> bateau{theirLeft > 1 ? "x" : ""}</span>
            <span>{myShots.filter((s) => s.hit).length} touché{myShots.filter((s) => s.hit).length > 1 ? "s" : ""} / {myShots.length} tirs</span>
          </div>
          <Board
            theme={mem.theme}
            label="Mer de l'IA"
            ships={theirView}
            shots={myShots}
            onCell={(c) => turn === "me" && fire("me", c)}
            canAim={(c) => turn === "me" && !shotAt.has(c)}
            effect={effect?.by === "me" ? effect : null}
            radar={turn === "me"}
          />
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Ta flotte · encore <b>{myLeft}</b> bateau{myLeft > 1 ? "x" : ""}</span>
            <button type="button" onClick={quit} className="chip press text-xs text-text-muted">Abandonner</button>
          </div>
          <Board
            theme={mem.theme}
            label="Ta flotte"
            ships={myView}
            shots={aiShots}
            effect={effect?.by === "ai" ? effect : null}
            shake={effect?.by === "ai" && effect.hit ? effect.key : undefined}
            small
            captain={companion}
          />
        </section>
      )}

      {phase === "done" && (
        <section className="flex flex-col gap-3 animate-fade-up" aria-label="Fin de la partie">
          {winner === "me" && <Confetti />}
          <div className="card flex flex-col items-center gap-2 p-5 text-center">
            <p className="nv-result font-display text-3xl font-bold">{winner === "me" ? "🏆 Victoire !" : `${foe} gagne !`}</p>
            <p className="text-sm text-text-muted">
              {winner === "me" ? `Toute la flotte de l'IA est au fond, en ${myShots.length} tirs.` : `Ta flotte a coulé en ${aiShots.length} tirs… revanche ?`}
            </p>
            <p className="text-sm">Contre {foe} : toi <b>{record.me}</b> · IA <b>{record.ai}</b></p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => setPhase("placing")} className="btn-brand press rounded-token px-5 py-2 font-semibold">🔁 Revanche</button>
              <button type="button" onClick={() => setPhase("setup")} className="chip press text-sm">⚙️ Niveau ou thème</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-text-muted">Mer de l'IA</p>
              <Board theme={mem.theme} label="Mer de l'IA" ships={theirView} shots={myShots} small />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs text-text-muted">Ta flotte</p>
              <Board theme={mem.theme} label="Ta flotte" ships={myView} shots={aiShots} small captain={companion} />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
