import { env, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { expect, test } from 'vitest';
import type { VTView } from '../games/vand-tian/view';
import { testState } from '../games/vand-tian/testing';
import type { RoomSnapshot } from '../shared/protocol';
import { connect, createRoom, join, settle } from './helpers';
import type { Room, RoomData } from './room';

const view = (r: RoomSnapshot) => r.view as VTView;

async function startedRoom(n = 2) {
  const code = await createRoom();
  const ps = [];
  for (let i = 0; i < n; i++) ps.push(await join(code, `Spelare ${i}`));
  ps[0].c.send({ type: 'start' });
  const rooms = await Promise.all(ps.map(async (p) => {
    let r = (await p.c.next('room')).room;
    while (r.phase !== 'playing') r = (await p.c.next('room')).room;
    return r;
  }));
  return { code, ps, rooms };
}

test("värden startar, alla får fasen 'playing' och en egen vy", async () => {
  const { rooms } = await startedRoom(3);
  for (const r of rooms) {
    expect(r.phase).toBe('playing');
    expect(view(r).myHand).toHaveLength(3);
    expect(view(r).phase).toBe('swap');
  }
  for (const r of rooms) {
    const json = JSON.stringify(r);
    for (const other of rooms) {
      if (other === r) continue;
      for (const c of view(other).myHand) expect(json).not.toContain(`"${c}"`);
    }
  }
});

test('en icke-värd kan inte starta och start med 1 spelare nekas', async () => {
  const code = await createRoom();
  const a = await join(code, 'Anna');
  a.c.send({ type: 'start' });
  expect(await a.c.next('error')).toEqual({ type: 'error', message: 'Det behövs 2–5 spelare' });
  const b = await join(code, 'Bertil');
  b.c.send({ type: 'start' });
  expect(await b.c.next('error')).toEqual({ type: 'error', message: 'Bara värden kan starta' });
});

test('ett ogiltigt drag ger error bara till den som skickade det', async () => {
  const { ps } = await startedRoom(2);
  await settle();
  ps[1].c.send({ type: 'action', action: { type: 'play', cards: ['KS'] } });
  expect((await ps[1].c.next('error')).message).toBeTruthy();
  ps[0].c.send({ type: 'action', action: { type: 'fly' } });
  expect(await ps[0].c.next('error')).toEqual({ type: 'error', message: 'Ogiltigt drag' });
});

test('återanslutning med token efter start ger samma playerId och samma hand', async () => {
  const { code, ps, rooms } = await startedRoom(2);
  ps[1].c.close();
  await settle();
  const again = await join(code, 'vadsomhelst', ps[1].token);
  expect(again.playerId).toBe(ps[1].playerId);
  const r = await again.c.room();
  expect(view(r).myHand).toEqual(view(rooms[1]).myHand);
  expect(r.players[1].name).toBe('Spelare 1');
});

test('en ny anslutning utan token efter start nekas med "Spelet har redan startat"', async () => {
  const { code } = await startedRoom(2);
  const c = await connect(code);
  c.send({ type: 'join', name: 'Cecilia' });
  expect(await c.next('error')).toEqual({ type: 'error', message: 'Spelet har redan startat' });
  await c.closed;
});

test('två flikar med samma token', async () => {
  const { code, ps } = await startedRoom(2);
  const tab2 = await join(code, 'x', ps[1].token);
  await tab2.c.room();
  await ps[1].c.room();
  ps[1].c.send({ type: 'action', action: { type: 'ready' } });
  expect(view((await ps[1].c.next('room')).room).players[1].ready).toBe(true);
  expect(view((await tab2.c.next('room')).room).players[1].ready).toBe(true);

  tab2.c.close();
  let r = await ps[0].c.room();
  expect(r.players[1].connected).toBe(true);
  ps[1].c.close();
  r = (await ps[0].c.next('room')).room;
  expect(r.players[1].connected).toBe(false);
});

test("playAgain efter 'finished' delar ut på nytt", async () => {
  const { code, ps } = await startedRoom(2);
  const ids = ps.map((p) => p.playerId);
  const stub = env.ROOM.getByName(code);
  await runInDurableObject(stub, async (_instance: Room, state) => {
    const data = (await state.storage.get<RoomData>('room'))!;
    data.game = testState({ phase: 'finished', finishOrder: ids, players: ids.map((id) => ({ id })) });
    data.result = { placements: ids, loserId: ids[1] };
    await state.storage.put('room', data);
    (_instance as unknown as { data: RoomData }).data = data;
  });
  ps[1].c.send({ type: 'playAgain' });
  expect(await ps[1].c.next('error')).toEqual({ type: 'error', message: 'Bara värden kan starta igen' });
  ps[0].c.send({ type: 'playAgain' });
  let r = (await ps[0].c.next('room')).room;
  while (r.result !== null) r = (await ps[0].c.next('room')).room;
  expect(r.phase).toBe('playing');
  expect(view(r).phase).toBe('swap');
  expect(view(r).myHand).toHaveLength(3);
});

test('alarmet raderar rummet', async () => {
  const code = await createRoom();
  const a = await join(code, 'Anna');
  expect(await runDurableObjectAlarm(env.ROOM.getByName(code))).toBe(true);
  expect(await a.c.next('gone')).toEqual({ type: 'gone' });
  const c = await connect(code);
  expect(await c.next()).toEqual({ type: 'gone' });
});
