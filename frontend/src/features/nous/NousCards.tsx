import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { getCards, markCard, type NousCard, type NousTheme } from "./api";

type Filter = "all" | "fav" | string;
/** Which way the card leaves: pushed left (next), right (favourite), or back. */
type Exit = "left" | "right" | "back";
const SWIPE = 110; // px to count as a swipe (or a flick)

/**
 * 💬 Cards: the question of the day (the same for both of us), then a deck
 * to swipe through by theme (← next, → favourite and next; the buttons do
 * the same), favourites (mine) and "on en a parlé" (ours).
 */
export function CardsTab({ themes, daily, onAnswer }: { themes: NousTheme[]; daily: NousCard | null; onAnswer: () => void }) {
  const [cards, setCards] = useState<NousCard[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [order, setOrder] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    getCards().then(setCards).catch(() => setFailed(true));
  }, []);

  const shown = useMemo(() => {
    if (!cards) return [];
    const list = cards.filter((c) => (filter === "all" ? true : filter === "fav" ? c.fav : c.theme === filter));
    if (!order) return list;
    const rank = new Map(order.map((id, i) => [id, i]));
    return [...list].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  }, [cards, filter, order]);
  const card = shown[Math.min(index, Math.max(0, shown.length - 1))];
  const [exitDir, setExitDir] = useState<Exit>("left");
  // Next (wrapping round, a deck has no end) or back; the card leaves the way it was pushed.
  const step = (by: 1 | -1, dir: Exit) => {
    setExitDir(dir);
    setIndex((i) => (by === 1 ? (shown.length ? (Math.min(i, shown.length - 1) + 1) % shown.length : 0) : Math.max(0, i - 1)));
  };

  const pick = (f: Filter) => {
    setFilter(f);
    setIndex(0);
  };
  const shuffle = () => {
    if (!cards) return;
    const ids = cards.map((c) => c.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setOrder(ids);
    setIndex(0);
  };
  // Optimistic, rolled back if the server says no.
  const toggle = (c: NousCard, kind: "fav" | "talked") => {
    const on = !c[kind];
    const set = (v: boolean) => setCards((cs) => cs?.map((x) => (x.id === c.id ? { ...x, [kind]: v } : x)) ?? null);
    set(on);
    markCard(c.id, kind, on).catch(() => set(!on));
  };

  const theme = (id: string) => themes.find((t) => t.id === id);

  return (
    <div className="flex flex-col gap-4">
      {daily && (
        <section className="nd-daily card relative overflow-hidden p-4 animate-fade-up" aria-label="La question du jour">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-90">✨ La question du jour · la même pour vous deux</p>
          <p className="mt-1 font-display text-lg font-bold leading-snug">{daily.text}</p>
        </section>
      )}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar" role="tablist" aria-label="Thèmes">
        <FilterChip on={filter === "all"} onClick={() => pick("all")}>🎴 Toutes</FilterChip>
        <FilterChip on={filter === "fav"} onClick={() => pick("fav")}>❤️ Favoris</FilterChip>
        {themes.map((t) => (
          <FilterChip key={t.id} on={filter === t.id} color={t.color} onClick={() => pick(t.id)}>
            {t.emoji} {t.label}
          </FilterChip>
        ))}
      </div>

      {failed && <p className="card p-4 text-sm">Les cartes ne répondent pas.</p>}
      {!cards && !failed && <div className="card h-72 animate-pulse" />}
      {cards && !card && <p className="card p-6 text-center text-sm text-text-muted">{filter === "fav" ? "Pas encore de favori : touche ❤️ sur une carte." : "Aucune carte ici."}</p>}

      {card && (
        <>
          <div className="relative">
            <AnimatePresence mode="popLayout" initial={false} custom={exitDir}>
              <SwipeCard
                key={card.id}
                card={card}
                color={theme(card.theme)?.color ?? "#ff6fa8"}
                themeLabel={`${theme(card.theme)?.emoji ?? ""} ${theme(card.theme)?.label ?? ""}`}
                onSwipe={(dir) => {
                  if (dir === "right" && !card.fav) toggle(card, "fav");
                  step(1, dir);
                }}
                onToggle={(kind) => toggle(card, kind)}
                onAnswer={onAnswer}
              />
            </AnimatePresence>
          </div>
          <p className="text-center text-xs text-text-muted" aria-hidden="true">← glisse pour passer · glisse → pour mettre en favori ❤️</p>

          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => step(-1, "back")} disabled={index === 0} className="chip press disabled:opacity-40" aria-label="Carte précédente">←</button>
            <span className="text-sm tabular-nums text-text-muted">{Math.min(index, shown.length - 1) + 1} / {shown.length}</span>
            <button type="button" onClick={shuffle} className="chip press text-sm">🔀 Mélanger</button>
            <button type="button" onClick={() => step(1, "left")} className="btn-brand press rounded-token px-4 py-1.5 font-semibold" aria-label="Carte suivante">→</button>
          </div>
        </>
      )}
    </div>
  );
}

