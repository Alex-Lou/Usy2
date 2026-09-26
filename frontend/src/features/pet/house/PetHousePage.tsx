import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import type { Kind } from "../../../components/companions/brain";
import { LivingCompanion } from "../../../components/companions/LivingCompanion";
import { Icon } from "../../../components/ui/Icon";
import { useAuth } from "../../auth/useAuth";
import type { CatPose } from "../CatSprite";
import { HOUSE, LivingCat } from "../rig/LivingCat";
import { setSoundEnabled, soundEnabled } from "../rig/sound";
import { MOOD_TEXT, wornItems, type PetAction } from "../types";
import { usePet } from "../usePet";
import { createPetClient } from "./petClient";
import { isNight, Room } from "./Room";
import { ShopSheet } from "./ShopSheet";

// Companions keep Moka company: any of them, several or none, chosen on each device.
const GUESTS: { id: Kind; icon: string; label: string; start: number }[] = [
  { id: "penguin", icon: "🐧", label: "Pingouin", start: 0.2 },
  { id: "wolf", icon: "🐺", label: "Loup", start: 0.55 },
  { id: "cat", icon: "🐱", label: "Chaton", start: 0.8 },
  { id: "otter", icon: "🦦", label: "Loutre", start: 0.35 },
];
const GUESTS_KEY = "memocat.house.guests";
const OLD_GUEST_KEY = "memocat.house.guest"; // one guest at a time, before
const OLD_PENGUIN_KEY = "memocat.house.penguin"; // before that: "0" = hidden
const isKind = (v: unknown): v is Kind => GUESTS.some((g) => g.id === v);
function readGuests(): Kind[] {
  try {
    const saved = localStorage.getItem(GUESTS_KEY);
    if (saved) {
      const list: unknown = JSON.parse(saved);
      return Array.isArray(list) ? list.filter(isKind) : ["penguin"];
    }
    const old = localStorage.getItem(OLD_GUEST_KEY);
    if (old) return isKind(old) ? [old] : [];
    return localStorage.getItem(OLD_PENGUIN_KEY) === "0" ? [] : ["penguin"];
  } catch {
    return ["penguin"];
  }
}
function saveGuests(guests: Kind[]) {
  try {
    localStorage.setItem(GUESTS_KEY, JSON.stringify(guests));
  } catch {
    /* not remembered, still works */
  }
}

type Tool = "brush" | "laser" | null;

const BRUSH_GOAL = 1400; // px of rubbing for one brushing
const LASER_GOAL = 2200; // px of chasing for one play session

