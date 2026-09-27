import { useEffect, useMemo, useState } from "react";
import { getCards, markCard, type NousCard, type NousTheme } from "./api";
import { CategoryGrid, FilterChip, countBy } from "./NousCategories";
import { colorOf } from "./NousGuess";

/**
 * 💬 Cards to talk about: a category, then one card at a time with « Suivante »,
 * « ❤️ Garder » (mine) and « On en a parlé » (ours). The kept ones stay a tap away.
 */
export function TalkMode({ themes, theme, onTheme }: {
  themes: NousTheme[];
  theme: string | null;
  onTheme: (t: string | null) => void;
}) {
  const [cards, setCards] = useState<NousCard[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [kept, setKept] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    getCards()
      .then((all) => {
        const talk = all.filter((c) => c.kind === "p");
        for (let i = talk.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [talk[i], talk[j]] = [talk[j], talk[i]];
        }
        setCards(talk);
      })
      .catch(() => setFailed(true));
  }, []);

  const shown = useMemo(() => (cards ?? []).filter((c) => (theme === "all" || c.theme === theme) && (!kept || c.fav)), [cards, theme, kept]);
  const card = shown.length ? shown[index % shown.length] : undefined;

  if (failed) return <p className="card p-4 text-sm">Les cartes ne répondent pas.</p>;
  if (!cards) return <div className="card h-72 animate-pulse" />;

  if (!theme) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-muted">Des questions juste pour en parler à deux, sans rien à deviner.</p>
        <CategoryGrid themes={themes} counts={countBy(cards)} unit={(n) => `${n} carte${n > 1 ? "s" : ""}`} onPick={(t) => { setIndex(0); onTheme(t); }} />
      </div>
    );
  }

  // Optimistic, rolled back if the server says no.
  const toggle = (c: NousCard, kind: "fav" | "talked") => {
    const on = !c[kind];
    const set = (v: boolean) => setCards((cs) => cs?.map((x) => (x.id === c.id ? { ...x, [kind]: v } : x)) ?? null);
    set(on);
    markCard(c.id, kind, on).catch(() => set(!on));
  };

  const t = card ? themes.find((x) => x.id === card.theme) : undefined;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <FilterChip on={!kept} onClick={() => { setKept(false); setIndex(0); }}>Toutes <span className="ml-1 opacity-80">{(cards ?? []).filter((c) => theme === "all" || c.theme === theme).length}</span></FilterChip>
        <FilterChip on={kept} onClick={() => { setKept(true); setIndex(0); }}>❤️ Gardées <span className="ml-1 opacity-80">{(cards ?? []).filter((c) => (theme === "all" || c.theme === theme) && c.fav).length}</span></FilterChip>
      </div>
      {!card ? (
        <p className="card p-6 text-center text-sm text-text-muted">{kept ? "Pas encore de carte gardée : touche ❤️ sur une carte." : "Aucune carte ici."}</p>
      ) : (
        <article key={card.id} className="nd-card card flex min-h-64 flex-col justify-between gap-5 p-6" style={{ ["--nd" as string]: colorOf(themes, card.theme) }} data-nous-card={card.id}>
          <span className="nd-pill self-start rounded-full px-2.5 py-0.5 text-xs font-semibold text-white">{t?.emoji} {t?.label}</span>
          <p className="font-display text-2xl font-bold leading-snug">{card.text}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => toggle(card, "fav")} aria-pressed={card.fav} className="chip press text-sm">{card.fav ? "❤️ Gardée" : "🤍 Garder"}</button>
            <button type="button" onClick={() => toggle(card, "talked")} aria-pressed={card.talked} className={"chip press text-sm " + (card.talked ? "font-semibold" : "text-text-muted")}>
              {card.talked ? "✅ On en a parlé" : "On en a parlé ?"}
            </button>
            <span className="ml-auto text-xs tabular-nums text-text-muted">{(index % shown.length) + 1} / {shown.length}</span>
            <button type="button" onClick={() => setIndex((i) => i + 1)} className="btn-brand press rounded-token px-4 py-1.5 font-semibold">Suivante →</button>
          </div>
        </article>
      )}
    </div>
  );
}
