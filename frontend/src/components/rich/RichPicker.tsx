import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../ui/Icon";
import { EMOJI_GROUPS } from "./emojiData";
import { STICKERS, stickerToken, type StickerKind } from "./stickers";

type Tab = "emoji" | StickerKind;

const TABS: { id: Tab; label: string }[] = [
  { id: "emoji", label: "Emojis" },
  { id: "sticker", label: "Stickers" },
  { id: "animated", label: "Animés" },
];

// Sheet height, published as --picker-h while open so pages keep the text box
// visible right above it (see AppLayout and ChatPage).
const SHEET_H = "calc(min(20rem, 45dvh) + env(safe-area-inset-bottom, 0px))";

const RECENT = "recent";
const RECENT_KEY = "memocat.recentEmojis";
const RECENT_MAX = 24;

function readRecents(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function saveRecents(list: string[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* per-device convenience only */
  }
}

/**
 * Emoji / sticker / animated-sticker picker, shown as a bottom sheet that takes
 * the place of the phone keyboard (centred, full width on phones, aligned with
 * the content column on desktop) while the text box stays visible just above.
 * Emojis are inserted at the caret (the sheet stays open for several picks); a
 * sticker is sent right away, like in messengers. Without `onSticker`, only the
 * emoji tab is shown.
 */
export function RichPicker({ onEmoji, onSticker }: { onEmoji: (emoji: string) => void; onSticker?: (token: string) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("emoji");
  const [recents, setRecents] = useState<string[]>(readRecents);
  const [group, setGroup] = useState<string>(() => (readRecents().length > 0 ? RECENT : EMOJI_GROUPS[0].id));
  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target) && !sheetRef.current?.contains(target)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Make room for the sheet before the first paint (no jump), then bring the
  // text box just above it if it would be hidden.
  useLayoutEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.style.setProperty("--picker-h", SHEET_H);
    const anchor = rootRef.current?.closest("form") ?? rootRef.current;
    // offsetHeight, not the rect: the sheet is still mid slide-up animation here.
    const sheetTop = window.innerHeight - (sheetRef.current?.offsetHeight ?? 0);
    const rect = anchor?.getBoundingClientRect();
    if (rect && rect.bottom > sheetTop - 8) window.scrollBy({ top: rect.bottom - sheetTop + 12 });
    return () => {
      root.style.removeProperty("--picker-h");
    };
  }, [open]);

  function toggle() {
    // The sheet replaces the phone keyboard: close it instead of stacking both.
    if (!open && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setOpen((o) => !o);
  }

  function pickEmoji(emoji: string) {
    onEmoji(emoji);
    const next = [emoji, ...recents.filter((e) => e !== emoji)].slice(0, RECENT_MAX);
    setRecents(next);
    saveRecents(next);
  }

  function pickSticker(id: string) {
    onSticker?.(stickerToken(id));
    setOpen(false);
  }

  const emojis = group === RECENT ? recents : EMOJI_GROUPS.find((g) => g.id === group)?.emojis ?? [];
  const groupBtn = (id: string, icon: string, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setGroup(id)}
      aria-label={label}
      title={label}
      className={"mc-emoji grid h-8 w-8 shrink-0 place-items-center rounded-token-sm text-lg transition press " + (group === id ? "bg-primary/15" : "opacity-70 hover:opacity-100")}
    >
      {icon}
    </button>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Emojis et stickers"
        aria-expanded={open}
        className="grid h-10 w-10 place-items-center rounded-full text-text-muted transition press hover:text-primary"
      >
        <Icon name="smile" size={20} />
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-x-0 bottom-0 z-50 lg:left-64">
            <div
              ref={sheetRef}
              role="dialog"
              aria-label="Emojis et stickers"
              style={{ height: SHEET_H }}
              className="mx-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-b-0 border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-card animate-sheet-up"
            >
              <span className="mx-auto mb-1 mt-2 h-1 w-10 shrink-0 rounded-full bg-border" aria-hidden="true" />
              {onSticker && (
                <div role="tablist" className="flex border-b border-border text-sm font-semibold">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={tab === t.id}
                      onClick={() => setTab(t.id)}
                      className={"flex-1 py-2 transition " + (tab === t.id ? "text-primary shadow-[inset_0_-2px_0_var(--color-primary)]" : "text-text-muted hover:text-text")}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {tab === "emoji" ? (
                <>
                  <div className="flex gap-0.5 overflow-x-auto border-b border-border px-1 py-1 no-scrollbar">
                    {groupBtn(RECENT, "🕘", "Récents")}
                    {EMOJI_GROUPS.map((g) => groupBtn(g.id, g.icon, g.label))}
                  </div>
                  <div className="grid flex-1 auto-rows-[2.5rem] grid-cols-8 content-start sm:grid-cols-10 lg:grid-cols-12 overflow-y-auto p-1">
                    {emojis.length === 0 ? (
                      <p className="col-span-full p-4 text-center text-sm text-text-muted">Tes emojis récents apparaîtront ici 💫</p>
                    ) : (
                      emojis.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => pickEmoji(e)}
                          aria-label={e}
                          className="mc-emoji grid place-items-center rounded-token-sm text-2xl transition hover:bg-surface-2 press"
                        >
                          {e}
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="grid flex-1 grid-cols-3 content-start gap-2 sm:grid-cols-4 lg:grid-cols-5 overflow-y-auto p-2">
                  {STICKERS.filter((s) => s.kind === tab).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pickSticker(s.id)}
                      title={s.label}
                      aria-label={s.label}
                      className="flex h-24 flex-col items-center justify-center gap-1 rounded-token transition hover:bg-surface-2 press"
                    >
                      <span className="grid h-16 place-items-center overflow-hidden">{s.render(56)}</span>
                      <span className="text-[10px] text-text-muted">{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
