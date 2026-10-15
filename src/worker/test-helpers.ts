import { SELF } from 'cloudflare:test';
import type { ClientMsg, ServerMsg } from '../shared/protocol';

export interface TestClient {
  ws: WebSocket;
  send(msg: ClientMsg | string): void;
  /** Next message of the given type (skips others). */
  next<T extends ServerMsg['type']>(type?: T): Promise<Extract<ServerMsg, { type: T }>>;
  /** Resolves with the close code. */
  closed: Promise<number>;
  close(): void;
}

export async function createRoom(game = 'vand-tian'): Promise<string> {
  const res = await SELF.fetch('http://test/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ game }),
  });
  const body = (await res.json()) as { code: string };
  return body.code;
}

export async function connect(code: string): Promise<TestClient> {
  const res = await SELF.fetch(`http://test/api/rooms/${code}/ws`, { headers: { Upgrade: 'websocket' } });
  const ws = res.webSocket;
  if (!ws) throw new Error(`no websocket (status ${res.status})`);
  ws.accept();
  const queue: ServerMsg[] = [];
  const waiters: (() => void)[] = [];
  ws.addEventListener('message', (e) => {
    queue.push(JSON.parse(e.data as string));
    waiters.splice(0).forEach((w) => w());
  });
  const closed = new Promise<number>((resolve) => ws.addEventListener('close', (e) => resolve(e.code)));
  return {
    ws,
    closed,
    send: (m) => ws.send(typeof m === 'string' ? m : JSON.stringify(m)),
    close: () => ws.close(1000),
    async next(type) {
      for (let tries = 0; tries < 50; tries++) {
        const i = queue.findIndex((m) => !type || m.type === type);
        if (i >= 0) return queue.splice(i, 1)[0] as never;
        await new Promise<void>((resolve) => {
          waiters.push(resolve);
          setTimeout(resolve, 100);
        });
      }
      throw new Error(`timeout waiting for ${type ?? 'message'}`);
    },
  };
}

/** Connects and joins; returns the client after its welcome + first room snapshot. */
export async function join(code: string, name: string, token?: string) {
  const c = await connect(code);
  c.send({ type: 'join', name, token });
  const welcome = await c.next('welcome');
  const room = await c.next('room');
  return { c, welcome, room: room.room };
}
