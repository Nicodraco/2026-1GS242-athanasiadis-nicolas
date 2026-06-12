import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getFreshToken } from './auth';
import type { BroadcastState, GameOverMsg } from './types';

type Role = 'player1' | 'player2' | 'spectator';

export interface UseGameSocket {
  state: BroadcastState | null;
  gameOver: GameOverMsg | null;
  role: Role | null;
  error: string | null;
  sendMove: (from: [number, number], to: [number, number]) => Promise<{ ok: boolean; error?: string }>;
}

interface JoinAck {
  ok: boolean;
  error?: string;
  role?: Role;
  state?: BroadcastState;
}

const GAME_URL = (import.meta as any).env?.VITE_GAME_URL ?? 'http://localhost:4002';

export function useGameSocket(gameId: string): UseGameSocket {
  const [state, setState] = useState<BroadcastState | null>(null);
  const [gameOver, setGameOver] = useState<GameOverMsg | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(GAME_URL, { autoConnect: true });
    socketRef.current = socket;

    socket.on('connect', async () => {
      const token = await getFreshToken();
      socket.emit('join_game', { gameId, token }, (ack: JoinAck) => {
        if (!ack?.ok) { setError(ack?.error || 'No se pudo unir a la partida'); return; }
        if (ack.role) setRole(ack.role);
        if (ack.state) setState(ack.state);
      });
    });
    socket.on('game_state', (s: BroadcastState) => setState(s));
    socket.on('game_over', (o: GameOverMsg) => setGameOver(o));
    socket.on('connect_error', (e: Error) => setError(e.message));

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [gameId]);

  const sendMove = async (from: [number, number], to: [number, number]) => {
    const token = await getFreshToken();
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const s = socketRef.current;
      if (!s) { resolve({ ok: false, error: 'Sin conexion' }); return; }
      s.emit('move', { gameId, from, to, token }, (ack: { ok: boolean; error?: string }) =>
        resolve(ack ?? { ok: false, error: 'sin respuesta' })
      );
    });
  };

  return { state, gameOver, role, error, sendMove };
}
