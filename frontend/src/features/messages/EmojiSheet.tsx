import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { EMOJI_GROUPS } from "../../components/rich/emojiData";

/** Every emoji, by family, to react with one that is not in the bar. */
export function EmojiSheet({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  const [group, setGroup] = useState(EMOJI_GROUPS[0].id);
  const emojis = EMOJI_GROUPS.find((g) => g.id === group)?.emojis ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Tous les emojis"
        onClick={(e) => e.stopPropagation()}
        className="msg-sheet flex max-h-[60dvh] w-full max-w-lg flex-col rounded-t-3xl pb-[env(safe-area-inset-bottom,0px)] shadow-lg animate-pop"
      >
        <div className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-border px-3 py-2" role="tablist">
          {EMOJI_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={group === g.id}
              aria-label={g.label}
              title={g.label}
              onClick={() => setGroup(g.id)}
              className={"grid h-9 w-9 shrink-0 place-items-center rounded-full text-xl press " + (group === g.id ? "bg-primary/20" : "opacity-70")}
            >
              {g.icon}
            </button>
          ))}
        </div>
        <div className="grid min-h-0 grid-cols-8 gap-0.5 overflow-y-auto p-2">
          {emojis.map((e) => (
            <button key={e} type="button" onClick={() => onPick(e)} aria-label={`Réagir ${e}`} className="grid aspect-square place-items-center rounded-xl text-[26px] leading-none press hover:bg-surface-2">
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
