import { memo, useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../../components/ui/Icon";
import { ShareScore } from "../../games/ShareScore";
import { getPet, playRound } from "../api";
import { CatSprite, type CatPose } from "../CatSprite";
import { wornItems, type Pet } from "../types";
import { isOver, MAX_SCORE, newRound, ROUND_MS, step, type Event, type Kind, type Round } from "./fishing";

const EMOJI: Record<Kind, string> = { fish: "🐟", gold: "🐠", boot: "👢" };
const BEST_KEY = "memocat.fishing.best";

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score: number) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    /* private mode: no record, no harm */
  }
}

// The cat only re-renders when its pose changes, not on every frame.
const Cat = memo(function Cat({ pose, wearing }: { pose: CatPose; wearing: string[] }) {
  return <CatSprite pose={pose} fluid wearing={wearing} />;
});

type Phase = "ready" | "playing" | "over";
interface Pop {
  id: number;
  x: number;
  text: string;
  bad: boolean;
}
interface Result {
  score: number;
  caught: number;
  best: number;
  coins: number | null; // null: not saved
  record: boolean;
}

/**
 * Fishing: catch the falling fish with the cat for 30 s, avoid the old boots.
 * The score feeds the shared cat and earns coins (see PetService.playRound).
 */
export function FishingPage() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [, setFrame] = useState(0);
  const [pose, setPose] = useState<CatPose>("idle");
  const [pops, setPops] = useState<Pop[]>([]);
  const [shake, setShake] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const round = useRef<Round>(newRound());
  const area = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const poseTimer = useRef<number>();
  const popId = useRef(0);

  useEffect(() => {
    getPet().then(setPet).catch(() => {});
  }, []);

  const placeCat = useCallback(() => {
    if (catRef.current) catRef.current.style.left = `${round.current.catX * 100}%`;
  }, []);

  const flashPose = useCallback((p: CatPose, ms: number) => {
    setPose(p);
    window.clearTimeout(poseTimer.current);
    poseTimer.current = window.setTimeout(() => setPose("idle"), ms);
  }, []);

  const onEvents = useCallback(
    (events: Event[]) => {
      for (const e of events) {
        if (e.kind === "miss") continue;
        const bad = e.kind === "boot";
        const id = ++popId.current;
        setPops((list) => [...list.slice(-5), { id, x: e.x, text: bad ? (e.points < 0 ? String(e.points) : "Aïe") : `+${e.points}`, bad }]);
        window.setTimeout(() => setPops((list) => list.filter((p) => p.id !== id)), 700);
        if (bad) {
          flashPose("startle", 600);
          setShake(true);
          window.setTimeout(() => setShake(false), 300);
        } else {
          flashPose("eat", 450);
        }
      }
    },
    [flashPose],
  );

  const finish = useCallback(async () => {
    const r = round.current;
    const score = Math.min(MAX_SCORE, r.score);
    const record = score > readBest();
    if (record) saveBest(score);
    const before = pet?.coins ?? 0;
    setResult({ score, caught: r.caught, best: r.best, coins: null, record });
    setPhase("over");
    try {
      const after = await playRound("fish", score);
      setPet(after);
      setResult((res) => res && { ...res, coins: after.coins - before });
    } catch {
      /* shown as "not saved" */
    }
  }, [pet?.coins]);

  // Game loop: fixed rules in fishing.ts, one render per frame for the drops.
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(50, now - last); // a hidden tab or a hiccup never teleports the fish
      last = now;
      onEvents(step(round.current, dt));
      setFrame((n) => n + 1);
      if (isOver(round.current)) {
        void finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, onEvents, finish]);

  // Arrow keys for computers.
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      const d = e.key === "ArrowLeft" ? -0.06 : e.key === "ArrowRight" ? 0.06 : 0;
      if (!d) return;
      e.preventDefault();
      round.current.catX = Math.min(0.95, Math.max(0.05, round.current.catX + d));
      placeCat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, placeCat]);

  useEffect(() => () => window.clearTimeout(poseTimer.current), []);

  function move(e: PointerEvent<HTMLDivElement>) {
    if (phase !== "playing" || !area.current) return;
    const box = area.current.getBoundingClientRect();
    round.current.catX = Math.min(0.95, Math.max(0.05, (e.clientX - box.left) / box.width));
    placeCat();
  }

  function start() {
    round.current = newRound();
    setPops([]);
    setResult(null);
    setPose("idle");
    setPhase("playing");
    requestAnimationFrame(placeCat);
  }

  const r = round.current;
  const left = Math.max(0, Math.ceil((ROUND_MS - r.elapsed) / 1000));
  const name = pet?.name ?? "le chat";
  const wearing = pet ? wornItems(pet) : [];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <header className="flex items-center gap-2 animate-fade-up">
        <Link to="/jeux/chat" aria-label="Retour à la maison du chat" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface press hover:border-primary/50">
          <Icon name="chevronLeft" size={18} />
        </Link>
        <h1 className="font-display text-xl font-bold">La pêche de {name}</h1>
        {pet && (
          <span className="ml-auto whitespace-nowrap rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold" aria-label={`${pet.coins} pièces`}>
            🪙 {pet.coins}
          </span>
        )}
      </header>

      <div className="flex items-center gap-3 text-sm font-semibold" aria-live="polite">
        <span>🐟 {r.score}</span>
        {r.combo >= 5 && phase === "playing" && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">Combo ×2</span>}
        <span className="ml-auto tabular-nums text-text-muted">{left}s</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${(1 - r.elapsed / ROUND_MS) * 100}%` }} />
      </div>

      <div
        ref={area}
        role="application"
        aria-label="Zone de pêche : glisse le doigt pour déplacer le chat"
        onPointerDown={move}
        onPointerMove={move}
        className={`relative h-[58dvh] max-h-[560px] min-h-[340px] touch-none select-none overflow-hidden rounded-token border border-border bg-gradient-to-b from-sky-300/30 via-sky-500/20 to-blue-700/40 ${shake ? "animate-jolt" : ""}`}
      >
        {r.drops.map((d) => (
          <span
            key={d.id}
            className="pointer-events-none absolute text-3xl leading-none"
            style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%`, transform: `translate(-50%, -50%) rotate(${d.spin}deg)` }}
          >
            {EMOJI[d.kind]}
          </span>
        ))}
        {pops.map((p) => (
          <span key={p.id} className="pointer-events-none absolute bottom-[22%] -translate-x-1/2" style={{ left: `${p.x * 100}%` }}>
            <span className={`block text-lg font-bold animate-coin-up ${p.bad ? "text-danger" : "text-primary"}`}>{p.text}</span>
          </span>
        ))}
        <div ref={catRef} className="pointer-events-none absolute bottom-0 w-[26%] max-w-[150px] -translate-x-1/2" style={{ left: "50%" }}>
          <Cat pose={pose} wearing={wearing} />
        </div>

        {phase !== "playing" && (
          <div className="absolute inset-0 grid place-items-center bg-bg/70 p-6 text-center backdrop-blur-sm">
            {phase === "ready" ? (
              <div className="flex max-w-xs flex-col items-center gap-3">
                <p className="text-4xl">🎣</p>
                <p className="font-semibold">Attrape un max de poissons en 30 secondes pour nourrir {name}.</p>
                <p className="text-sm text-text-muted">Glisse le doigt pour déplacer {name}. 🐠 = 3 points, 5 d'affilée = points doublés. Gare aux 👢 !</p>
                <button type="button" onClick={start} className="btn-brand rounded-full px-6 py-2.5 font-semibold press">
                  C'est parti
                </button>
              </div>
            ) : (
              result && (
                <div className="flex max-w-xs flex-col items-center gap-2">
                  <p className="text-4xl">{result.record ? "🏆" : "🐟"}</p>
                  <p className="font-display text-2xl font-bold">{result.score} points</p>
                  {result.record && <p className="text-sm font-semibold text-primary">Nouveau record !</p>}
                  <p className="text-sm text-text-muted">
                    {result.caught} poisson{result.caught > 1 ? "s" : ""} pour {name} · meilleure série {result.best}
                  </p>
                  <p className="text-sm">
                    {result.coins == null ? "Enregistrement…" : result.coins > 0 ? `+${result.coins} 🪙` : "Plus de pièces à gagner aujourd'hui"}
                  </p>
                  <p className="text-xs text-text-muted">Record : {Math.max(readBest(), result.score)}</p>
                  <ShareScore text={`🎣 La pêche : ${result.score} points, ${result.caught} poisson${result.caught > 1 ? "s" : ""} pour ${name}${result.record ? " · nouveau record 🏆" : ""}`} />
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={start} className="btn-brand rounded-full px-5 py-2 font-semibold press">
                      Rejouer
                    </button>
                    <Link to="/jeux/chat" className="rounded-full border border-border bg-surface px-5 py-2 font-semibold press">
                      Maison
                    </Link>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
