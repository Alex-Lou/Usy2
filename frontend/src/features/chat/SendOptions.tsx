import { useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../components/ui/Icon";
import { RichBody } from "../../components/rich/RichBody";
import { BUBBLE_STYLES, SCREEN_EFFECTS, styleClass, type MessageLook, type ScreenEffectId } from "./looks";
import { ScreenEffect } from "./ScreenEffect";

/**
 * "Envoyer avec…": opened by a long press (or right click) on Envoyer. A
 * bubble style and a full-screen effect, with a preview of the message; a
 * touched effect plays once so it can be seen before sending.
 */
export function SendOptions({ text, onSend, onClose }: { text: string; onSend: (look: MessageLook) => void; onClose: () => void }) {
  const [look, setLook] = useState<MessageLook>({ style: null, effect: null });
  const [preview, setPreview] = useState<{ effect: ScreenEffectId; key: number } | null>(null);

  const chip = (on: boolean) =>
    "chip press flex items-center gap-1.5 text-sm " + (on ? "border-primary bg-surface-2 font-semibold text-primary" : "text-text-muted hover:border-primary/50");

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-up" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Envoyer avec…"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="flex max-h-[85dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-3xl border border-b-0 border-border bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-text shadow-card"
      >
        <div className="flex items-center gap-2">
          <h2 className="mr-auto font-semibold">Envoyer avec…</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-9 w-9 place-items-center rounded-full press hover:bg-surface-2">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="flex min-h-20 items-center justify-end rounded-token bg-bg-2/60 p-4" aria-label="Aperçu">
          <div className="max-w-[80%] break-words rounded-token rounded-br-sm btn-brand px-3.5 py-2">
            <span key={look.style ?? "none"} className={styleClass(look.style)}>
              <RichBody text={text || "📎"} />
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2" role="group" aria-label="Bulle">
          <span className="text-sm font-semibold">Bulle</span>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={look.style === null} onClick={() => setLook({ ...look, style: null })} className={chip(look.style === null)}>
              Normale
            </button>
            {BUBBLE_STYLES.map((s) => (
              <button key={s.id} type="button" aria-pressed={look.style === s.id} onClick={() => setLook({ ...look, style: s.id })} className={chip(look.style === s.id)}>
                <span className="mc-emoji">{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2" role="group" aria-label="Écran">
          <span className="text-sm font-semibold">
            Écran <span className="font-normal text-text-muted">— joué chez vous deux</span>
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button type="button" aria-pressed={look.effect === null} onClick={() => setLook({ ...look, effect: null })} className={chip(look.effect === null) + " justify-center"}>
              Aucun
            </button>
            {SCREEN_EFFECTS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={look.effect === f.id}
                onClick={() => {
                  setLook({ ...look, effect: f.id });
                  setPreview({ effect: f.id, key: Date.now() });
                }}
                className={chip(look.effect === f.id) + " justify-center"}
              >
                <span className="mc-emoji">{f.icon}</span> {f.label}
              </button>
            ))}
          </div>
        </div>

        <button type="button" onClick={() => onSend(look)} className="flex items-center justify-center gap-2 rounded-full btn-brand px-4 py-3 font-semibold press">
          <Icon name="send" size={18} /> Envoyer
        </button>
      </div>
      {preview && <ScreenEffect key={preview.key} effect={preview.effect} onDone={() => setPreview(null)} />}
    </div>,
    document.body,
  );
}
