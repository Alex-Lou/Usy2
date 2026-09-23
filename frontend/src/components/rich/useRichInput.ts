import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";

/**
 * Text state + ref for a box that can receive emojis at the caret position
 * (shared by the comment box and the chat box). While the picker is open the
 * box is not focused (the picker replaces the phone keyboard), so the caret is
 * remembered instead of re-focusing — which would pop the keyboard back up.
 */
export function useRichInput<T extends HTMLInputElement | HTMLTextAreaElement>() {
  const [text, setTextState] = useState("");
  const ref = useRef<T>(null);
  const textRef = useRef(text); // latest value, also between quick successive inserts
  const caret = useRef<number | null>(null);

  const setText = useCallback((value: string) => {
    textRef.current = value;
    setTextState(value);
  }, []);

  const insert = useCallback(
    (value: string) => {
      const el = ref.current;
      const current = textRef.current;
      const focused = !!el && document.activeElement === el;
      const start = focused ? el.selectionStart ?? current.length : Math.min(caret.current ?? current.length, current.length);
      const end = focused ? el.selectionEnd ?? start : start;
      const pos = start + value.length;
      caret.current = pos;
      setText(current.slice(0, start) + value + current.slice(end));
      if (focused) requestAnimationFrame(() => el.setSelectionRange(pos, pos));
    },
    [setText],
  );

  // Typing or moving the caret by hand updates the remembered position.
  const rememberCaret = useCallback(() => {
    caret.current = ref.current?.selectionStart ?? null;
  }, []);

  return { text, setText, ref, insert, rememberCaret };
}

/** Grows a textarea with its content, up to `maxPx` (then it scrolls). */
export function useAutoGrow(ref: RefObject<HTMLTextAreaElement>, text: string, maxPx = 132): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxPx)}px`;
  }, [text, ref, maxPx]);
}

// On phones Enter adds a line (the send button sends); with a keyboard, Enter sends.
const touchFirst = typeof window !== "undefined" && !!window.matchMedia?.("(pointer: coarse)").matches;

export function isSendKey(e: KeyboardEvent<HTMLTextAreaElement>): boolean {
  return e.key === "Enter" && !e.shiftKey && !touchFirst && !e.nativeEvent.isComposing;
}
