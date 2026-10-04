import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";
import { ApiError } from "../../lib/api/client";
import { feel } from "../../lib/feel";
import { useOnRefresh } from "../../lib/refresh";
import { useAuth } from "../auth/useAuth";
import { Confetti } from "../games/Confetti";
import { ShareScore } from "../games/ShareScore";
import {
  getGame,
  handIn,
  nextRound,
  onPetitBac,
  ready,
  review,
  saveAnswers,
  type Game,
  type Round,
} from "./api";

const SAVE_MS = 600;
/** How long a round lasts from its start (to know it has just begun): see PetitBacRules. */
const ROUND_MS = { direct: 5 * 60_000, rythme: 3 * 60_000 } as const;
const DRAW_MS = 900;
const LETTERS = "ABCDEFGHIJLMNOPRSTUV";

/** Rounds whose points were already revealed on this device (the reveal plays once). */
const SEEN_KEY = "memocat.petitbac.seen";

function seen(gameId: number, round: number): boolean {
  try {
    const all: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(all) && all.includes(`${gameId}:${round}`);
  } catch {
    return true; // no storage: no reveal rather than one at every visit
  }
}

function markSeen(gameId: number, round: number): void {
  try {
    const all: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
    const list = Array.isArray(all)
      ? all.filter((x) => typeof x === "string")
      : [];
    if (!list.includes(`${gameId}:${round}`)) list.push(`${gameId}:${round}`);
    localStorage.setItem(SEEN_KEY, JSON.stringify(list.slice(-50)));
  } catch {
    // private window: nothing remembered
  }
}

function clock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return s >= 60
    ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
    : `${s} s`;
}

/**
 * One Petit Bac game: the current round in its phase (ready, writing, waiting, checking, points)
 * and the rounds before. The server says what is what; this screen keeps only what I am typing.
 */
