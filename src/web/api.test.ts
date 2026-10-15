import { afterEach, expect, test, vi } from 'vitest';
import { createRoom, tokenKey } from './api';

afterEach(() => vi.unstubAllGlobals());

test('createRoom anropar POST /api/rooms och returnerar koden', async () => {
  const fetchMock = vi.fn(async () => Response.json({ code: 'KXQT' }, { status: 201 }));
  vi.stubGlobal('fetch', fetchMock);
  expect(await createRoom('vand-tian')).toBe('KXQT');
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('/api/rooms');
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body as string)).toEqual({ game: 'vand-tian' });
});

test('createRoom kastar vid fel', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
  await expect(createRoom('vand-tian')).rejects.toThrow('Kunde inte skapa rum');
});

test('tokenKey', () => {
  expect(tokenKey('KXQT')).toBe('kortkvall:KXQT');
});
