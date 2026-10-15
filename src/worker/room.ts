import { DurableObject } from 'cloudflare:workers';
import { games } from '../games/registry';
import type { GameResult } from '../games/types';
import { MAX_NAME, parseClientMsg, type ClientMsg, type RoomSnapshot, type ServerMsg } from '../shared/protocol';
import type { Env } from './index';

interface StoredPlayer {
  id: string;
  name: string;
  token: string;
}

interface RoomData {
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

const MAX_PLAYERS = 5;

export class Room extends DurableObject<Env> {
  private data: RoomData | null | undefined;

  private async load(): Promise<RoomData | null> {
    if (this.data === undefined) this.data = (await this.ctx.storage.get<RoomData>('room')) ?? null;
    return this.data;
  }

  private async save(): Promise<void> {
    await this.ctx.storage.put('room', this.data);
  }

  /** Creates the room. Returns false if it already exists. */
  async init(gameId: string, code: string): Promise<boolean> {
    if (await this.load()) return false;
    this.data = { code, gameId, hostId: '', players: [], game: null, result: null };
    await this.save();
    return true;
  }

  async fetch(_req: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    const data = await this.load();
    if (!data) {
      server.accept();
      this.sendTo(server, { type: 'gone' });
      server.close(4004, 'gone');
      return new Response(null, { status: 101, webSocket: client });
    }
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId: null } satisfies Attachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const data = await this.load();
    if (!data) {
      this.sendTo(ws, { type: 'gone' });
      ws.close(4004, 'gone');
      return;
    }
    const msg = parseClientMsg(raw);
    if (!msg) return this.sendTo(ws, { type: 'error', message: 'Ogiltigt meddelande' });
    const playerId = (ws.deserializeAttachment() as Attachment).playerId;
    if (msg.type === 'join') return this.handleJoin(ws, data, msg);
    if (!playerId) return this.sendTo(ws, { type: 'error', message: 'Gå med först' });
    switch (msg.type) {
      case 'leave':
        return this.handleLeave(ws, data, playerId);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    ws.serializeAttachment({ playerId: null } satisfies Attachment);
    const data = await this.load();
    if (data) this.broadcast(data);
  }

  private async handleJoin(ws: WebSocket, data: RoomData, msg: Extract<ClientMsg, { type: 'join' }>) {
    const existing = msg.token ? data.players.find((p) => p.token === msg.token) : undefined;
    let player = existing;
    if (!player) {
      const base = msg.name.trim().slice(0, MAX_NAME);
      if (!base) return this.sendTo(ws, { type: 'error', message: 'Skriv ett namn' });
      if (data.game !== null) return this.reject(ws, 'Spelet har redan startat');
      if (data.players.length >= MAX_PLAYERS) return this.reject(ws, 'Rummet är fullt');
      player = { id: crypto.randomUUID(), name: uniqueName(base, data.players), token: crypto.randomUUID() };
      data.players.push(player);
      if (!data.hostId) data.hostId = player.id;
      await this.save();
    }
    ws.serializeAttachment({ playerId: player.id } satisfies Attachment);
    this.sendTo(ws, { type: 'welcome', playerId: player.id, token: player.token });
    this.broadcast(data);
  }

  private async handleLeave(ws: WebSocket, data: RoomData, playerId: string) {
    if (data.game !== null) return this.sendTo(ws, { type: 'error', message: 'Du kan inte lämna mitt i ett spel' });
    data.players = data.players.filter((p) => p.id !== playerId);
    if (data.hostId === playerId) data.hostId = data.players[0]?.id ?? '';
    await this.save();
    for (const s of this.socketsOf(playerId)) {
      s.serializeAttachment({ playerId: null } satisfies Attachment);
      s.close(1000, 'left');
    }
    this.broadcast(data);
  }

  private reject(ws: WebSocket, message: string) {
    this.sendTo(ws, { type: 'error', message });
    ws.close(4003, 'rejected');
  }

  private socketsOf(playerId: string): WebSocket[] {
    return this.ctx.getWebSockets().filter((s) => (s.deserializeAttachment() as Attachment | null)?.playerId === playerId);
  }

  private snapshot(data: RoomData, youId: string): RoomSnapshot {
    const def = games[data.gameId];
    const connected = new Set(
      this.ctx
        .getWebSockets()
        .filter((s) => s.readyState === WebSocket.OPEN)
        .map((s) => (s.deserializeAttachment() as Attachment | null)?.playerId),
    );
    return {
      code: data.code,
      gameId: data.gameId,
      phase: data.game === null ? 'lobby' : data.result ? 'finished' : 'playing',
      hostId: data.hostId,
      players: data.players.map((p) => ({ id: p.id, name: p.name, connected: connected.has(p.id) })),
      youId,
      view: data.game !== null ? def.viewFor(data.game, youId) : null,
      result: data.result,
    };
  }

  private broadcast(data: RoomData) {
    for (const s of this.ctx.getWebSockets()) {
      const pid = (s.deserializeAttachment() as Attachment | null)?.playerId;
      if (pid && data.players.some((p) => p.id === pid)) this.sendTo(s, { type: 'room', room: this.snapshot(data, pid) });
    }
  }

  private sendTo(ws: WebSocket, msg: ServerMsg) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // socket already closed
    }
  }
}

function uniqueName(base: string, players: StoredPlayer[]): string {
  const taken = new Set(players.map((p) => p.name));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base} ${n}`)) return `${base} ${n}`;
}
