import { SELF } from 'cloudflare:test';
import { expect, test } from 'vitest';
import { connect, createRoom, join } from './test-helpers';

test('POST /api/rooms skapar ett rum med en giltig kod', async () => {
  const res = await SELF.fetch('http://test/api/rooms', { method: 'POST', body: JSON.stringify({ game: 'vand-tian' }) });
  expect(res.status).toBe(201);
  const { code } = (await res.json()) as { code: string };
  expect(code).toMatch(/^[A-HJ-NP-Z]{4}$/);
});

test('ett okänt spel ger 400', async () => {
  const res = await SELF.fetch('http://test/api/rooms', { method: 'POST', body: JSON.stringify({ game: 'schack' }) });
  expect(res.status).toBe(400);
});

test('ogiltig kod ger 404 och saknad upgrade ger 426', async () => {
  expect((await SELF.fetch('http://test/api/rooms/KX1T/ws', { headers: { Upgrade: 'websocket' } })).status).toBe(404);
  const code = await createRoom();
  expect((await SELF.fetch(`http://test/api/rooms/${code}/ws`)).status).toBe(426);
  expect((await SELF.fetch('http://test/api/annat')).status).toBe(404);
});

test('ws mot en okänd kod ger gone', async () => {
  const c = await connect('ZZZZ');
  expect((await c.next()).type).toBe('gone');
  expect(await c.closed).toBe(4004);
});

test('den första som går med blir värd och får welcome och room', async () => {
  const code = await createRoom();
  const { welcome, room } = await join(code, 'Anna');
  expect(welcome.token).toBeTruthy();
  expect(room.hostId).toBe(welcome.playerId);
  expect(room.youId).toBe(welcome.playerId);
  expect(room.code).toBe(code);
  expect(room.phase).toBe('lobby');
  expect(room.players).toEqual([{ id: welcome.playerId, name: 'Anna', connected: true }]);
});

test('alla får uppdaterad spelarlista när någon går med', async () => {
  const code = await createRoom();
  const a = await join(code, 'Anna');
  await join(code, 'Bertil');
  const update = await a.c.next('room');
  expect(update.room.players.map((p) => p.name)).toEqual(['Anna', 'Bertil']);
});

test('en dubblett av namnet får suffixet " 2"', async () => {
  const code = await createRoom();
  await join(code, 'Anna');
  const b = await join(code, 'Anna');
  expect(b.room.players.map((p) => p.name)).toEqual(['Anna', 'Anna 2']);
});

test('ett namn på 200 tecken kortas till 16', async () => {
  const code = await createRoom();
  const { room } = await join(code, 'x'.repeat(200));
  expect(room.players[0].name).toBe('x'.repeat(16));
});

test('ett tomt namn ger fel', async () => {
  const code = await createRoom();
  const c = await connect(code);
  c.send({ type: 'join', name: '   ' });
  expect((await c.next('error')).message).toBe('Skriv ett namn');
});

test('den sjätte spelaren nekas med "Rummet är fullt"', async () => {
  const code = await createRoom();
  for (const n of ['A', 'B', 'C', 'D', 'E']) await join(code, n);
  const c = await connect(code);
  c.send({ type: 'join', name: 'F' });
  expect((await c.next('error')).message).toBe('Rummet är fullt');
  await c.closed;
});

test('värden lämnar och nästa spelare blir värd', async () => {
  const code = await createRoom();
  const a = await join(code, 'Anna');
  const b = await join(code, 'Bertil');
  a.c.send({ type: 'leave' });
  let snap = (await b.c.next('room')).room;
  while (snap.players.length !== 1) snap = (await b.c.next('room')).room;
  expect(snap.hostId).toBe(b.welcome.playerId);
  expect(snap.players.map((p) => p.name)).toEqual(['Bertil']);
});

test('skräpmeddelanden ger error utan att stänga anslutningen', async () => {
  const code = await createRoom();
  const c = await connect(code);
  for (const junk of ['hej', '{"type":"x"}', '{"type":"join"}', '{"type":"join","name":5}']) {
    c.send(junk);
    expect((await c.next('error')).message).toBe('Ogiltigt meddelande');
  }
  c.send({ type: 'start' });
  expect((await c.next('error')).message).toBe('Gå med först');
  c.send({ type: 'join', name: 'Anna' });
  expect((await c.next('welcome')).type).toBe('welcome');
});
