import { useEffect, useRef } from "react";

/**
 * Calls `onLoadMore` when the returned sentinel ref scrolls into view.
 * Instagram-like infinite scroll. `enabled` gates further loading
 * (e.g. false while loading or when the last page is reached).
 */
export function useInfiniteScroll<T extends HTMLElement>(
  onLoadMore: () => void,
  enabled: boolean,
) {
  const sentinel = useRef<T | null>(null);
  const cb = useRef(onLoadMore);
  cb.current = onLoadMore;

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !enabled) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) cb.current();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return sentinel;
}
