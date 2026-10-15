import type { GameResult } from '../games/types';

export type ClientMsg =
  | { type: 'join'; name: string; token?: string }
  | { type: 'leave' }
  | { type: 'start' }
  | { type: 'playAgain' }
  | { type: 'action'; action: unknown };

export interface RoomPlayer {
  id: string;
  name: string;
  connected: boolean;
}

export interface RoomSnapshot {
  code: string;
  gameId: string;
  phase: 'lobby' | 'playing' | 'finished';
  hostId: string;
  players: RoomPlayer[];
  youId: string;
  view: unknown | null;
  result: GameResult | null;
}

export type ServerMsg =
  | { type: 'welcome'; playerId: string; token: string }
  | { type: 'room'; room: RoomSnapshot }
  | { type: 'error'; message: string }
  | { type: 'gone' };

export const MAX_NAME = 16;

/** Validates an untrusted message from a client. */
export function parseClientMsg(raw: unknown): ClientMsg | null {
  if (typeof raw !== 'string') return null;
  let m: unknown;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof m !== 'object' || m === null) return null;
  const x = m as Record<string, unknown>;
  switch (x.type) {
    case 'join':
      if (typeof x.name !== 'string') return null;
      if (x.token !== undefined && typeof x.token !== 'string') return null;
      return { type: 'join', name: x.name, token: x.token as string | undefined };
    case 'leave':
    case 'start':
    case 'playAgain':
      return { type: x.type };
    case 'action':
      return { type: 'action', action: x.action };
    default:
      return null;
  }
}
