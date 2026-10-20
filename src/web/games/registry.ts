import type { FC } from 'react';
import type { ClientMsg, RoomSnapshot } from '../../shared/protocol';
import { Rules as FishRules } from './finns-i-sjon/Rules';
import { Table as FishTable } from './finns-i-sjon/Table';
import { Rules as LudoRules } from './ludo/Rules';
import { Table as LudoTable } from './ludo/Table';
import { Rules as VTRules } from './vand-tian/Rules';
import { Table as VTTable } from './vand-tian/Table';

export interface TableProps {
  room: RoomSnapshot;
  send(msg: ClientMsg): void;
  isHost: boolean;
  onLeave(): void;
}

export interface WebGame {
  id: string;
  name: string;
  players: string;
  icon: string;
  Table: FC<TableProps>;
  Rules: FC;
}

export const webGames: WebGame[] = [
  { id: 'vand-tian', name: 'Vänd tian', players: '2–5 spelare', icon: '🃏', Table: VTTable, Rules: VTRules },
  { id: 'ludo', name: 'Ludo', players: '2–4 spelare', icon: '🎲', Table: LudoTable, Rules: LudoRules },
  { id: 'finns-i-sjon', name: 'Finns i sjön', players: '2–5 spelare', icon: '🐟', Table: FishTable, Rules: FishRules },
];

export const comingSoon: { name: string; icon: string }[] = [
];

export function webGame(id: string): WebGame | undefined {
  return webGames.find((g) => g.id === id);
}
