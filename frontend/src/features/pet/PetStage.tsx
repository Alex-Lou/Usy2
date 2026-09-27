import { useState } from "react";
import { renamePet } from "./api";
import type { CatPose } from "./CatSprite";
import { LivingCat } from "./rig/LivingCat";
import { MOOD_TEXT, wornItems, type Pet, type PetAction } from "./types";


const ACTIONS: { id: PetAction; label: string; hint: string; icon: string }[] = [
  { id: "pet", label: "Câlin", hint: "Caresser", icon: "🤲" },
  { id: "feed", label: "Manger", hint: "Donner des croquettes à", icon: "🥣" },
  { id: "play", label: "Jouer", hint: "Lancer la balle à", icon: "🧶" },
];

function Gauge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-text-muted">
      <span className="w-12 shrink-0">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${value}%`, backgroundImage: "var(--grad)" }} />
      </span>
    </div>
  );
}

/**
 * The cat's little stage at the top of Messages: tap it to pet it, or use the
 * buttons. The other person sees the same reaction live, with a short caption.
 */
export function PetStage({
  pet,
  pose,
  caption,
  onAct,
  onRenamed,
}: {
  pet: Pet;
  pose: CatPose;
  caption: string | null;
  onAct: (action: PetAction) => void;
  onRenamed: (pet: Pet) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(pet.name);

  async function saveName() {
    setEditing(false);
    const value = name.trim();
    if (!value || value === pet.name) return setName(pet.name);
    try {
      onRenamed(await renamePet(value));
    } catch {
      setName(pet.name);
    }
  }

  const status = pose === "sleep" ? "dort" : MOOD_TEXT[pet.mood];

  return (
    <section className="card relative flex items-center gap-3 overflow-hidden px-3 py-2 animate-fade-up" aria-label={`${pet.name}, le chat`}>
      <div className="relative shrink-0">
        <LivingCat mode="stage" size={104} pose={pose} wearing={wornItems(pet)} onTap={() => onAct("pet")} label={`Toucher ${pet.name}`} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline gap-1.5">
          {editing ? (
            <input
              autoFocus
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  setName(pet.name);
                  setEditing(false);
                }
              }}
              className="w-28 rounded-token border border-border bg-bg-2/60 px-2 py-0.5 font-display text-base font-bold text-text outline-none focus:border-primary/70"
              aria-label="Nom du chat"
            />
          ) : (
            <button type="button" onClick={() => setEditing(true)} className="truncate font-display text-base font-bold text-text hover:underline" title="Renommer">
              {pet.name}
            </button>
          )}
          <span className="truncate text-xs text-text-muted">{status}</span>
        </div>
        <Gauge label="Ventre" value={pet.satiety} />
        <Gauge label="Moral" value={pet.happiness} />
        <div className="mt-0.5 grid grid-cols-3 gap-1.5">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onAct(a.id)}
              aria-label={`${a.hint} ${pet.name}`}
              className="chip press flex items-center justify-center gap-1 !px-1.5 !py-1 text-xs hover:border-primary/50"
            >
              <span aria-hidden="true">{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {caption && (
        <p role="status" className="absolute inset-x-0 bottom-0 bg-surface-2/95 px-3 py-1 text-center text-[11px] text-text animate-fade-up">
          {caption}
        </p>
      )}
    </section>
  );
}
