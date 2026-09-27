import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "../../../components/ui/Icon";
import { decorUrl } from "./decorAssets";
import { Garden } from "./Garden";
import { buyHouseItem, chooseSurface, type House, type HouseItem, type Scene, type SurfaceSlot } from "./houseApi";
import { Room } from "./Room";

export const SHELVES: { id: string; label: string }[] = [
  { id: "meubles", label: "Meubles" },
  { id: "objets", label: "Objets" },
  { id: "murs", label: "Déco murale" },
  { id: "plantes", label: "Plantes" },
  { id: "lumieres", label: "Lumières" },
  { id: "jouets", label: "Jouets" },
  { id: "musique", label: "Musique" },
  { id: "gourmandises", label: "Gourmandises" },
  { id: "animaux", label: "Animaux" },
  { id: "fete", label: "Fête" },
  { id: "jardin", label: "Jardin" },
  { id: "vehicules", label: "Véhicules" },
  { id: "ciel", label: "Ciel" },
];

const ROOM_SLOTS: { slot: SurfaceSlot; label: string }[] = [
  { slot: "wall", label: "Murs" },
  { slot: "floor", label: "Sols" },
  { slot: "view", label: "Vue par la fenêtre" },
  { slot: "ceiling", label: "Plafond" },
];
const GARDEN_SLOTS: { slot: SurfaceSlot; label: string }[] = [
  { slot: "house", label: "La maison" },
  { slot: "ground", label: "Le sol du jardin" },
];

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * 🏡 The decor shop: objects on shelves (with a search) to buy once and place
 * as often as wanted, and the room's surfaces (one of each kind), each shown
 * in a little preview of the room itself. Bought with the shared purse.
 */
export function HouseShop({ house, scene, night, initialTab = "objects", onChange, onPlace, onClose }: {
  initialTab?: "objects" | "room";
  house: House;
  scene: Scene;
  night: boolean;
  onChange: (h: House) => void;
  onPlace: (itemId: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"objects" | "room">(initialTab);
  const [shelf, setShelf] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const objects = useMemo(() => {
    const q = fold(query.trim());
    return house.items
      .filter((i) => i.slot === "decor" && (!shelf || i.cat === shelf) && (!q || fold(i.label).includes(q)))
      .sort((a, b) => Number(b.owned) - Number(a.owned));
  }, [house.items, shelf, query]);

  async function run(id: string, call: () => Promise<House>) {
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

  const buy = (item: HouseItem) => run(item.id, () => buyHouseItem(item.id));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-fade-up lg:pl-shell" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Décorer la maison"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-b-0 border-border bg-surface pb-[env(safe-area-inset-bottom)] animate-sheet-up"
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <h2 className="font-display text-lg font-bold">Décorer</h2>
          <div className="ml-2 flex rounded-full border border-border p-0.5 text-sm" role="tablist">
            {(["objects", "room"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 press ${tab === t ? "btn-brand" : "text-text-muted"}`}
              >
                {t === "objects" ? "Objets" : scene === "inside" ? "Pièce" : "Dehors"}
              </button>
            ))}
          </div>
          <span className="ml-auto rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold">🪙 {house.coins}</span>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-full text-text-muted press hover:text-text">
            <Icon name="x" size={18} />
          </button>
        </div>
        {error && <p className="px-4 pt-2 text-sm text-danger" role="alert">{error}</p>}

        {tab === "objects" ? (
          <>
            <div className="flex flex-col gap-2 border-b border-border px-4 py-2.5">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Chercher un objet…"
                aria-label="Chercher un objet"
                className="rounded-full border border-border bg-bg-2/60 px-4 py-1.5 text-sm outline-none focus:border-primary/70"
              />
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 no-scrollbar" role="radiogroup" aria-label="Rayon">
                {[{ id: null, label: "Tout" }, ...SHELVES].map((s) => (
                  <button
                    key={s.id ?? "all"}
                    type="button"
                    role="radio"
                    aria-checked={shelf === s.id}
                    onClick={() => setShelf(s.id)}
                    className={`chip shrink-0 press text-xs ${shelf === s.id ? "border-primary text-primary" : ""}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5 overflow-y-auto p-4 sm:grid-cols-4">
              {objects.map((item) => (
                <div key={item.id} className="flex flex-col items-center gap-1 rounded-token border border-border bg-bg-2/40 p-2 text-center">
                  <img src={decorUrl(item.id)} alt="" className="h-14 w-14" loading="lazy" />
                  <span className="line-clamp-2 min-h-[2lh] text-xs font-semibold leading-tight text-text">{item.label}</span>
                  {item.owned ? (
                    <button type="button" onClick={() => onPlace(item.id)} className="chip press mt-auto w-full justify-center text-xs hover:border-primary/50">
                      ＋ Poser
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === item.id || house.coins < item.price}
                      onClick={() => void buy(item)}
                      className="mt-auto w-full rounded-full btn-brand px-2 py-1 text-xs press disabled:opacity-40"
                    >
                      🪙 {item.price}
                    </button>
                  )}
                </div>
              ))}
              {!objects.length && <p className="col-span-full py-6 text-center text-sm text-text-muted">Rien de ce nom-là.</p>}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4 overflow-y-auto p-4">
            {(scene === "inside" ? ROOM_SLOTS : GARDEN_SLOTS).map(({ slot, label }) => {
              const choices = house.items.filter((i) => i.slot === slot);
              const current = choices.find((i) => i.equipped)?.id ?? null;
              return (
                <section key={slot} className="flex flex-col gap-2" aria-label={label}>
                  <h3 className="text-sm font-semibold">{label}</h3>
                  <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 no-scrollbar">
                    <SurfaceCard
                      label="D'origine"
                      preview={scene === "inside" ? <Room night={night} /> : <Garden night={night} />}
                      on={current === null}
                      action={current === null ? null : { text: "Remettre", onClick: () => void run(slot, () => chooseSurface(current, false)) }}
                    />
                    {choices.map((item) => (
                      <SurfaceCard
                        key={item.id}
                        label={item.label.replace(/^Vue : (.)/, (_, c: string) => c.toUpperCase())}
                        preview={scene === "inside" ? <Room night={night} surfaces={{ [slot]: item.id }} /> : <Garden night={night} surfaces={{ [slot]: item.id }} />}
                        on={item.equipped}
                        action={
                          item.equipped ? null
                          : item.owned ? { text: "Choisir", onClick: () => void run(item.id, () => chooseSurface(item.id, true)) }
                          : { text: `🪙 ${item.price}`, buy: true, disabled: busy === item.id || house.coins < item.price, onClick: () => void buy(item) }
                        }
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SurfaceCard({ label, preview, on, action }: {
  label: string;
  preview: ReactNode;
  on: boolean;
  action: { text: string; onClick: () => void; buy?: boolean; disabled?: boolean } | null;
}) {
  return (
    <div className={`flex w-36 shrink-0 flex-col gap-1 rounded-token border p-1.5 ${on ? "border-primary" : "border-border"}`}>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-token-sm">{preview}</div>
      <span className="truncate text-xs font-semibold">{label}</span>
      {on ? (
        <span className="text-center text-xs text-primary">✓ Choisi</span>
      ) : (
        action && (
          <button
            type="button"
            disabled={action.disabled}
            onClick={action.onClick}
            className={`w-full rounded-full px-2 py-1 text-xs press disabled:opacity-40 ${action.buy ? "btn-brand" : "chip justify-center"}`}
          >
            {action.text}
          </button>
        )
      )}
    </div>
  );
}
