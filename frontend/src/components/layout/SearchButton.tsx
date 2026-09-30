import { Link, useLocation } from "react-router-dom";
import { Icon } from "../ui/Icon";

/** The magnifier next to the bell: fixed at the top right on phones, or {@code inline} in the desktop top bar. */
export function SearchButton({ inline = false }: { inline?: boolean }) {
  const { pathname } = useLocation();
  const here = pathname === "/recherche";
  return (
    <Link
      to="/recherche"
      aria-label="Rechercher"
      title="Rechercher"
      className={
        "grid h-11 w-11 place-items-center rounded-full glass press " +
        (here ? "text-primary " : "text-text hover:text-primary ") +
        (inline ? "" : "fixed right-[4.25rem] top-[calc(var(--safe-top)+0.75rem)] z-40 lg:hidden")
      }
    >
      <Icon name="search" size={20} />
    </Link>
  );
}
