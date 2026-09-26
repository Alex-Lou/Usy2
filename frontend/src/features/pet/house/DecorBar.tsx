import type { Placed } from "./houseApi";
import { MAX_S, MIN_S } from "./DecorLayer";
import type { SaveState } from "./useHouseDecor";

const SAVE_TEXT: Record<SaveState, string> = { idle: "", saving: "Enregistrement…", saved: "Enregistré ✓", error: "Pas enregistré" };

/**
 * ✏️ Decorating: add objects, change the room, and for the object picked in
 * the scene, size, turn, mirror, bring forward or back, copy, remove.
 */
export function DecorBar({ selected, count, save, onChange, onOrder, onCopy, onRemove, onObjects, onRoom, roomLabel, onDone }: {
  selected: Placed | null;
  count: number;
  save: SaveState;
  onChange: (patch: Partial<Placed>) => void;
  onOrder: (front: boolean) => void;
  onCopy: () => void;
  onRemove: () => void;
  onObjects: () => void;
  onRoom: () => void;
  roomLabel: string;
  onDone: () => void;
}) {
  const tool = "grid h-10 min-w-10 place-items-center rounded-token border border-border bg-surface px-2 text-sm press hover:border-primary/50 disabled:opacity-40";
  return (
    <div className="card flex flex-col gap-2.5 p-3" aria-label="Décorer">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onObjects} className="rounded-full btn-brand px-4 py-2 text-sm font-semibold press">＋ Objets</button>
        <button type="button" onClick={onRoom} className="chip press text-sm">{roomLabel}</button>
        <span className="text-xs text-text-muted" aria-live="polite">{SAVE_TEXT[save] || `${count} objet${count > 1 ? "s" : ""}`}</span>
        <button type="button" onClick={onDone} className="ml-auto rounded-full border border-primary px-3 py-1.5 text-sm font-semibold text-primary press">✓ Terminé</button>
      </div>
      {selected ? (
        <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Objet choisi">
          <button type="button" className={tool} aria-label="Plus petit" disabled={selected.s <= MIN_S} onClick={() => onChange({ s: Math.max(MIN_S, selected.s / 1.15) })}>－</button>
          <button type="button" className={tool} aria-label="Plus grand" disabled={selected.s >= MAX_S} onClick={() => onChange({ s: Math.min(MAX_S, selected.s * 1.15) })}>＋</button>
          <button type="button" className={tool} aria-label="Tourner à gauche" onClick={() => onChange({ r: Math.max(-180, selected.r - 15) })}>⟲</button>
          <button type="button" className={tool} aria-label="Tourner à droite" onClick={() => onChange({ r: Math.min(180, selected.r + 15) })}>⟳</button>
          <button type="button" className={tool} aria-label="Retourner (miroir)" aria-pressed={selected.f} onClick={() => onChange({ f: !selected.f })}>⇋</button>
          <button type="button" className={tool} aria-label="Mettre devant" onClick={() => onOrder(true)}>⤒ Devant</button>
          <button type="button" className={tool} aria-label="Mettre derrière" onClick={() => onOrder(false)}>⤓ Derrière</button>
          <button type="button" className={tool} aria-label="Dupliquer" onClick={onCopy}>⧉</button>
          <button type="button" className={`${tool} text-danger`} aria-label="Retirer" onClick={onRemove}>🗑</button>
        </div>
      ) : (
        <p className="text-xs text-text-muted">Touche un objet pour le déplacer ; tire sa poignée ⤡ pour l'agrandir et le tourner.</p>
      )}
    </div>
  );
}
