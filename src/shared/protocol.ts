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

/** Stängningskod när rummet inte finns. */
export const CLOSE_GONE = 4004;
/** Stängningskod när anslutningen nekas (fullt eller redan startat). */
export const CLOSE_DENIED = 4003;

export const MAX_NAME = 16;

/** Kontrollerar formen på ett meddelande från klienten. */
export function parseClientMsg(raw: unknown): ClientMsg | null {
  if (typeof raw !== 'string') return null;
  let m: unknown;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof m !== 'object' || m === null) return null;
  const o = m as Record<string, unknown>;
  switch (o.type) {
    case 'join':
      if (typeof o.name !== 'string') return null;
      if (o.token !== undefined && typeof o.token !== 'string') return null;
      return { type: 'join', name: o.name, token: o.token as string | undefined };
    case 'leave':
    case 'start':
    case 'playAgain':
      return { type: o.type };
    case 'action':
      return 'action' in o ? { type: 'action', action: o.action } : null;
    default:
      return null;
  }
}
