import { usePath } from './nav';
import { RoomPage } from './pages/RoomPage';
import { StartPage } from './pages/StartPage';

export function App() {
  const path = usePath();
  const room = path.match(/^\/r\/([^/]+)\/?$/);
  if (room) return <RoomPage key={room[1]} rawCode={decodeURIComponent(room[1])} />;
  return <StartPage />;
}
