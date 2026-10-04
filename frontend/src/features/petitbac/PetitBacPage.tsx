import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { useOnRefresh } from "../../lib/refresh";
import {
  createGame,
  DEFAULT_CATEGORIES,
  deleteGame,
  listGames,
  MAX_CATEGORIES,
  MAX_CATEGORY_LENGTH,
  MIN_CATEGORIES,
  MODES,
  onPetitBac,
  SUGGESTED_CATEGORIES,
  type Mode,
  type Summary,
} from "./api";
import { PlayGame } from "./PlayGame";

/** The categories of the last game, offered again (this device only). */
const LAST_KEY = "memocat.petitbac.categories";

function lastCategories(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null");
    return Array.isArray(saved) &&
      saved.every((c) => typeof c === "string") &&
      saved.length >= MIN_CATEGORIES
      ? saved
      : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

function rememberCategories(categories: string[]): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(categories));
  } catch {
    // private window: nothing remembered, that's fine
  }
}

const same = (a: string, b: string) =>
  a.localeCompare(b, "fr", { sensitivity: "base" }) === 0;

/** 🎲 Petit Bac: our games, and a new one; ?partie=… opens one. */
export function PetitBacPage() {
  const [params] = useSearchParams();
  const id = Number(params.get("partie")) || null;
  return id ? <PlayGame key={id} id={id} /> : <Lobby />;
}

function statusLabel(g: Summary): string {
  switch (g.status) {
    case "a-toi":
      return "À toi de jouer";
    case "attente":
      return `${g.themName} joue…`;
    case "a-valider":
      return "Réponses à valider";
    case "attente-validation":
      return `${g.themName} valide tes réponses…`;
    default:
      return "Manche suivante ?";
  }
}

function Lobby() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("direct");
  const [categories, setCategories] = useState<string[]>(lastCategories);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<Summary[] | null>(null);

  const load = useCallback(() => {
    listGames()
      .then(setGames)
      .catch(() => setGames([]));
  }, []);
  useEffect(load, [load]);
  useOnRefresh(load);
  useEffect(() => onPetitBac(load), [load]);

  const has = (c: string) => categories.some((x) => same(x, c));
  const full = categories.length >= MAX_CATEGORIES;
  const add = (c: string) => {
    const clean = c.trim().replace(/\s+/g, " ").slice(0, MAX_CATEGORY_LENGTH);
    if (clean.length < 2 || has(clean) || full) return;
    setCategories((cs) => [...cs, clean]);
  };
  const remove = (c: string) =>
    setCategories((cs) => cs.filter((x) => x !== c));

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const g = await createGame(mode, categories);
      rememberCategories(categories);
      navigate(`/jeux/petit-bac?partie=${g.id}`);
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "La partie n'a pas pu être créée.",
      );
      setBusy(false);
    }
  }

  async function removeGame(g: Summary) {
    if (!window.confirm("Supprimer cette partie ?")) return;
    await deleteGame(g.id).catch(() => {});
    load();
  }

  const seg = (on: boolean) =>
    "flex-1 rounded-full px-3 py-2 text-sm font-semibold transition press " +
    (on ? "seg-on" : "text-text-muted hover:text-text");
  const chip =
    "rounded-full border px-3 py-1.5 text-sm font-semibold transition press";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="🎲 Petit Bac"
        subtitle="Une lettre, des catégories : le premier qui crie « Stop ! »…"
      />

      <section className="card flex flex-col gap-3 p-4">
        <div
          className="flex gap-1 rounded-full border border-border bg-surface p-1"
          role="radiogroup"
          aria-label="Mode"
        >
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              onClick={() => setMode(m.id)}
              className={seg(mode === m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-text-muted">
          {MODES.find((m) => m.id === mode)?.hint}
        </p>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Catégories · {categories.length}/{MAX_CATEGORIES}
          </p>
          <ul
            className="flex flex-wrap gap-1.5"
            aria-label="Catégories de la partie"
          >
            {categories.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => remove(c)}
                  aria-label={`Retirer ${c}`}
                  className={
                    chip +
                    " flex items-center gap-1 border-primary bg-primary/15 text-text"
                  }
                >
                  {c}{" "}
                  <span aria-hidden="true" className="text-text-muted">
                    ×
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <details className="group">
            <summary className="cursor-pointer list-none text-sm font-semibold text-primary press">
              <span className="group-open:hidden">+ Ajouter une catégorie</span>
              <span className="hidden group-open:inline">Fermer les idées</span>
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              <div
                className="flex flex-wrap gap-1.5"
                aria-label="Idées de catégories"
              >
                {[...DEFAULT_CATEGORIES, ...SUGGESTED_CATEGORIES]
                  .filter((c) => !has(c))
                  .map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => add(c)}
                      disabled={full}
                      className={
                        chip +
                        " border-border text-text-muted hover:text-text disabled:opacity-40"
                      }
                    >
                      + {c}
                    </button>
                  ))}
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  add(custom);
                  setCustom("");
                }}
              >
                <input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  maxLength={MAX_CATEGORY_LENGTH}
                  placeholder="La vôtre : « un surnom tendre »…"
                  aria-label="Ajouter une catégorie"
                  className="min-w-0 flex-1 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={custom.trim().length < 2 || full}
                  className="rounded-full border border-border px-4 text-sm font-semibold press disabled:opacity-40"
                >
                  Ajouter
                </button>
              </form>
            </div>
          </details>
          {categories.length < MIN_CATEGORIES && (
            <p className="text-center text-xs text-danger">
              Au moins {MIN_CATEGORIES} catégories.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={start}
          disabled={busy || categories.length < MIN_CATEGORIES}
          className="rounded-full btn-brand px-5 py-2.5 font-semibold press disabled:opacity-60"
        >
          {busy ? "Tirage de la lettre…" : "Lancer la partie"}
        </button>
        {error && <p className="text-center text-sm text-danger">{error}</p>}
      </section>

      {games === null ? (
        <p className="text-center text-sm text-text-muted">Chargement…</p>
      ) : (
        games.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-text-muted">
              Nos parties
            </h2>
            <ul className="card divide-y divide-border p-0">
              {games.map((g) => (
                <li key={g.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Link
                    to={`/jeux/petit-bac?partie=${g.id}`}
                    className="min-w-0 flex-1 press"
                  >
                    <p className="truncate font-semibold">
                      {g.mode === "direct" ? "⚡" : "🕰️"} {statusLabel(g)}
                      {(g.status === "a-toi" || g.status === "a-valider") && (
                        <span
                          className="ml-2 inline-block h-2 w-2 rounded-full bg-primary align-middle"
                          aria-hidden="true"
                        />
                      )}
                    </p>
                    <p className="text-xs text-text-muted">
                      Toi {g.myTotal} – {g.theirTotal} {g.themName} · {g.rounds}{" "}
                      manche{g.rounds > 1 ? "s" : ""} · {g.categories}{" "}
                      catégories
                    </p>
                  </Link>
                  {g.mine && (
                    <button
                      type="button"
                      onClick={() => removeGame(g)}
                      aria-label="Supprimer la partie"
                      className="grid h-9 w-9 place-items-center rounded-full text-text-muted press hover:text-danger"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      )}
    </div>
  );
}
