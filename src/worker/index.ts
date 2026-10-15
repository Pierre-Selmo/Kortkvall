import { games } from '../games/registry';
import { cryptoRng } from '../shared/rng';
import { generateCode, normalizeCode } from './codes';
import { Room } from './room';

export { Room };

export interface Env {
  ROOM: DurableObjectNamespace<Room>;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function createRoom(req: Request, env: Env): Promise<Response> {
  let game: unknown;
  try {
    game = ((await req.json()) as { game?: unknown }).game;
  } catch {
    return json({ error: 'Ogiltig förfrågan' }, 400);
  }
  if (typeof game !== 'string' || !games[game]) return json({ error: 'Okänt spel' }, 400);
  for (let i = 0; i < 5; i++) {
    const code = generateCode(cryptoRng);
    if (await env.ROOM.getByName(code).init(game, code)) return json({ code }, 201);
  }
  return json({ error: 'Kunde inte skapa rum' }, 503);
}

export default {
  async fetch(req, env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/api/rooms' && req.method === 'POST') return createRoom(req, env);
    const m = url.pathname.match(/^\/api\/rooms\/([^/]+)\/ws$/);
    if (m) {
      const code = normalizeCode(m[1]);
      if (!code) return new Response('Not found', { status: 404 });
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected websocket', { status: 426 });
      return env.ROOM.getByName(code).fetch(req);
    }
    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