const TOOLS: {
  id: PetAction | "brush" | "laser";
  label: string;
  icon: string;
}[] = [
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
  const [guests, setGuests] = useState<Kind[]>(readGuests);
  const [guestMenu, setGuestMenu] = useState(false);
  const guestRef = useRef<HTMLDivElement>(null);

  // The guest menu closes on a touch anywhere else.
  useEffect(() => {
    if (!guestMenu) return;
    const close = (e: globalThis.PointerEvent) => {
      if (!guestRef.current?.contains(e.target as Node)) setGuestMenu(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [guestMenu]);
  const [gain, setGain] = useState<{ n: number; key: number } | null>(null);
  const [progress, setProgress] = useState(0); // brush / laser progress 0..1
  const [dot, setDot] = useState<{ x: number; y: number } | null>(null);
  const [sound, setSound] = useState(soundEnabled);
  const [sparkles, setSparkles] = useState<{ x: number; y: number; id: number }[]>([]);
  const [night] = useState(() => isNight());
  const stageRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<SVGGElement>(null);
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
    if (id === "brush" || id === "laser") {
      setTool((t) => (t === id ? null : id));
      return;
    }
    setTool(null);
    void care(id);
  }

  function point(e: PointerEvent<HTMLDivElement>) {
    const box = stageRef.current?.getBoundingClientRect();
    return box
      ? {
          x: e.clientX - box.left,
          y: e.clientY - box.top,
          w: box.width,
          h: box.height,
        }
      : null;
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!tool) return;
    const p = point(e);
    if (!p) return;
    const prev = last.current;
    last.current = { x: p.x, y: p.y };
    const step = prev ? Math.hypot(p.x - prev.x, p.y - prev.y) : 0;

    if (tool === "laser") {
      setDot({ x: p.x, y: p.y }); // the cat runs after it, stalks and pounces (see rig/brain.ts)
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

  // While the laser dot is out, the cat plays with it (whatever else is going on).
  const box = stageRef.current?.getBoundingClientRect();
  const sceneDot = tool === "laser" && dot && box ? { x: (dot.x / box.width) * HOUSE.width, y: (dot.y / box.height) * HOUSE.height } : null;
  const shownPose: CatPose = sceneDot ? "play" : pose;
  const hint =
    tool === "brush" ? `Frotte ${pet.name} avec ton doigt` : tool === "laser" ? "Promène le point rouge dans la pièce" : null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <header className="relative z-30 flex flex-wrap items-center gap-2 animate-fade-up">
        <Link to="/jeux" aria-label="Retour aux jeux" className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface press hover:border-primary/50">
          <Icon name="chevronLeft" size={18} />
        </Link>
        <div className="min-w-[5rem] flex-1">
          <h1 className="truncate font-display text-xl font-bold leading-tight">{pet.name}</h1>
          <p className="truncate text-xs text-text-muted">{pose === "sleep" ? "dort" : MOOD_TEXT[pet.mood]}</p>
        </div>
        {/* Buttons move to their own line on narrow screens instead of squashing the name. */}
        <div className="ml-auto flex items-center gap-2">
          <span className="relative whitespace-nowrap rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold" aria-label={`${pet.coins} pièces`}>
            🪙 {pet.coins}
            {gain && (
              <span key={gain.key} className="pointer-events-none absolute -top-5 right-1 text-xs font-bold text-primary animate-coin-up">
                +{gain.n}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!sound);
              setSound(!sound);
            }}
            aria-pressed={sound}
            aria-label={sound ? "Couper les sons" : "Activer les sons"}
            className="rounded-full border border-border bg-surface px-2.5 py-1.5 text-sm press hover:border-primary/50"
          >
            {sound ? "🔈" : "🔇"}
          </button>
          <div ref={guestRef} className="relative">
            <button
              type="button"
              onClick={() => setGuestMenu((o) => !o)}
              aria-expanded={guestMenu}
              aria-haspopup="menu"
              aria-label="Compagnons de Moka"
              title="Compagnons de Moka"
              className={
                "whitespace-nowrap rounded-full border px-2.5 py-1.5 press hover:border-primary/50 " +
                (guests.length > 1 ? "text-xs tracking-tighter " : "text-sm ") +
                (guests.length ? "border-primary bg-surface-2" : "border-border bg-surface")
              }
            >
              {guests.length
                ? GUESTS.filter((g) => guests.includes(g.id))
                    .map((g) => g.icon)
                    .join("")
                : "🐾"}
            </button>
            {guestMenu && (
              <div
                role="menu"
                aria-label="Qui vit avec Moka ?"
                className="absolute right-0 top-full z-20 mt-1.5 flex flex-col gap-0.5 rounded-token border border-border bg-surface p-1.5 shadow-card animate-pop"
              >
                <p className="px-2 pb-1 pt-0.5 text-[11px] font-semibold text-text-muted">Qui vit avec Moka ?</p>
                {GUESTS.map((g) => {
                  const on = guests.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={on}
                      onClick={() => {
                        const next = on ? guests.filter((k) => k !== g.id) : GUESTS.filter((x) => x.id === g.id || guests.includes(x.id)).map((x) => x.id);
                        saveGuests(next);
                        setGuests(next);
                      }}
                      className={
                        "flex items-center gap-2 whitespace-nowrap rounded-token-sm px-2.5 py-1.5 text-left text-sm press " +
                        (on ? "bg-surface-2 font-semibold text-primary" : "text-text hover:bg-surface-2")
                      }
                    >
                      <span className="w-4 text-center" aria-hidden="true">
                        {on ? "✓" : ""}
                      </span>
                      <span aria-hidden="true">{g.icon}</span> {g.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <Link to="/jeux/chat/peche" aria-label="Pêche" className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm press hover:border-primary/50">
            🎣
          </Link>
          <button type="button" onClick={() => setShop(true)} className="rounded-full btn-brand px-3 py-1.5 text-sm press">
            Boutique
          </button>
        </div>
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
        <LivingCat
          mode="house"
          pose={shownPose}
          wearing={wornItems(pet)}
          pointer={sceneDot}
          sound={sound}
          catRef={catRef}
          onTap={tool ? undefined : () => void care("pet")}
          label={`Toucher ${pet.name}`}
        />
        {GUESTS.filter((g) => guests.includes(g.id)).map((g) => (
          <LivingCompanion key={g.id} kind={g.id} scene="house" start={g.start} friendRef={catRef} />
        ))}

        {sparkles.map((s) => (
          <span key={s.id} className="pointer-events-none absolute text-lg animate-sparkle" style={{ left: s.x - 8, top: s.y - 12 }}>
            ✨
          </span>
        ))}
        {tool === "laser" && dot && (
          <span
            className="pointer-events-none absolute h-3 w-3 rounded-full"
            style={{
              left: dot.x - 6,
              top: dot.y - 6,
              background: "#ef4444",
              boxShadow: "0 0 12px 4px rgba(239,68,68,0.7)",
            }}
          />
        )}

        {(hint || caption) && (
          <p role="status" className="absolute inset-x-3 top-3 rounded-full border border-border bg-surface px-3 py-1.5 text-center text-xs font-semibold text-text shadow-card">
            {caption ?? hint}
          </p>
        )}
        {tool && (
          <div className="absolute inset-x-6 bottom-3 h-1.5 overflow-hidden rounded-full bg-black/20" aria-hidden="true">
            <div
              className="h-full rounded-full transition-[width] duration-150"
              style={{
                width: `${progress * 100}%`,
                backgroundImage: "var(--grad)",
              }}
            />
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

