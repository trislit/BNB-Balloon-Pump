'use client';

import { useAccount } from 'wagmi';
import { NicknameSelector } from './NicknameSelector';

export function SignInWithEthereum() {
  const { address, isConnected } = useAccount();

  if (!isConnected || !address) {
    return (
      <div className="space-y-4">
        <div className="text-white/80 text-sm mb-4">
          Connect your wallet to start playing the Balloon Pump game!
        </div>
        <div className="text-white/60 text-xs text-center">
          Your wallet address will be used as your player ID.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <div className="text-white/80 text-sm mb-2">Connected as:</div>
        <div className="font-mono text-white text-sm">
          {address}
        </div>
      </div>
      
      <NicknameSelector />
      
      <div className="text-center">
        <div className="text-green-400 text-sm font-medium">
          ✅ Ready to play!
        </div>
        <div className="text-white/60 text-xs mt-1">
          You can now pump the balloon and compete for rewards.
        </div>
      </div>
    </div>
  );
}
