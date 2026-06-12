export type Player = 'white' | 'black';
export type Board = string[][];

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  activeSkinId: number | null;
}

export interface AuthState {
  token: string | null;
  user: AuthUser;
}

export interface BroadcastState {
  gameId: string;
  status: 'waiting' | 'active' | 'finished';
  board: Board;
  currentPlayer: Player;
  mustContinueFrom: [number, number] | null;
  player1: { id: string; username: string; color: 'white' };
  player2: { id: string; username: string; color: 'black' } | null;
  isVsAi: boolean;
  moves: { p1: number; p2: number };
  winnerId: string | null;
  winnerUsername: string | null;
}

export interface GameOverMsg {
  gameId: string;
  winnerId: string | null;
  winnerUsername: string | null;
  movesCount: number;
}

export interface Item {
  id: number;
  type: 'skin' | 'consumable';
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  metadata?: any;
  quantity?: number;
}

export interface RankingEntry {
  user_id: string;
  username: string;
  moves_count: number;
  game_id: string | null;
  created_at: string;
}
