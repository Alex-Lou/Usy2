import { useCallback, useRef, useState } from "react";

/**
 * Text state + ref for an input that can receive emojis at the caret position
 * (shared by the comment box and the chat box).
 */
export function useRichInput<T extends HTMLInputElement | HTMLTextAreaElement>() {
  const [text, setText] = useState("");
  const ref = useRef<T>(null);

  const insert = useCallback((value: string) => {
    const el = ref.current;
    setText((current) => {
      const start = el?.selectionStart ?? current.length;
      const end = el?.selectionEnd ?? current.length;
      const next = current.slice(0, start) + value + current.slice(end);
      const caret = start + value.length;
      requestAnimationFrame(() => {
        el?.focus();
        el?.setSelectionRange(caret, caret);
      });
      return next;
    });
  }, []);

  return { text, setText, ref, insert };
}
