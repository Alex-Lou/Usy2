import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";
import { PageHeader } from "../../components/ui/PageHeader";
import { createGame, deleteGame, LEVELS, levelLabel, listGames, THEMES, themeOf, type Level, type Size, type Summary, type Theme } from "./api";
import { PlayGrid } from "./PlayGrid";

const SIZES: { id: Size; label: string; hint: string }[] = [
  { id: "petite", label: "Petite", hint: "~5 min" },
  { id: "moyenne", label: "Moyenne", hint: "~15 min" },
  { id: "grande", label: "Grande", hint: "~30 min" },
];
const SIZE_LABEL = { petite: "Petite grille", moyenne: "Grille moyenne", grande: "Grande grille" } as const;

function day(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** ✏️ Mots fléchés: the grids (alone or together), and a new one in two taps; ?partie=… opens one. */
export function CrosswordPage() {
  const [params] = useSearchParams();
  const id = Number(params.get("partie")) || null;
  return id ? <PlayGrid key={id} id={id} /> : <Lobby />;
}

function Lobby() {
  const navigate = useNavigate();
  const [size, setSize] = useState<Size>("petite");
  const [shared, setShared] = useState(false);
  const [theme, setTheme] = useState<Theme>("melange");
  const [level, setLevel] = useState<Level>("facile");
  const [busy, setBusy] = useState(false);
  const [games, setGames] = useState<Summary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    listGames()
      .then(setGames)
      .catch(() => setGames([]));
  }, []);
  useEffect(load, [load]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const g = await createGame(size, shared, theme, level);
      navigate(`/jeux/mots-fleches?partie=${g.id}`);
    } catch {
      setError("La grille n'a pas pu être créée.");
      setBusy(false);
    }
  }

  async function remove(g: Summary) {
    if (!window.confirm("Supprimer cette grille ?")) return;
    await deleteGame(g.id).catch(() => {});
    load();
  }

  const open = (games ?? []).filter((g) => !g.finishedAt);
  const finished = (games ?? []).filter((g) => g.finishedAt).slice(0, 8);
  const seg = (on: boolean) => "flex-1 rounded-full px-3 py-2 text-sm font-semibold transition press " + (on ? "seg-on" : "text-text-muted hover:text-text");

  const row = (g: Summary) => (
    <li key={g.id} className="flex items-center gap-3 px-3 py-2.5">
      <Link to={`/jeux/mots-fleches?partie=${g.id}`} className="min-w-0 flex-1 press">
        <p className="truncate font-semibold">
          {themeOf(g.theme).emoji} {SIZE_LABEL[g.size]} · {levelLabel(g.level)} {g.shared ? "· à deux 💞" : ""}
        </p>
        <p className="text-xs text-text-muted">
          {g.mine ? "Lancée par toi" : `Lancée par ${g.ownerName}`} · {g.finishedAt ? `terminée le ${day(g.finishedAt)}` : day(g.updatedAt)}
        </p>
        {!g.finishedAt && (
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-2" aria-label={`${g.progress} % rempli`}>
            <span className="block h-full rounded-full bg-primary" style={{ width: `${g.progress}%` }} />
          </span>
        )}
      </Link>
      {g.mine && (
        <button type="button" onClick={() => remove(g)} aria-label="Supprimer la grille" className="grid h-9 w-9 place-items-center rounded-full text-text-muted press hover:text-danger">
          <Icon name="trash" size={16} />
        </button>
      )}
    </li>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="✏️ Mots fléchés" subtitle="Une nouvelle grille à chaque partie." />

      <section className="card flex flex-col gap-3 p-4">
        <div className="flex gap-1 rounded-full border border-border bg-surface p-1" role="radiogroup" aria-label="Taille">
          {SIZES.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={size === s.id} onClick={() => setSize(s.id)} className={seg(size === s.id)}>
              {s.label} <span className="font-normal opacity-70">{s.hint}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Thème</p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Thème">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={theme === t.id}
                onClick={() => setTheme(t.id)}
                className={"rounded-full border px-3 py-1.5 text-sm font-semibold transition press " + (theme === t.id ? "border-primary bg-primary/15 text-text" : "border-border text-text-muted hover:text-text")}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Niveau</p>
          <div className="flex gap-1 rounded-full border border-border bg-surface p-1" role="radiogroup" aria-label="Niveau">
            {LEVELS.map((l) => (
              <button key={l.id} type="button" role="radio" aria-checked={level === l.id} onClick={() => setLevel(l.id)} className={seg(level === l.id)}>
                {l.label}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-text-muted">{LEVELS.find((l) => l.id === level)?.hint}</p>
        </div>
        <div className="flex gap-1 rounded-full border border-border bg-surface p-1" role="radiogroup" aria-label="Avec qui">
          <button type="button" role="radio" aria-checked={!shared} onClick={() => setShared(false)} className={seg(!shared)}>
            Seul
          </button>
          <button type="button" role="radio" aria-checked={shared} onClick={() => setShared(true)} className={seg(shared)}>
            À deux 💞
          </button>
        </div>
        {shared && <p className="text-center text-xs text-text-muted">La même grille pour vous deux : les lettres de l'autre apparaissent en direct, en couleur.</p>}
        <button type="button" onClick={start} disabled={busy} className="rounded-full btn-brand px-5 py-2.5 font-semibold press disabled:opacity-60">
          {busy ? "Création de la grille…" : "Nouvelle grille"}
        </button>
        {error && <p className="text-center text-sm text-danger">{error}</p>}
      </section>

      {games === null ? (
        <p className="text-center text-sm text-text-muted">Chargement…</p>
      ) : (
        <>
          {open.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-text-muted">En cours</h2>
              <ul className="card divide-y divide-border p-0">{open.map(row)}</ul>
            </section>
          )}
          {finished.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-text-muted">Terminées</h2>
              <ul className="card divide-y divide-border p-0">{finished.map(row)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
