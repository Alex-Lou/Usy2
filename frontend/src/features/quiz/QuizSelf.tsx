import { useEffect, useState } from "react";
import { ApiError } from "../../lib/api/client";
import { getSelf, saveSelf, type SelfItem } from "./api";

/** "Toi & moi": answer about yourself, one card at a time (saved at once, changeable later). */
export function QuizSelf({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<SelfItem[] | null>(null);
  const [at, setAt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSelf()
      .then((list) => {
        setItems(list);
        const first = list.findIndex((i) => i.choice === null);
        setAt(first < 0 ? 0 : first);
      })
      .catch(() => setError("Impossible de charger les questions."));
  }, []);

  if (error) return <p className="card p-4 text-sm">{error}</p>;
  if (!items) return <div className="card h-60 animate-pulse" />;

  const done = items.filter((i) => i.choice !== null).length;
  const item = items[at];

  async function pick(choice: number) {
    setError(null);
    try {
      await saveSelf(item.id, choice);
      setItems((list) => list!.map((i) => (i.id === item.id ? { ...i, choice } : i)));
      window.setTimeout(() => setAt((a) => Math.min(items!.length - 1, a + 1)), 250);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Réponse non enregistrée.");
    }
  }

  return (
    <div className="flex flex-col gap-4" data-quiz-self="">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onClose} aria-label="Retour" className="chip press text-sm">←</button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(done / items.length) * 100}%` }} />
        </div>
        <span className="text-sm tabular-nums text-text-muted">{done}/{items.length}</span>
      </div>
      <p className="text-sm text-text-muted">Réponds sur toi : ton binôme devra deviner. Tu peux changer d'avis quand tu veux.</p>
      <div key={item.id} className="qz-slide card p-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Moi</p>
        <h2 className="font-display text-xl font-bold">{item.text}</h2>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2" role="group" aria-label="Ma réponse">
        {item.options.map((o, i) => (
          <button
            key={i}
            type="button"
            onClick={() => void pick(i)}
            aria-pressed={item.choice === i}
            className={"qz-option press rounded-token border-2 px-4 py-3 text-left font-semibold transition " + (item.choice === i ? "qz-right" : "hover:-translate-y-0.5")}
          >
            {o}
          </button>
        ))}
      </div>
      <div className="flex justify-between">
        <button type="button" disabled={at === 0} onClick={() => setAt(at - 1)} className="chip press text-sm disabled:opacity-40">← Précédente</button>
        <button type="button" disabled={at === items.length - 1} onClick={() => setAt(at + 1)} className="chip press text-sm disabled:opacity-40">Suivante →</button>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
