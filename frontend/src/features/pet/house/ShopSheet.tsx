import { useState } from "react";
import { Icon } from "../../../components/ui/Icon";
import { buyItem, wearItem } from "../api";
import { CatSprite } from "../CatSprite";
import { wornItems, type Pet, type PetItem } from "../types";

const SLOT_LABEL: Record<PetItem["slot"], string> = { neck: "Cou", head: "Tête", face: "Visage", home: "Maison" };

/**
 * The accessory shop: each item is previewed on the cat itself. Bought with
 * the shared purse; wearing one takes off the other in the same slot.
 */
export function ShopSheet({ pet, onChange, onClose }: { pet: Pet; onChange: (p: Pet) => void; onClose: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const worn = wornItems(pet);

  async function run(id: string, call: () => Promise<Pet>) {
    setBusy(id);
    setError(null);
    try {
      onChange(await call());
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Impossible pour le moment.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-fade-up lg:pl-64" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Boutique"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-b-0 border-border bg-surface pb-[env(safe-area-inset-bottom)] animate-sheet-up"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="font-display text-lg font-bold">Boutique</h2>
          <span className="ml-auto rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold">🪙 {pet.coins}</span>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-full text-text-muted press hover:text-text">
            <Icon name="x" size={18} />
          </button>
        </div>
        {error && <p className="px-4 pt-2 text-sm text-danger">{error}</p>}
        <div className="grid grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3">
          {pet.items.map((item) => {
            const preview = [...worn.filter((w) => pet.items.find((i) => i.id === w)?.slot !== item.slot), item.id];
            return (
              <div key={item.id} className="flex flex-col items-center gap-1 rounded-token border border-border bg-bg-2/40 p-2 text-center">
                <CatSprite pose="idle" size={92} wearing={preview} />
                <span className="text-sm font-semibold text-text">{item.label}</span>
                <span className="text-[11px] text-text-muted">{SLOT_LABEL[item.slot]}</span>
                {item.owned ? (
                  <button
                    type="button"
                    disabled={busy === item.id}
                    onClick={() => run(item.id, () => wearItem(item.id, !item.equipped))}
                    className={"chip press mt-1 w-full text-xs " + (item.equipped ? "border-primary text-primary" : "hover:border-primary/50")}
                  >
                    {item.equipped ? "Porté · retirer" : "Mettre"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy === item.id || pet.coins < item.price}
                    onClick={() => run(item.id, () => buyItem(item.id))}
                    className="mt-1 w-full rounded-full btn-brand px-3 py-1 text-xs press disabled:opacity-40"
                  >
                    Acheter · 🪙 {item.price}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
