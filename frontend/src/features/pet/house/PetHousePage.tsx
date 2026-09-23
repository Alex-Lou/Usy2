import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../../components/ui/Icon";
import { useAuth } from "../../auth/useAuth";
import { CatSprite } from "../CatSprite";
import { MOOD_TEXT, wornItems, type PetAction } from "../types";
import { usePet } from "../usePet";
import { createPetClient } from "./petClient";
import { isNight, Room } from "./Room";
import { ShopSheet } from "./ShopSheet";

type Tool = "brush" | "laser" | null;

const BRUSH_GOAL = 1400; // px of rubbing for one brushing
const LASER_GOAL = 2200; // px of chasing for one play session

const TOOLS: { id: PetAction | "brush" | "laser"; label: string; icon: string }[] = [
  { id: "feed", label: "Manger", icon: "🥣" },
  { id: "brush", label: "Brosse", icon: "🪮" },
  { id: "bath", label: "Bain", icon: "🛁" },
  { id: "laser", label: "Laser", icon: "🔴" },
  { id: "nap", label: "Sieste", icon: "💤" },
  { id: "pet", label: "Câlin", icon: "🤲" },
];

function Gauge({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
      <span aria-hidden="true">{icon}</span>
      <span className="w-14 shrink-0">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${value}%`, backgroundImage: "var(--grad)" }} />
      </span>
    </div>
  );
}

/**
 * The cat's house (Jeux): the same shared cat as in Messages, with more ways
 * to care for it — rub it with the brush, chase the laser, bath, nap in the
 * basket — a purse earned by caring, and a shop of accessories.
 */
export function PetHousePage() {
  const { user } = useAuth();
  const { pet, setPet, pose, caption, act, react, onActivity } = usePet(user?.id);
  const [tool, setTool] = useState<Tool>(null);
  const [shop, setShop] = useState(false);
  const [gain, setGain] = useState<{ n: number; key: number } | null>(null);
  const [progress, setProgress] = useState(0); // brush / laser progress 0..1
  const [dot, setDot] = useState<{ x: number; y: number } | null>(null);
  const [look, setLook] = useState<{ x: number; y: number } | undefined>();
  const [sparkles, setSparkles] = useState<{ x: number; y: number; id: number }[]>([]);
  const [night] = useState(() => isNight());
  const stageRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);
  const travelled = useRef(0);
  const last = useRef<{ x: number; y: number } | null>(null);
  const sparkleId = useRef(0);

  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;
  useEffect(() => {
    const client = createPetClient((a) => onActivityRef.current(a));
    return () => void client.deactivate();
  }, []);

  const care = useCallback(
    async (action: PetAction) => {
      const before = pet?.coins ?? 0;
      const next = await act(action);
      if (next && next.coins > before) setGain({ n: next.coins - before, key: Date.now() });
    },
    [act, pet?.coins],
  );

  function pick(id: (typeof TOOLS)[number]["id"]) {
    travelled.current = 0;
    setProgress(0);
    setDot(null);
    setLook(undefined);
    if (id === "brush" || id === "laser") {
      setTool((t) => (t === id ? null : id));
      return;
    }
    setTool(null);
    void care(id);
  }

  function point(e: PointerEvent<HTMLDivElement>) {
    const box = stageRef.current?.getBoundingClientRect();
    return box ? { x: e.clientX - box.left, y: e.clientY - box.top, w: box.width, h: box.height } : null;
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!tool) return;
    const p = point(e);
    if (!p) return;
    const prev = last.current;
    last.current = { x: p.x, y: p.y };
    const step = prev ? Math.hypot(p.x - prev.x, p.y - prev.y) : 0;

    if (tool === "laser") {
      setDot({ x: p.x, y: p.y });
      const cat = catRef.current?.getBoundingClientRect();
      const stage = stageRef.current?.getBoundingClientRect();
      if (cat && stage) {
        const cx = cat.left - stage.left + cat.width / 2;
        const cy = cat.top - stage.top + cat.height * 0.4;
        const d = Math.hypot(p.x - cx, p.y - cy) || 1;
        setLook({ x: ((p.x - cx) / d) * 3, y: ((p.y - cy) / d) * 2.5 });
      }
      if (step > 12) react("play", 700); // it pounces when the dot moves fast
      advance(step, LASER_GOAL, "laser");
    } else {
      // Brush: only rubbing on the cat counts.
      const cat = catRef.current?.getBoundingClientRect();
      const onCat = cat && e.clientX >= cat.left && e.clientX <= cat.right && e.clientY >= cat.top && e.clientY <= cat.bottom;
      if (!onCat) return;
      react("purr", 900);
      if (step > 4 && Math.random() < 0.35) {
        const id = ++sparkleId.current;
        setSparkles((s) => [...s.slice(-8), { x: p.x, y: p.y, id }]);
        window.setTimeout(() => setSparkles((s) => s.filter((k) => k.id !== id)), 700);
      }
      advance(step, BRUSH_GOAL, "brush");
    }
  }

  function advance(step: number, goal: number, action: PetAction) {
    travelled.current += step;
    if (travelled.current >= goal) {
      travelled.current = 0;
      setProgress(0);
      void care(action);
    } else {
      setProgress(travelled.current / goal);
    }
  }

  if (!pet) {
    return <p className="p-8 text-center text-text-muted">Chargement…</p>;
  }

  const napping = pose === "sleep" && pet.lastAction === "nap";
  const hint =
    tool === "brush" ? `Frotte ${pet.name} avec ton doigt` : tool === "laser" ? "Promène le point rouge dans la pièce" : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <header className="flex items-center gap-2 animate-fade-up">
        <Link to="/jeux" aria-label="Retour aux jeux" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface press hover:border-primary/50">
          <Icon name="chevronLeft" size={18} />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-bold leading-tight">{pet.name}</h1>
          <p className="truncate text-xs text-text-muted">{pose === "sleep" ? "dort" : MOOD_TEXT[pet.mood]}</p>
        </div>
        <span className="relative ml-auto whitespace-nowrap rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold" aria-label={`${pet.coins} pièces`}>
          🪙 {pet.coins}
          {gain && (
            <span key={gain.key} className="pointer-events-none absolute -top-5 right-1 text-xs font-bold text-primary animate-coin-up">
              +{gain.n}
            </span>
          )}
        </span>
        <Link to="/jeux/chat/peche" aria-label="Pêche" className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm press hover:border-primary/50">
          🎣
        </Link>
        <button type="button" onClick={() => setShop(true)} className="rounded-full btn-brand px-3 py-1.5 text-sm press">
          Boutique
        </button>
      </header>

      <div className="card grid grid-cols-2 gap-x-4 gap-y-1.5 px-4 py-3">
        <Gauge icon="🍗" label="Ventre" value={pet.satiety} />
        <Gauge icon="💛" label="Moral" value={pet.happiness} />
        <Gauge icon="🫧" label="Propreté" value={pet.cleanliness} />
        <Gauge icon="⚡" label="Énergie" value={pet.energy} />
      </div>

      <div
        ref={stageRef}
        onPointerMove={onMove}
        onPointerDown={(e) => {
          last.current = null;
          onMove(e);
        }}
        onPointerLeave={() => {
          last.current = null;
          if (tool === "laser") setDot(null);
        }}
        className={"relative aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-token border border-border " + (tool ? "cursor-none" : "")}
      >
        <Room night={night} />
        <div
          ref={catRef}
          className="absolute bottom-[6%] transition-[left] duration-700 ease-out"
          style={{ left: napping ? "61%" : "30%", width: "40%" }}
        >
          <button
            type="button"
            onClick={() => !tool && void care("pet")}
            aria-label={`Toucher ${pet.name}`}
            className="block w-full"
            tabIndex={tool ? -1 : 0}
          >
            <CatSprite pose={pose} fluid wearing={wornItems(pet)} look={tool === "laser" ? look : undefined} />
          </button>
        </div>

        {sparkles.map((s) => (
          <span key={s.id} className="pointer-events-none absolute text-lg animate-sparkle" style={{ left: s.x - 8, top: s.y - 12 }}>
            ✨
          </span>
        ))}
        {tool === "laser" && dot && (
          <span className="pointer-events-none absolute h-3 w-3 rounded-full" style={{ left: dot.x - 6, top: dot.y - 6, background: "#ef4444", boxShadow: "0 0 12px 4px rgba(239,68,68,0.7)" }} />
        )}

        {(hint || caption) && (
          <p role="status" className="absolute inset-x-3 top-3 rounded-full border border-border bg-surface px-3 py-1.5 text-center text-xs font-semibold text-text shadow-card">
            {caption ?? hint}
          </p>
        )}
        {tool && (
          <div className="absolute inset-x-6 bottom-3 h-1.5 overflow-hidden rounded-full bg-black/20" aria-hidden="true">
            <div className="h-full rounded-full transition-[width] duration-150" style={{ width: `${progress * 100}%`, backgroundImage: "var(--grad)" }} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => pick(t.id)}
            aria-pressed={tool === t.id}
            className={
              "flex flex-col items-center gap-0.5 rounded-token border px-1 py-2 text-[11px] font-semibold press " +
              (tool === t.id ? "border-primary bg-surface-2 text-primary" : "border-border bg-surface text-text-muted hover:border-primary/50")
            }
          >
            <span className="text-xl" aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-center text-[11px] text-text-muted">
        {pet.coinsLeftToday > 0
          ? `Chaque soin rapporte des pièces (encore ${pet.coinsLeftToday} aujourd'hui).`
          : `Plus de pièces aujourd'hui, mais ${pet.name} apprécie toujours autant.`}
      </p>

      {shop && <ShopSheet pet={pet} onChange={setPet} onClose={() => setShop(false)} />}
    </div>
  );
}

