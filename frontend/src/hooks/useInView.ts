import { useEffect, useRef, useState } from "react";

/**
 * True while the element is on (or near) the screen. One shared observer for
 * the whole app keeps this cheap even with hundreds of elements.
 */
const listeners = new WeakMap<Element, (visible: boolean) => void>();
let observer: IntersectionObserver | null = null;

function shared(): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;
  observer ??= new IntersectionObserver(
    (entries) => entries.forEach((e) => listeners.get(e.target)?.(e.isIntersecting)),
    { rootMargin: "200px" },
  );
  return observer;
}

export function useInView<T extends Element>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(() => shared() === null); // no support: always "visible"

  useEffect(() => {
    const el = ref.current;
    const obs = shared();
    if (!el || !obs) return;
    listeners.set(el, setVisible);
    obs.observe(el);
    return () => {
      obs.unobserve(el);
      listeners.delete(el);
    };
  }, []);

  return [ref, visible];
}