export function PlayGame({ id }: { id: number }) {
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0); // server clock − this device's clock
  const [busy, setBusy] = useState(false);
  const [, setRevealed] = useState(0); // a round's reveal ended: the totals show it
  const revealed = useCallback(() => setRevealed((k) => k + 1), []);

  const show = useCallback((g: Game) => {
    setGame(g);
    setOffset(Date.parse(g.now) - Date.now());
    setError(null);
  }, []);
  const load = useCallback(() => {
    getGame(id)
      .then(show)
      .catch(() => setError("Cette partie n'a pas pu s'ouvrir."));
  }, [id, show]);
  useEffect(load, [load]);
  useOnRefresh(load);
  useEffect(
    () => onPetitBac((p) => p.gameId === id && p.by !== user?.id && load()),
    [id, user?.id, load],
  );

  const act = useCallback(
    async (call: () => Promise<Game>) => {
      setBusy(true);
      try {
        show(await call());
      } catch (e) {
        if (e instanceof ApiError && e.message) setError(e.message);
        load();
      } finally {
        setBusy(false);
      }
    },
    [show, load],
  );

  if (error && !game) {
    return (
      <div className="card p-6 text-center">
        <p className="text-danger">{error}</p>
        <Link
          to="/jeux/petit-bac"
          className="mt-3 inline-block text-primary underline-offset-2 hover:underline"
        >
          Retour aux parties
        </Link>
      </div>
    );
  }
  if (!game)
    return <p className="p-8 text-center text-text-muted">Chargement…</p>;

  const round = game.rounds[game.rounds.length - 1];
  const past = game.rounds.slice(0, -1).reverse();
  // While this round's points are being revealed, the totals wait for the end of it.
  const hold = round.phase === "fini" && !seen(game.id, round.number);
  const myTotal = game.myTotal - (hold ? (round.myScore ?? 0) : 0);
  const theirTotal = game.theirTotal - (hold ? (round.theirScore ?? 0) : 0);

  return (
    <div className="flex flex-col gap-3" data-no-pull>
      <header className="flex items-center gap-2">
        <Link
          to="/jeux/petit-bac"
          aria-label="Retour aux parties"
          className="grid h-9 w-9 place-items-center rounded-full text-text-muted press hover:text-text"
        >
          <Icon name="chevronLeft" size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-bold leading-tight">
            🎲 Petit Bac
          </h1>
          <p className="truncate text-xs text-text-muted">
            Manche {round.number} ·{" "}
            {game.mode === "direct" ? "en direct ⚡" : "à son rythme 🕰️"} ·{" "}
            {game.categories.length} catégories
          </p>
        </div>
        <p
          className="shrink-0 text-right text-sm font-semibold tabular-nums"
          aria-label={`Toi ${myTotal} points, ${game.themName} ${theirTotal} points`}
        >
          Toi {myTotal} <span className="text-text-muted">–</span> {theirTotal}{" "}
          {game.themName}
        </p>
      </header>

      {error && <p className="text-center text-sm text-danger">{error}</p>}

      <RoundView
        key={round.number}
        game={game}
        round={round}
        offset={offset}
        busy={busy}
        act={act}
        reload={load}
        onRevealed={revealed}
      />

      {past.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-text-muted">
            Manches précédentes
          </h2>
          <ul className="card divide-y divide-border p-0">
            {past.map((r) => (
              <li key={r.number}>
                <details className="px-3 py-2.5">
                  <summary className="flex cursor-pointer items-center gap-3 press">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 font-display font-bold">
                      {r.letter}
                    </span>
                    <span className="flex-1 text-sm">Manche {r.number}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {r.myScore ?? 0} – {r.theirScore ?? 0}
                    </span>
                  </summary>
                  <Sheet game={game} round={r} />
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

interface RoundProps {
  game: Game;
  round: Round;
  offset: number;
  busy: boolean;
  act: (call: () => Promise<Game>) => Promise<void>;
  reload: () => void;
  onRevealed: () => void;
}

/** The time left until `deadline`, ticking (server clock). */
function useCountdown(deadline: string | null, offset: number): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [deadline]);
  return deadline ? Date.parse(deadline) - (now + offset) : null;
}

function RoundView({
  game,
  round,
  offset,
  busy,
  act,
  reload,
  onRevealed,
}: RoundProps) {
  const left = useCountdown(round.deadline, offset);
  // Time up while waiting for the other: ask the server where things stand (once).
  const asked = useRef(false);
  useEffect(() => {
    if (
      round.phase === "attente" &&
      left !== null &&
      left <= 0 &&
      !asked.current
    ) {
      asked.current = true;
      reload();
    }
  }, [round.phase, left, reload]);

  switch (round.phase) {
    case "pret":
      return <Ready game={game} round={round} busy={busy} act={act} />;
    case "jeu":
      return (
        <Writing
          game={game}
          round={round}
          left={left}
          act={act}
          reload={reload}
        />
      );
    case "attente":
      return (
        <section className="card flex flex-col gap-3 p-4 text-center">
          <Letter letter={round.letter} />
          <p className="font-semibold">Feuille rendue ✓</p>
          <p className="text-sm text-text-muted">
            {round.themStarted
              ? `${game.themName} écrit… ${round.themFilled}/${game.categories.length}`
              : `${game.themName} n'a pas encore joué cette manche.`}
            {left !== null && left > 0 && ` · encore ${clock(left)}`}
          </p>
          <MyAnswers game={game} round={round} />
        </section>
      );
    case "validation":
      return <Checking game={game} round={round} busy={busy} act={act} />;
    default:
      return (
        <Points
          game={game}
          round={round}
          busy={busy}
          act={act}
          onRevealed={onRevealed}
        />
      );
  }
}

/** The round's letter; `spinning`: letters roll by before it lands (the draw). */
function Letter({
  letter,
  spinning = false,
}: {
  letter: string | null;
  spinning?: boolean;
}) {
  const [rolling, setRolling] = useState("?");
  useEffect(() => {
    if (!spinning) return;
    const t = window.setInterval(
      () => setRolling(LETTERS[Math.floor(Math.random() * LETTERS.length)]),
      70,
    );
    return () => window.clearInterval(t);
  }, [spinning]);
  return (
    <span
      className={
        "mx-auto grid h-20 w-20 shrink-0 place-items-center rounded-full bg-primary/15 font-display text-5xl font-bold " +
        (spinning ? "text-text-muted" : "text-text animate-pop")
      }
      aria-label={
        spinning ? "Tirage de la lettre" : `Lettre ${letter ?? "secrète"}`
      }
    >
      {spinning ? rolling : (letter ?? "?")}
    </span>
  );
}

function Ready({
  game,
  round,
  busy,
  act,
}: Omit<RoundProps, "offset" | "reload" | "onRevealed">) {
  const direct = game.mode === "direct";
  return (
    <section className="card flex flex-col gap-3 p-5 text-center">
      <Letter letter={null} />
      {direct ? (
        <>
          <p className="font-semibold">
            La lettre tombe quand vous êtes prêts tous les deux.
          </p>
          <ul className="flex justify-center gap-3 text-sm">
            <li className={round.meReady ? "text-text" : "text-text-muted"}>
              {round.meReady ? "✓" : "…"} Toi
            </li>
            <li className={round.themReady ? "text-text" : "text-text-muted"}>
              {round.themReady ? "✓" : "…"} {game.themName}
            </li>
          </ul>
          <button
            type="button"
            disabled={busy || round.meReady}
            onClick={() => {
              feel.tap();
              void act(() => ready(game.id, round.number));
            }}
            className="rounded-full btn-brand px-5 py-2.5 font-semibold press disabled:opacity-60"
          >
            {round.meReady ? `On attend ${game.themName}…` : "Je suis prêt·e !"}
          </button>
        </>
      ) : (
        <>
          <p className="font-semibold">3 minutes chrono, dès que tu appuies.</p>
          <p className="text-sm text-text-muted">
            {round.themStarted
              ? `${game.themName} a déjà tiré la lettre.`
              : `${game.themName} n'a pas encore joué.`}{" "}
            Rends ta feuille avant la fin, ou elle part toute seule.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              feel.tap();
              void act(() => ready(game.id, round.number));
            }}
            className="rounded-full btn-brand px-5 py-2.5 font-semibold press disabled:opacity-60"
          >
            Tirer la lettre
          </button>
        </>
      )}
    </section>
  );
}

function Writing({
  game,
  round,
  left,
  act,
  reload,
}: {
  game: Game;
  round: Round;
  left: number | null;
  act: RoundProps["act"];
  reload: () => void;
}) {
  const [answers, setAnswers] = useState<string[]>(round.mine);
  const [saved, setSaved] = useState<"oui" | "en-cours" | "non">("oui");
  const latest = useRef(answers);
  latest.current = answers;
  const timer = useRef<number>();
  const edits = useRef(0); // the save answering the last edit says « Enregistré »
  const handedIn = useRef(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const direct = game.mode === "direct";
  // The round has just begun: the letter is drawn before your eyes.
  const [drawing, setDrawing] = useState(
    () => left !== null && left > ROUND_MS[game.mode] - 2_500,
  );
  useEffect(() => {
    if (!drawing) return;
    const t = window.setTimeout(() => {
      setDrawing(false);
      feel.tap();
      inputs.current[0]?.focus();
    }, DRAW_MS);
    return () => window.clearTimeout(t);
  }, [drawing]);

  const save = useCallback(() => {
    window.clearTimeout(timer.current);
    if (handedIn.current) return;
    const edit = edits.current;
    saveAnswers(game.id, round.number, latest.current)
      .then(() => {
        if (edits.current === edit) setSaved("oui");
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 409) {
          reload(); // time up: the server has the last word
          return;
        }
        setSaved("non");
        timer.current = window.setTimeout(save, 3_000); // the network: try again
      });
  }, [game.id, round.number, reload]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const type = (i: number, v: string) => {
    setAnswers((a) => a.map((x, k) => (k === i ? v : x)));
    setSaved("en-cours");
    edits.current += 1;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(save, SAVE_MS);
  };

  const finish = useCallback(() => {
    if (handedIn.current) return;
    handedIn.current = true;
    window.clearTimeout(timer.current);
    void act(() => handIn(game.id, round.number, latest.current));
  }, [act, game.id, round.number]);

  // The clock ran out: the sheet goes with what is written.
  useEffect(() => {
    if (left !== null && left <= 0) finish();
  }, [left, finish]);

  const urgent = left !== null && left <= 10_000;
  const filled = answers.filter((a) => a.trim()).length;

  return (
    <section className="card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <Letter letter={round.letter} spinning={drawing} />
        <div className="flex-1">
          {left !== null && (
            <p
              className={
                "font-display text-2xl font-bold tabular-nums " +
                (urgent ? "text-danger" : "")
              }
              aria-live="polite"
            >
              {clock(left)}
            </p>
          )}
          {round.stoppedByThem ? (
            <p className="text-sm font-semibold text-danger">
              {game.themName} a crié « Stop ! » Vite !
            </p>
          ) : (
            direct && (
              <p className="text-xs text-text-muted">
                {game.themName} : {round.themFilled}/{game.categories.length}
              </p>
            )
          )}
        </div>
      </div>
      <ol className="flex flex-col gap-2">
        {game.categories.map((c, i) => (
          <li key={c}>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {c}
              </span>
              <input
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                value={answers[i] ?? ""}
                onChange={(e) => type(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const next = inputs.current[i + 1];
                  if (next) next.focus();
                  else e.currentTarget.blur();
                }}
                maxLength={40}
                autoComplete="off"
                autoCapitalize="sentences"
                enterKeyHint={i + 1 < game.categories.length ? "next" : "done"}
                placeholder={drawing ? "…" : `${round.letter ?? ""}…`}
                className="w-full rounded-token border border-border bg-surface-2 px-3 py-2 text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </label>
          </li>
        ))}
      </ol>
      <p
        className={
          "text-center text-xs " +
          (saved === "non" ? "text-danger" : "text-text-muted")
        }
        aria-live="polite"
      >
        {saved === "oui"
          ? "✓ Enregistré"
          : saved === "en-cours"
            ? "Enregistrement…"
            : "Pas enregistré, nouvel essai dans un instant…"}
      </p>
      <button
        type="button"
        onClick={() => {
          feel.tap();
          finish();
        }}
        className="rounded-full btn-brand px-5 py-3 text-lg font-bold press"
      >
        {direct ? "Stop !" : "J'ai fini"}{" "}
        <span className="text-sm font-normal opacity-80">
          ({filled}/{game.categories.length})
        </span>
      </button>
    </section>
  );
}

function MyAnswers({ game, round }: { game: Game; round: Round }) {
  return (
    <ul className="flex flex-col gap-1 text-left text-sm">
      {game.categories.map((c, i) => (
        <li
          key={c}
          className="flex justify-between gap-3 border-b border-border/60 py-1 last:border-0"
        >
          <span className="text-text-muted">{c}</span>
          <span className="truncate font-semibold">{round.mine[i] || "—"}</span>
        </li>
      ))}
    </ul>
  );
}

function Checking({
  game,
  round,
  busy,
  act,
}: Omit<RoundProps, "offset" | "reload" | "onRevealed">) {
  const [refused, setRefused] = useState<Set<number>>(
    () => new Set(round.iRefused),
  );
  const theirs = round.theirs ?? [];
  const onLetter = round.theirsOnLetter ?? [];
  const toggle = (i: number) =>
    setRefused((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  if (round.meValidated) {
    return (
      <section className="card flex flex-col gap-3 p-4 text-center">
        <Letter letter={round.letter} />
        <p className="font-semibold">C'est validé de ton côté ✓</p>
        <p className="text-sm text-text-muted">
          {game.themName} vérifie tes réponses…
        </p>
      </section>
    );
  }
  return (
    <section className="card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <Letter letter={round.letter} />
        <p className="flex-1 text-sm">
          <span className="font-semibold">
            Les réponses de {game.themName}.
          </span>{" "}
          <span className="text-text-muted">Touche celles que tu refuses.</span>
        </p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {game.categories.map((c, i) => {
          const answer = theirs[i] ?? "";
          const counts = onLetter[i];
          const no = refused.has(i);
          return (
            <li
              key={c}
              className="flex items-center gap-2 rounded-token border border-border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-text-muted">
                  {c} · toi : {round.mine[i] || "—"}
                </p>
                <p
                  className={
                    "truncate font-semibold " +
                    (!counts || no ? "text-text-muted line-through" : "")
                  }
                >
                  {answer || "—"}
                </p>
              </div>
              {counts ? (
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-pressed={no}
                  aria-label={
                    no ? `Accepter « ${answer} »` : `Refuser « ${answer} »`
                  }
                  className={
                    "grid h-9 w-9 shrink-0 place-items-center rounded-full border font-bold press " +
                    (no
                      ? "border-danger bg-danger/15 text-danger"
                      : "border-primary bg-primary/15 text-text")
                  }
                >
                  {no ? "✗" : "✓"}
                </button>
              ) : (
                <span className="shrink-0 text-xs text-text-muted">
                  {answer ? "pas la bonne lettre" : "vide"}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          act(() => review(game.id, round.number, [...refused], true))
        }
        className="rounded-full btn-brand px-5 py-2.5 font-semibold press disabled:opacity-60"
      >
        Valider{" "}
        {refused.size > 0
          ? `(${refused.size} refusée${refused.size > 1 ? "s" : ""})`
          : ""}
      </button>
    </section>
  );
}

/** Both sheets side by side with the points (a finished round); `shown`: rows revealed so far. */
function Sheet({
  game,
  round,
  shown,
}: {
  game: Game;
  round: Round;
  shown?: number;
}) {
  const theirs = round.theirs ?? [];
  const hidden = (i: number) => shown !== undefined && i >= shown;
  return (
    <table className="mt-2 w-full table-fixed text-sm">
      <thead>
        <tr className="text-xs text-text-muted">
          <th className="w-1/3 py-1 text-left font-normal">Catégorie</th>
          <th className="py-1 text-left font-normal">Toi</th>
          <th className="py-1 text-left font-normal">{game.themName}</th>
        </tr>
      </thead>
      <tbody>
        {game.categories.map((c, i) =>
          hidden(i) ? (
            <tr
              key={c}
              className="border-t border-border/60 align-top text-text-muted"
            >
              <td className="py-1 pr-2">{c}</td>
              <td className="py-1 pr-2">…</td>
              <td className="py-1">…</td>
            </tr>
          ) : (
            <tr
              key={c}
              className={
                "border-t border-border/60 align-top" +
                (shown !== undefined ? " animate-fade-up" : "")
              }
            >
              <td className="py-1 pr-2 text-text-muted">{c}</td>
              <td className="py-1 pr-2">
                <span
                  className={
                    round.myPoints?.[i]
                      ? "font-semibold"
                      : "text-text-muted line-through"
                  }
                >
                  {round.mine[i] || "—"}
                </span>{" "}
                <span className="text-xs text-primary">
                  {round.myPoints?.[i] ? `+${round.myPoints[i]}` : ""}
                </span>
              </td>
              <td className="py-1">
                <span
                  className={
                    round.theirPoints?.[i]
                      ? "font-semibold"
                      : "text-text-muted line-through"
                  }
                >
                  {theirs[i] || "—"}
                </span>{" "}
                <span className="text-xs text-primary">
                  {round.theirPoints?.[i] ? `+${round.theirPoints[i]}` : ""}
                </span>
              </td>
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}

function Points({
  game,
  round,
  busy,
  act,
  onRevealed,
}: Omit<RoundProps, "offset" | "reload">) {
  const n = game.categories.length;
  // First time on this device: the answers come out one category at a time, the points with them.
  const [shown, setShown] = useState(() =>
    seen(game.id, round.number) ? n : 0,
  );
  const revealing = shown < n;
  useEffect(() => {
    if (!revealing) {
      if (!seen(game.id, round.number)) {
        markSeen(game.id, round.number);
        onRevealed();
      }
      return;
    }
    const t = window.setTimeout(
      () => {
        setShown((k) => k + 1);
        feel.tap();
      },
      shown === 0 ? 400 : 700,
    );
    return () => window.clearTimeout(t);
  }, [revealing, shown, game.id, round.number, onRevealed]);

  const upTo = (points: number[] | null) =>
    (points ?? []).slice(0, shown).reduce((a, b) => a + b, 0);
  const mine = revealing ? upTo(round.myPoints) : (round.myScore ?? 0);
  const theirs = revealing ? upTo(round.theirPoints) : (round.theirScore ?? 0);
  const verdict =
    mine > theirs
      ? "Manche gagnée ! 🏆"
      : mine < theirs
        ? `Manche pour ${game.themName} 👏`
        : "Égalité 🤝";
  const share =
    `🎲 Petit Bac, lettre ${round.letter} : ` +
    (mine > theirs
      ? `manche gagnée ${mine} à ${theirs} contre ${game.themName} 🏆`
      : mine < theirs
        ? `${game.themName} gagne la manche ${theirs} à ${mine} 👏`
        : `égalité ${mine} partout avec ${game.themName} 🤝`) +
    (game.rounds.length > 1
      ? ` · au total ${game.myTotal} – ${game.theirTotal}`
      : "");
  return (
    <section className="card relative flex flex-col gap-3 overflow-hidden p-4">
      {!revealing && mine > theirs && <Confetti />}
      <div className="flex items-center gap-3">
        <Letter letter={round.letter} />
        <div className="flex-1">
          <p className="font-display text-lg font-bold">
            {revealing ? "Les réponses tombent…" : verdict}
          </p>
          <p className="text-sm tabular-nums" aria-live="polite">
            Toi <span className="font-bold">{mine}</span> –{" "}
            <span className="font-bold">{theirs}</span> {game.themName}
          </p>
          {!revealing && (round.theyRefused?.length ?? 0) > 0 && (
            <p className="text-xs text-text-muted">
              {game.themName} a refusé {round.theyRefused!.length} de tes
              réponses.
            </p>
          )}
        </div>
      </div>
      <Sheet game={game} round={round} shown={revealing ? shown : undefined} />
      {revealing ? (
        <button
          type="button"
          onClick={() => setShown(n)}
          className="chip mx-auto press text-sm"
        >
          Tout voir
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => act(() => nextRound(game.id))}
            className="rounded-full btn-brand px-5 py-2.5 font-semibold press disabled:opacity-60"
          >
            Manche suivante
          </button>
          <ShareScore text={share} className="mx-auto" />
        </div>
      )}
    </section>
  );
}
