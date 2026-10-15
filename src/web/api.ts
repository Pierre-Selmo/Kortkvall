export async function createRoom(game: string): Promise<string> {
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ game }),
  });
  if (!res.ok) throw new Error('Kunde inte skapa rum');
  return ((await res.json()) as { code: string }).code;
}

export function tokenKey(code: string): string {
  return 'kortkvall:' + code;
}

export const NAME_KEY = 'kortkvall:name';

export function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // privat läge – det fungerar ändå, men utan att minnas
  }
}
