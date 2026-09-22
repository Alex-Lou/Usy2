import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Client } from "@stomp/stompjs";
import { useCompanion } from "../../app/companion";
import { SPECIES, type Species } from "../../app/companion";
import { Animal } from "../../components/ui/animals";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { useAuth } from "../auth/useAuth";
import { getGame, startGame } from "./api";
import { createGameClient, sendMove } from "./gameClient";
import { Confetti } from "./Confetti";
import type { GamesState, ScoreDto } from "./types";

const TYPE = "morpion" as const;

function asSpecies(value: string | null | undefined): Species {
  return value && (SPECIES as readonly string[]).includes(value) ? (value as Species) : "cat";
}

export function MorpionPage() {
  const { user } = useAuth();
  const { companion } = useCompanion();
  const [state, setState] = useState<GamesState | null>(null);
  const [connected, setConnected] = useState(false);
  const [starting, setStarting] = useState(false);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    getGame(TYPE).then(setState).catch(() => {});
  }, []);

  useEffect(() => {
    const client = createGameClient(setState, setConnected);
    clientRef.current = client;
    return () => {
      void client.deactivate();
    };
  }, []);

  const game = state?.game ?? null;
  const scores = state?.scores ?? [];
  const me = user?.id ?? -1;
  const iPlay = game != null && (game.x === me || game.o === me);
  const myTurn = game?.status === "active" && game.turnUserId === me;
  const finished = game?.status === "finished";
  const iWon = finished && game?.winnerUserId === me;

  function nameOf(userId: number | null): string {
    if (userId == null) return "";
    return scores.find((s) => s.userId === userId)?.displayName ?? "Joueur";
  }

  async function newGame() {
    setStarting(true);
    try {
      const s = await startGame(TYPE);
      setState(s); // broadcast also arrives; setState is idempotent enough here
    } catch {
      /* ignore — button stays available */
    } finally {
      setStarting(false);
    }
  }

  function play(cell: number) {
    const client = clientRef.current;
    if (!client || !connected || !myTurn || !game) return;
    if (game.board[cell] != null) return;
    sendMove(client, TYPE, cell, companion);
  }

  return (
    <div className="mx-auto max-w-md">
      <header className="mb-4 flex items-center gap-2 animate-fade-up">
        <Link to="/jeux" className="press rounded-full p-1 text-text-muted hover:text-text" aria-label="Retour aux jeux">
          <Icon name="chevronLeft" size={22} />
        </Link>
        <h1 className="font-display text-2xl font-bold">Morpion</h1>
        <span
          className={`ml-1 inline-block h-2.5 w-2.5 rounded-full ${connected ? "bg-accent shadow-glow" : "bg-text-muted"}`}
          title={connected ? "Connecté" : "Connexion…"}
        />
      </header>

      <Scoreboard scores={scores} game={game} me={me} />

      <div className="relative">
        {iWon && <Confetti />}
        <Banner
          game={game}
          myTurn={myTurn}
          iPlay={iPlay}
          finished={!!finished}
          iWon={!!iWon}
          nameOf={nameOf}
        />

        <div className="card mt-3 grid grid-cols-3 gap-2 p-2">
          {(game?.board ?? Array(9).fill(null)).map((mark, i) => {
            const filled = mark != null;
            const species = mark === "X" ? asSpecies(game?.xSpecies) : asSpecies(game?.oSpecies);
            const clickable = !!game && !filled && myTurn;
            return (
              <button
                key={i}
                onClick={() => play(i)}
                disabled={!clickable}
                className={
                  "grid aspect-square place-items-center rounded-token border transition " +
                  (filled
                    ? mark === "X"
                      ? "border-primary/60 bg-primary/10"
                      : "border-accent/60 bg-accent/10"
                    : clickable
                      ? "cursor-pointer border-border bg-surface-2 hover:border-primary/60 hover:bg-primary/5 press"
                      : "border-border bg-surface-2 opacity-70")
                }
                aria-label={filled ? `Case ${i + 1}, ${mark}` : `Case ${i + 1}, vide`}
              >
                {filled && <Animal species={species} size={56} className="animate-pop" />}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex justify-center">
          {!game || finished ? (
            <Button onClick={newGame} disabled={starting || !connected}>
              <Icon name="sparkles" size={18} />
              {game ? "Rejouer" : "Commencer une partie"}
            </Button>
          ) : !iPlay ? (
            <p className="text-sm text-text-muted">Partie en cours entre deux autres comptes.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Banner({
  game,
  myTurn,
  iPlay,
  finished,
  iWon,
  nameOf,
}: {
  game: GamesState["game"];
  myTurn: boolean;
  iPlay: boolean;
  finished: boolean;
  iWon: boolean;
  nameOf: (id: number | null) => string;
}) {
  let text: string;
  let tone = "border-border bg-surface-2 text-text";

  if (!game) {
    text = "Lance une partie pour jouer à deux 💕";
  } else if (finished) {
    if (game.draw) {
      text = "Match nul ! 🤝";
    } else if (iWon) {
      text = "Gagné ! 🎉";
      tone = "border-accent/60 bg-accent/10 text-text";
    } else {
      text = `${nameOf(game.winnerUserId)} a gagné !`;
    }
  } else if (!iPlay) {
    text = `Au tour de ${nameOf(game.turnUserId)}`;
  } else if (myTurn) {
    text = "À toi de jouer !";
    tone = "border-primary/60 bg-primary/10 text-text";
  } else {
    text = `En attente de ${nameOf(game.turnUserId)}…`;
  }

  return (
    <div className={`rounded-token border px-4 py-2.5 text-center text-sm font-semibold animate-pop ${tone}`}>
      {text}
    </div>
  );
}

function Scoreboard({ scores, game, me }: { scores: ScoreDto[]; game: GamesState["game"]; me: number }) {
  if (scores.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {scores.map((s) => {
        const isTurn = game?.status === "active" && game.turnUserId === s.userId;
        return (
          <div
            key={s.userId}
            className={`card flex items-center justify-between px-3 py-2 ${isTurn ? "ring-2 ring-primary/50" : ""}`}
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1 truncate text-sm font-semibold">
                {s.displayName}
                {s.userId === me && <span className="text-[10px] text-text-muted">(toi)</span>}
              </p>
              <p className="flex items-center gap-1 text-[11px] text-text-muted">
                <Icon name="trophy" size={12} /> {s.wins}V · {s.draws}N · {s.losses}D
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
