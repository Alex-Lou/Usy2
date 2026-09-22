export type GameType = "morpion";

export interface GameDto {
  id: number;
  type: string;
  status: "active" | "finished";
  board: (string | null)[]; // 9 cells: "X" | "O" | null
  turnUserId: number | null;
  winnerUserId: number | null;
  draw: boolean;
  x: number | null; // user id playing X
  o: number | null; // user id playing O
  xSpecies: string | null;
  oSpecies: string | null;
}

export interface ScoreDto {
  userId: number;
  displayName: string;
  wins: number;
  draws: number;
  losses: number;
}

export interface GamesState {
  type: string;
  game: GameDto | null;
  scores: ScoreDto[];
}
