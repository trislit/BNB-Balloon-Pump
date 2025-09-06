import { GameContainer } from '@/components/game/GameContainer';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function Home() {
  return (
    <AuthGuard>
      <GameContainer />
    </AuthGuard>
  );
}
