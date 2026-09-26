import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { ShareScore } from "./ShareScore";

const GRID = 15; // cells per side
const SIZE = 360; // logical canvas px
const CELL = SIZE / GRID;
const TICK_MS = 163; // 20% slower than the original 130 ms
const BEST_KEY = "memocat.snake.best";

type Pt = { x: number; y: number };
const eq = (a: Pt, b: Pt) => a.x === b.x && a.y === b.y;

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function heart(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.3);
  ctx.bezierCurveTo(cx + s, cy - s * 0.4, cx + s * 0.4, cy - s, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx - s * 0.4, cy - s, cx - s, cy - s * 0.4, cx, cy + s * 0.3);
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h); // fallback for older webviews (iOS < 16)
  }
  ctx.fill();
}

export function SnakePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snakeRef = useRef<Pt[]>([]);
  const dirRef = useRef<Pt>({ x: 1, y: 0 });
  const nextDirRef = useRef<Pt>({ x: 1, y: 0 });
  const foodRef = useRef<Pt>({ x: 0, y: 0 });
  const scoreRef = useRef(0);

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(readBest);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);

  const placeFood = useCallback(() => {
    let p: Pt;
    do {
      p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (snakeRef.current.some((s) => eq(s, p)));
    foodRef.current = p;
  }, []);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // food as a little heart
    const f = foodRef.current;
    heart(ctx, f.x * CELL + CELL / 2, f.y * CELL + CELL / 2, CELL * 0.42, cssVar("--color-accent-2", "#a855f7"));

    // snake
    const body = cssVar("--color-accent", "#22d3ee");
    const head = cssVar("--color-primary", "#ff3d9a");
    snakeRef.current.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? head : body;
      const pad = 1.5;
      roundRect(ctx, seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 6);
      if (i === 0) {
        // eyes
        ctx.fillStyle = "#fff";
        const ex = seg.x * CELL + CELL / 2;
        const ey = seg.y * CELL + CELL / 2;
        ctx.beginPath();
        ctx.arc(ex - 4 + dirRef.current.x * 3, ey - 3 + dirRef.current.y * 3, 2.2, 0, 7);
        ctx.arc(ex + 4 + dirRef.current.x * 3, ey - 3 + dirRef.current.y * 3, 2.2, 0, 7);
        ctx.fill();
      }
    });
  }, []);

  const endGame = useCallback(() => {
    setRunning(false);
    setOver(true);
    setBest((b) => {
      const nb = Math.max(b, scoreRef.current);
      try {
        localStorage.setItem(BEST_KEY, String(nb));
      } catch {
        /* ignore */
      }
      return nb;
    });
  }, []);

  const tick = useCallback(() => {
    dirRef.current = nextDirRef.current;
    const snake = snakeRef.current;
    // No walls: leaving one side comes back in on the opposite side.
    const head = {
      x: (snake[0].x + dirRef.current.x + GRID) % GRID,
      y: (snake[0].y + dirRef.current.y + GRID) % GRID,
    };

    // Only biting yourself ends the game.
    if (snake.some((s) => eq(s, head))) {
      endGame();
      return;
    }

    const ate = eq(head, foodRef.current);
    const next = [head, ...snake];
    if (ate) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      snakeRef.current = next;
      placeFood();
    } else {
      next.pop();
      snakeRef.current = next;
    }
    draw();
  }, [draw, endGame, placeFood]);

  const start = useCallback(() => {
    const mid = Math.floor(GRID / 2);
    snakeRef.current = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    scoreRef.current = 0;
    setScore(0);
    setOver(false);
    placeFood();
    draw();
    setRunning(true);
  }, [draw, placeFood]);

  const steer = useCallback((dx: number, dy: number) => {
    const cur = dirRef.current;
    if (cur.x + dx === 0 && cur.y + dy === 0) return; // no 180° reverse
    nextDirRef.current = { x: dx, y: dy };
  }, []);

  // game loop
  useEffect(() => {
    if (!running) return;
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [running, tick]);

  // keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, [number, number]> = {
        ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
      };
      const m = map[e.key];
      if (m) {
        e.preventDefault();
        steer(m[0], m[1]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steer]);

  // first paint (empty board)
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="mx-auto max-w-md">
      <header className="mb-4 flex items-center gap-2 animate-fade-up">
        <Link to="/jeux" className="press rounded-full p-1 text-text-muted hover:text-text" aria-label="Retour aux jeux">
          <Icon name="chevronLeft" size={22} />
        </Link>
        <h1 className="font-display text-2xl font-bold">Snake</h1>
      </header>

      <div className="mb-3 flex items-center justify-between">
        <span className="chip">Score : {score}</span>
        <span className="chip flex items-center gap-1">
          <Icon name="trophy" size={14} /> Record : {best}
        </span>
      </div>

      <div className="card relative overflow-hidden p-2">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="mx-auto block aspect-square w-full max-w-[360px] rounded-token bg-surface-2"
        />
        {!running && (
          <div className="absolute inset-0 grid place-items-center bg-surface/70 backdrop-blur-sm">
            <div className="text-center animate-pop">
              {over && <p className="mb-2 font-display text-xl font-bold">Perdu ! Score : {score}</p>}
              <Button onClick={start}>
                <Icon name="gamepad" size={18} />
                {over ? "Rejouer" : "Jouer"}
              </Button>
              {over && <div className="mt-2"><ShareScore text={`🐍 Snake : ${score} points ! Qui fait mieux ?`} /></div>}
            </div>
          </div>
        )}
      </div>

      {/* On-screen controls for mobile */}
      <div className="mx-auto mt-5 grid w-72 max-w-full grid-cols-3 gap-4">
        <span />
        <DPad onPress={() => steer(0, -1)} icon="arrowUp" label="Haut" />
        <span />
        <DPad onPress={() => steer(-1, 0)} icon="chevronLeft" label="Gauche" />
        <DPad onPress={() => steer(0, 1)} icon="arrowDown" label="Bas" />
        <DPad onPress={() => steer(1, 0)} icon="chevronLeft" label="Droite" flip />
      </div>
    </div>
  );
}

function DPad({
  onPress,
  icon,
  label,
  flip,
}: {
  onPress: () => void;
  icon: "arrowUp" | "arrowDown" | "chevronLeft";
  label: string;
  flip?: boolean;
}) {
  return (
    <button
      // Reacts on touch-down (no wait for the finger to lift); keyboard still works via click.
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      onClick={(e) => e.detail === 0 && onPress()}
      aria-label={label}
      className="grid h-20 touch-none select-none place-items-center rounded-2xl border border-border bg-surface-2 press hover:border-primary/60 active:border-primary"
    >
      <Icon name={icon} size={32} className={flip ? "rotate-180" : ""} />
    </button>
  );
}
