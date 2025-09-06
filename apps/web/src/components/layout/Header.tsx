'use client';

import { useSession } from 'next-auth/react';
import { ConnectWallet } from '@/components/auth/ConnectWallet';
import { formatEther } from '@balloonpump/shared';

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="glass-card mx-4 mt-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            🎈 BNB Balloon Pump
          </h1>
          <div className="text-white/60 text-sm">
            Pump, Pop, Profit!
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {session && (
            <div className="text-white/80 text-sm">
              Welcome, {session.user.name}
            </div>
          )}
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
