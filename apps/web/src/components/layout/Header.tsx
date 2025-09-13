'use client';

import { useAccount } from 'wagmi';
import { ConnectWallet } from '@/components/auth/ConnectWallet';
import { useUserStore } from '@/lib/userStore';

export function Header() {
  const { address } = useAccount();
  const { getNickname } = useUserStore();

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
          {address ? (
            <div className="text-white/80 text-sm">
              {getNickname(address) || `${address.slice(0, 6)}...${address.slice(-4)}`}
            </div>
          ) : (
            <ConnectWallet />
          )}
        </div>
      </div>
    </header>
  );
}
