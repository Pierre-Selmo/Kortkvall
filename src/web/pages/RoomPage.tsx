import { useState, type FormEvent } from 'react';
import { normalizeCode } from '../../worker/codes';
import { load, NAME_KEY, store, tokenKey } from '../api';
import { webGame } from '../games/registry';
import { navigate } from '../nav';
import { useRoom } from '../useRoom';
import { Lobby } from './Lobby';

export function RoomPage({ rawCode }: { rawCode: string }) {
  const code = normalizeCode(rawCode);
  if (!code) return <Gone />;
  return <Room code={code} />;
}

function Room({ code }: { code: string }) {
  const [name, setName] = useState<string | null>(() => load(NAME_KEY));
  const [askName, setAskName] = useState(() => !load(NAME_KEY) && !load(tokenKey(code)));
  const { status, room, error, deniedReason, send } = useRoom(code, askName ? null : name ?? '');

  if (status === 'gone') return <Gone />;
  if (askName || (!room && error === 'Skriv ett namn')) {
    return (
      <NameForm
        initial={name ?? ''}
        onSubmit={(n) => {
          store(NAME_KEY, n);
          setName(n);
          setAskName(false);
        }}
      />
    );
  }

  const leave = () => {
    send({ type: 'leave' });
    navigate('/');
  };

  let body;
  if (!room) {
    body = status === 'denied'
      ? <Message title={deniedReason ?? 'Du kan inte gå med i det här rummet'} />
      : <Message title="Ansluter…" muted />;
  } else if (room.phase === 'lobby') {
    body = <Lobby room={room} send={send} onLeave={leave} />;
  } else {
    const g = webGame(room.gameId);
    body = g ? <g.Table room={room} send={send} isHost={room.hostId === room.youId} onLeave={() => navigate('/')} /> : <Message title="Okänt spel" />;
  }

  return (
    <>
      {status === 'reconnecting' && <div className="banner">Återansluter…</div>}
      {body}
      {error && room && (
        <div className="toast-stack"><div className="toast error" role="alert">{error}</div></div>
      )}
    </>
  );
}

function NameForm({ initial, onSubmit }: { initial: string; onSubmit(name: string): void }) {
  const [name, setName] = useState(initial);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };
  return (
    <main className="lobby">
      <form className="panel" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2>Vad heter du?</h2>
        <input className="input" autoFocus maxLength={16} placeholder="Ditt namn" value={name} onChange={(e) => setName(e.target.value)} aria-label="Ditt namn" />
        <button className="btn" disabled={!name.trim()}>Gå med</button>
      </form>
    </main>
  );
}

function Gone() {
  return (
    <main className="lobby" style={{ textAlign: 'center' }}>
      <h2>Rummet finns inte längre</h2>
      <p className="muted">Det kan ha raderats efter en timme utan aktivitet, eller så är koden fel.</p>
      <div><button className="btn" onClick={() => navigate('/')}>Skapa ett nytt rum</button></div>
    </main>
  );
}

function Message({ title, muted }: { title: string; muted?: boolean }) {
  return (
    <main className="lobby" style={{ textAlign: 'center' }}>
      <h2 className={muted ? 'muted' : undefined}>{title}</h2>
      {!muted && <div><button className="btn" onClick={() => navigate('/')}>Till startsidan</button></div>}
    </main>
  );
}
