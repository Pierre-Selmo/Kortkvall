import { DurableObject } from 'cloudflare:workers';
import { games } from '../games/registry';
import type { GameResult } from '../games/types';
import {
  CLOSE_DENIED, CLOSE_GONE, MAX_NAME, parseClientMsg,
  type ClientMsg, type RoomSnapshot, type ServerMsg,
} from '../shared/protocol';
import { cryptoRng } from '../shared/rng';
import type { Env } from './index';

export const IDLE_MS = 3_600_000;

interface StoredPlayer {
  id: string;
  name: string;
  token: string;
}

export interface RoomData {
  code: string;
  gameId: string;
  hostId: string;
  players: StoredPlayer[];
  game: unknown | null;
  result: GameResult | null;
}

interface Attachment {
  playerId: string | null;
}

export class Room extends DurableObject<Env> {
  private data: RoomData | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.data = (await ctx.storage.get<RoomData>('room')) ?? null;
    });
  }

  /** Skapar rummet. false om det redan finns. */
  async init(gameId: string, code: string): Promise<boolean> {
    if (this.data) return false;
    this.data = { code, gameId, hostId: '', players: [], game: null, result: null };
    await this.save();
    return true;
  }

  async fetch(req: Request): Promise<Response> {
    if (req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected websocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: null } satisfies Attachment);
    if (!this.data) {
      this.goneAndClose(server);
    } else {
      await this.touch();
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (!this.data) {
      this.goneAndClose(ws);
      return;
    }
    await this.touch();
    const msg = parseClientMsg(raw);
    if (!msg) return this.sendError(ws, 'Ogiltigt meddelande');
    const playerId = (ws.deserializeAttachment() as Attachment | null)?.playerId ?? null;
    if (msg.type === 'join') return this.join(ws, msg);
    if (!playerId || !this.player(playerId)) return this.sendError(ws, 'Gå med först');
    switch (msg.type) {
      case 'leave': return this.leave(ws, playerId);
      case 'start': return this.start(ws, playerId);
      case 'action': return this.action(ws, playerId, msg.action);
      case 'playAgain': return this.playAgain(ws, playerId);
    }
  }

  async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code === 1005 || code === 1006 ? 1000 : code);
    } catch {
      // redan stängd
    }
    this.broadcast(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.broadcast(ws);
  }

  async alarm(): Promise<void> {
    for (const ws of this.ctx.getWebSockets()) this.goneAndClose(ws);
    this.data = null;
    await this.ctx.storage.deleteAll();
  }

  // --- meddelanden ---

  private async join(ws: WebSocket, msg: Extract<ClientMsg, { type: 'join' }>): Promise<void> {
    const d = this.data!;
    const known = msg.token ? d.players.find((p) => p.token === msg.token) : undefined;
    let player = known;
    if (!player) {
      const def = games[d.gameId];
      if (d.game !== null) return this.deny(ws, 'Spelet har redan startat');
      if (d.players.length >= def.maxPlayers) return this.deny(ws, 'Rummet är fullt');
      const base = msg.name.trim().slice(0, MAX_NAME).trim();
      if (!base) return this.sendError(ws, 'Skriv ett namn');
      player = { id: crypto.randomUUID(), name: this.uniqueName(base), token: crypto.randomUUID() };
      d.players.push(player);
      if (!d.hostId) d.hostId = player.id;
      await this.save();
    }
    ws.serializeAttachment({ playerId: player.id } satisfies Attachment);
    this.send(ws, { type: 'welcome', playerId: player.id, token: player.token });
    this.broadcast();
  }

  private async leave(ws: WebSocket, playerId: string): Promise<void> {
    const d = this.data!;
    if (d.game !== null) return this.sendError(ws, 'Du kan inte lämna under spelet');
    d.players = d.players.filter((p) => p.id !== playerId);
    if (d.hostId === playerId) d.hostId = d.players[0]?.id ?? '';
    await this.save();
    for (const s of this.socketsOf(playerId)) {
      s.serializeAttachment({ playerId: null } satisfies Attachment);
      s.close(1000, 'Lämnade');
    }
    this.broadcast();
  }

  private async start(ws: WebSocket, playerId: string): Promise<void> {
    const d = this.data!;
    const def = games[d.gameId];
    if (d.hostId !== playerId) return this.sendError(ws, 'Bara värden kan starta');
    if (d.game !== null) return this.sendError(ws, 'Spelet har redan startat');
    if (d.players.length < def.minPlayers || d.players.length > def.maxPlayers) {
      return this.sendError(ws, `Det behövs ${def.minPlayers}–${def.maxPlayers} spelare`);
    }
    d.game = def.setup(d.players.map((p) => p.id), cryptoRng);
    d.result = null;
    await this.save();
    this.broadcast();
  }

  private async action(ws: WebSocket, playerId: string, action: unknown): Promise<void> {
    const d = this.data!;
    if (d.game === null || d.result !== null) return this.sendError(ws, 'Spelet pågår inte');
    const def = games[d.gameId];
    const res = def.applyAction(d.game, playerId, action, cryptoRng);
    if (!res.ok) return this.sendError(ws, res.error);
    d.game = res.state;
    d.result = def.result(res.state);
    await this.save();
    this.broadcast();
  }

  private async playAgain(ws: WebSocket, playerId: string): Promise<void> {
    const d = this.data!;
    if (d.hostId !== playerId) return this.sendError(ws, 'Bara värden kan starta igen');
    if (d.result === null) return this.sendError(ws, 'Spelet är inte slut');
    d.game = games[d.gameId].setup(d.players.map((p) => p.id), cryptoRng);
    d.result = null;
    await this.save();
    this.broadcast();
  }

  // --- hjälpfunktioner ---

  private player(id: string): StoredPlayer | undefined {
    return this.data?.players.find((p) => p.id === id);
  }

  private uniqueName(base: string): string {
    const taken = new Set(this.data!.players.map((p) => p.name.toLowerCase()));
    if (!taken.has(base.toLowerCase())) return base;
    for (let n = 2; ; n++) {
      const name = `${base} ${n}`;
      if (!taken.has(name.toLowerCase())) return name;
    }
  }

  private socketsOf(playerId: string, except?: WebSocket): WebSocket[] {
    return this.ctx.getWebSockets().filter((s) => s !== except
      && s.readyState === WebSocket.OPEN
      && (s.deserializeAttachment() as Attachment | null)?.playerId === playerId);
  }

  private snapshot(youId: string, closing?: WebSocket): RoomSnapshot {
    const d = this.data!;
    const def = games[d.gameId];
    return {
      code: d.code,
      gameId: d.gameId,
      phase: d.game === null ? 'lobby' : d.result === null ? 'playing' : 'finished',
      hostId: d.hostId,
      players: d.players.map((p) => ({ id: p.id, name: p.name, connected: this.socketsOf(p.id, closing).length > 0 })),
      youId,
      view: d.game === null ? null : def.viewFor(d.game, youId),
      result: d.result,
    };
  }

  /** Skickar läget till varje ansluten spelare, med dennes egen vy. */
  private broadcast(closing?: WebSocket): void {
    if (!this.data) return;
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === closing || ws.readyState !== WebSocket.OPEN) continue;
      const playerId = (ws.deserializeAttachment() as Attachment | null)?.playerId;
      if (playerId && this.player(playerId)) this.send(ws, { type: 'room', room: this.snapshot(playerId, closing) });
    }
  }

  private send(ws: WebSocket, msg: ServerMsg): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // anslutningen är stängd
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    this.send(ws, { type: 'error', message });
  }

  private deny(ws: WebSocket, message: string): void {
    this.sendError(ws, message);
    ws.close(CLOSE_DENIED, message);
  }

  private goneAndClose(ws: WebSocket): void {
    this.send(ws, { type: 'gone' });
    try {
      ws.close(CLOSE_GONE, 'Rummet finns inte');
    } catch {
      // redan stängd
    }
  }

  private async save(): Promise<void> {
    if (this.data) await this.ctx.storage.put('room', this.data);
  }

  private async touch(): Promise<void> {
    await this.ctx.storage.setAlarm(Date.now() + IDLE_MS);
  }
}
