import { games } from '../games/registry';
import { cryptoRng } from '../shared/rng';
import { generateCode, normalizeCode } from './codes';
import { Room } from './room';

export { Room };

export interface Env {
  ROOM: DurableObjectNamespace<Room>;
}

const json = (body: unknown, status = 200) => Response.json(body, { status });

async function createRoom(req: Request, env: Env): Promise<Response> {
  const body = await req.json<{ game?: unknown }>().catch(() => null);
  const game = typeof body?.game === 'string' ? body.game : '';
  if (!Object.hasOwn(games, game)) return json({ error: 'Okänt spel' }, 400);
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

    const ws = url.pathname.match(/^\/api\/rooms\/([^/]+)\/ws$/);
    if (ws && req.method === 'GET') {
      const code = normalizeCode(decodeURIComponent(ws[1]));
      if (!code) return json({ error: 'Ogiltig kod' }, 404);
      if (req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Expected websocket', { status: 426 });
      return env.ROOM.getByName(code).fetch(req);
    }
    return json({ error: 'Hittades inte' }, 404);
  },
} satisfies ExportedHandler<Env>;
