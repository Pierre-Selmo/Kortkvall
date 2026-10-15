// Hjälpfunktioner för worker-testerna.
import { SELF } from 'cloudflare:test';
import type { ClientMsg, RoomSnapshot, ServerMsg } from '../shared/protocol';

export async function createRoom(game = 'vand-tian'): Promise<string> {
  const res = await SELF.fetch('http://test/api/rooms', { method: 'POST', body: JSON.stringify({ game }) });
  if (res.status !== 201) throw new Error(`status ${res.status}`);
  return ((await res.json()) as { code: string }).code;
}

export interface Conn {
  ws: WebSocket;
  send(msg: ClientMsg | string): void;
  /** Nästa meddelande (valfritt av en viss typ, tidigare meddelanden av andra typer hoppas över). */
  next<T extends ServerMsg['type']>(type?: T): Promise<Extract<ServerMsg, { type: T }>>;
  /** Senaste room-meddelandet efter att kön tömts. */
  room(): Promise<RoomSnapshot>;
  closed: Promise<number>;
  close(): void;
}

export async function connect(code: string): Promise<Conn> {
  const res = await SELF.fetch(`http://test/api/rooms/${code}/ws`, { headers: { Upgrade: 'websocket' } });
  const ws = res.webSocket;
  if (!ws) throw new Error(`ingen websocket (status ${res.status})`);
  const queue: ServerMsg[] = [];
  const waiters: (() => void)[] = [];
  let resolveClosed!: (c: number) => void;
  const closed = new Promise<number>((r) => (resolveClosed = r));
  ws.addEventListener('message', (e) => {
    queue.push(JSON.parse(e.data as string));
    waiters.splice(0).forEach((w) => w());
  });
  ws.addEventListener('close', (e) => {
    resolveClosed(e.code);
    waiters.splice(0).forEach((w) => w());
  });
  ws.accept();

  const wait = () => new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 2000);
    waiters.push(() => { clearTimeout(t); resolve(); });
  });

  async function next<T extends ServerMsg['type']>(type?: T) {
    for (;;) {
      while (queue.length) {
        const m = queue.shift()!;
        if (!type || m.type === type) return m as Extract<ServerMsg, { type: T }>;
      }
      await wait();
    }
  }

  return {
    ws,
    send: (m) => ws.send(typeof m === 'string' ? m : JSON.stringify(m)),
    next,
    async room() {
      let r = (await next('room')).room;
      await new Promise((res) => setTimeout(res, 30));
      for (const m of queue.splice(0)) if (m.type === 'room') r = m.room;
      return r;
    },
    closed,
    close: () => ws.close(1000),
  };
}

/** Ansluter och går med. Returnerar anslutningen och welcome-datat. */
export async function join(code: string, name: string, token?: string) {
  const c = await connect(code);
  c.send({ type: 'join', name, token });
  const welcome = await c.next('welcome');
  return { c, ...welcome };
}

export const settle = () => new Promise((r) => setTimeout(r, 50));
