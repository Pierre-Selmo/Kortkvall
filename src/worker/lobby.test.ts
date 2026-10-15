import { SELF } from 'cloudflare:test';
import { expect, test } from 'vitest';
import { CLOSE_GONE } from '../shared/protocol';
import { connect, createRoom, join } from './helpers';

test('POST /api/rooms skapar ett rum med en giltig kod', async () => {
  expect(await createRoom()).toMatch(/^[A-HJ-NP-Z]{4}$/);
});

test('ett okänt spel ger 400', async () => {
  const res = await SELF.fetch('http://test/api/rooms', { method: 'POST', body: JSON.stringify({ game: 'schack' }) });
  expect(res.status).toBe(400);
  const junk = await SELF.fetch('http://test/api/rooms', { method: 'POST', body: 'inte json' });
  expect(junk.status).toBe(400);
});

test('ogiltig kod ger 404 och saknad Upgrade ger 426', async () => {
  expect((await SELF.fetch('http://test/api/rooms/AB1/ws')).status).toBe(404);
  expect((await SELF.fetch('http://test/api/rooms/ABCD/ws')).status).toBe(426);
  expect((await SELF.fetch('http://test/api/annat')).status).toBe(404);
});

test('ws mot en okänd kod ger gone', async () => {
  const c = await connect('ZZZZ');
  expect(await c.next()).toEqual({ type: 'gone' });
  expect(await c.closed).toBe(CLOSE_GONE);
});

test('den första som går med blir värd och får welcome och room', async () => {
  const code = await createRoom();
  const { c, playerId, token } = await join(code, 'Anna');
  expect(token).toBeTruthy();
  const room = (await c.next('room')).room;
  expect(room).toMatchObject({ code, phase: 'lobby', hostId: playerId, youId: playerId, view: null });
  expect(room.players).toEqual([{ id: playerId, name: 'Anna', connected: true }]);
});

test('en dubblett av namnet får suffixet " 2", långa namn kortas och tomma namn ger fel', async () => {
  const code = await createRoom();
  await join(code, 'Anna');
  const b = await join(code, 'Anna');
  expect((await b.c.room()).players.map((p) => p.name)).toEqual(['Anna', 'Anna 2']);
  const long = await join(code, 'x'.repeat(200));
  expect((await long.c.room()).players.at(-1)!.name).toBe('x'.repeat(16));
  const empty = await connect(code);
  empty.send({ type: 'join', name: '   ' });
  expect(await empty.next()).toEqual({ type: 'error', message: 'Skriv ett namn' });
});

test('den sjätte spelaren nekas med "Rummet är fullt"', async () => {
  const code = await createRoom();
  for (const n of ['A', 'B', 'C', 'D', 'E']) await join(code, n);
  const f = await connect(code);
  f.send({ type: 'join', name: 'F' });
  expect(await f.next('error')).toEqual({ type: 'error', message: 'Rummet är fullt' });
  await f.closed;
});

test('värden lämnar och nästa spelare blir värd', async () => {
  const code = await createRoom();
  const a = await join(code, 'Anna');
  const b = await join(code, 'Bertil');
  a.c.send({ type: 'leave' });
  await a.c.closed;
  let room = await b.c.room();
  while (room.players.length !== 1) room = (await b.c.next('room')).room;
  expect(room.players.map((p) => p.name)).toEqual(['Bertil']);
  expect(room.hostId).toBe(b.playerId);
});

test('skräpmeddelanden ger error utan att stänga anslutningen', async () => {
  const code = await createRoom();
  const c = await connect(code);
  for (const junk of ['hej', '{"type":"x"}', '{"type":"join"}', '[]', 'null']) {
    c.send(junk);
    expect(await c.next()).toEqual({ type: 'error', message: 'Ogiltigt meddelande' });
  }
  c.send({ type: 'start' });
  expect(await c.next()).toEqual({ type: 'error', message: 'Gå med först' });
  c.send({ type: 'join', name: 'Anna' });
  expect((await c.next()).type).toBe('welcome');
});