export function FilterChip({ on, color, onClick, children }: { on: boolean; color?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={"chip press shrink-0 text-sm " + (on ? "font-semibold text-white" : "text-text-muted")}
      style={on ? { background: color ?? "var(--nd-accent)", borderColor: color ?? "var(--nd-accent)" } : undefined}
    >
      {children}
    </button>
  );
}

/** One card of the deck, swiped sideways (the page still scrolls up and down over it). */
function SwipeCard({ card, color, themeLabel, onSwipe, onToggle, onAnswer }: {
  card: NousCard;
  color: string;
  themeLabel: string;
  onSwipe: (dir: "left" | "right") => void;
  onToggle: (kind: "fav" | "talked") => void;
  onAnswer: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-12, 12]);
  const favHint = useTransform(x, [30, SWIPE], [0, 1]);
  const nextHint = useTransform(x, [-SWIPE, -30], [1, 0]);
  const end = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE || info.velocity.x > 650) onSwipe("right");
    else if (info.offset.x < -SWIPE || info.velocity.x < -650) onSwipe("left");
  };
  return (
    <motion.article
      className="nd-card nd-card--motion card relative flex min-h-64 cursor-grab flex-col justify-between gap-4 overflow-hidden p-6 active:cursor-grabbing"
      style={{ ["--nd" as string]: color, x, rotate }}
      drag="x"
      dragSnapToOrigin
      dragElastic={0.85}
      onDragEnd={end}
      variants={{
        enter: { opacity: 0, scale: 0.9, y: 24 },
        center: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 28 } },
        exit: (dir: Exit) => ({
          opacity: 0,
          x: dir === "right" ? 420 : dir === "left" ? -420 : 0,
          y: dir === "back" ? 40 : 0,
          rotate: dir === "right" ? 18 : dir === "left" ? -18 : 0,
          transition: { duration: 0.28 },
        }),
      }}
      initial="enter"
      animate="center"
      exit="exit"
      aria-label="Carte"
      data-nous-card={card.id}
    >
      <motion.span className="nd-swipe nd-swipe--fav" style={{ opacity: favHint }} aria-hidden="true">❤️ Favori</motion.span>
      <motion.span className="nd-swipe nd-swipe--next" style={{ opacity: nextHint }} aria-hidden="true">Suivante ➜</motion.span>
      <div className="flex items-center justify-between gap-2 text-xs font-semibold">
        <span className="nd-pill rounded-full px-2.5 py-1 text-white">{themeLabel}</span>
        <span className="text-text-muted">{card.kind === "p" ? "🗣️ À se dire" : "🔮 À deviner aussi"}</span>
      </div>
      <p className="select-none font-display text-2xl font-bold leading-snug">{card.text}</p>
      {card.kind === "c" && (
        <ul className="flex flex-wrap gap-1.5 text-sm text-text-muted" aria-label="Choix">
          {card.options.map((o) => <li key={o} className="rounded-full border border-border px-2.5 py-0.5">{o}</li>)}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <motion.button type="button" whileTap={{ scale: 1.25 }} onClick={() => onToggle("fav")} aria-pressed={card.fav} className="chip press text-sm">
          {card.fav ? "❤️" : "🤍"} Favori
        </motion.button>
        <motion.button type="button" whileTap={{ scale: 1.1 }} onClick={() => onToggle("talked")} aria-pressed={card.talked} className={"chip press text-sm " + (card.talked ? "font-semibold" : "text-text-muted")}>
          {card.talked ? "✅ On en a parlé" : "☐ On en a parlé ?"}
        </motion.button>
        {card.kind !== "p" && (
          card.answered
            ? <span className="text-xs text-text-muted">✓ Tu y as répondu</span>
            : <button type="button" onClick={onAnswer} className="text-sm font-semibold underline">Y répondre →</button>
        )}
      </div>
    </motion.article>
  );
}
