import { useState } from 'react';
import { games } from '../../games/registry';
import type { ClientMsg, RoomSnapshot } from '../../shared/protocol';
import { RulesModal } from '../components/RulesModal';
import { webGame } from '../games/registry';
import { roomUrl } from '../nav';

export async function shareLink(code: string, gameName: string): Promise<boolean> {
  const url = roomUrl(code);
  if (navigator.share) {
    try {
      await navigator.share({ title: gameName, text: `Spela ${gameName} med mig! Kod: ${code}`, url });
      return false;
    } catch {
      // avbrutet – fall tillbaka på kopiering
    }
  }
  await navigator.clipboard.writeText(url);
  return true;
}

export function Lobby({ room, send, onLeave }: { room: RoomSnapshot; send(m: ClientMsg): void; onLeave(): void }) {
  const [rules, setRules] = useState(false);
  const [copied, setCopied] = useState(false);
  const g = webGame(room.gameId);
  const def = games[room.gameId];
  const isHost = room.hostId === room.youId;
  const n = room.players.length;
  const canStart = n >= def.minPlayers && n <= def.maxPlayers;

  async function share() {
    try {
      if (await shareLink(room.code, g?.name ?? 'Kortkväll')) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // urklipp nekades
    }
  }

  return (
    <main className="lobby">
      <div style={{ textAlign: 'center' }}>
        <div className="muted">{g?.icon} {g?.name} · rumskod</div>
        <div className="room-code">{room.code}</div>
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn secondary" onClick={share}>{copied ? 'Länk kopierad!' : 'Dela länk'}</button>
        <button className="btn secondary" onClick={() => setRules(true)}>Regler</button>
      </div>

      <section className="panel">
        <h3 style={{ marginBottom: 10 }}>Spelare ({n}/{def.maxPlayers})</h3>
        <ul className="player-list">
          {room.players.map((p) => (
            <li key={p.id}>
              <span className={p.connected ? 'dot' : 'dot off'} title={p.connected ? 'Ansluten' : 'Frånkopplad'} />
              <span style={{ flex: 1 }}>{p.name}{p.id === room.youId && <span className="muted"> (du)</span>}</span>
              {p.id === room.hostId && <span className="badge gold">värd</span>}
            </li>
          ))}
        </ul>
      </section>

      <div className="row" style={{ justifyContent: 'center' }}>
        {isHost ? (
          <button className="btn" disabled={!canStart} onClick={() => send({ type: 'start' })}>
            Starta
          </button>
        ) : (
          <span className="muted">Väntar på att värden startar…</span>
        )}
        <button className="btn danger" onClick={onLeave}>Lämna</button>
      </div>
      {isHost && !canStart && <p className="muted" style={{ textAlign: 'center', margin: 0 }}>Det behövs {def.minPlayers}–{def.maxPlayers} spelare. Dela länken!</p>}

      <RulesModal open={rules} onClose={() => setRules(false)}>{g && <g.Rules />}</RulesModal>
    </main>
  );
}
