/**
 * Brings an element into view and makes it glow briefly (see .mc-flash), e.g.
 * the message or comment a notification points to. False if it isn't on the page.
 */
export function flashElement(id: string): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("mc-flash");
  window.setTimeout(() => el.classList.remove("mc-flash"), 1600);
  return true;
}
