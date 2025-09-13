'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectWallet } from './ConnectWallet';
import { SignInWithEthereum } from './SignInWithEthereum';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { address, isConnected, isConnecting } = useAccount();
  const [testMode, setTestMode] = useState(false);

  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/80">Connecting wallet...</p>
        </div>
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <ConnectWallet />
            <SignInWithEthereum />
          </div>
          
          <div className="border-t border-white/20 pt-6">
            <p className="text-white/60 text-sm mb-4">Or test the game without wallet connection:</p>
            <button
              onClick={() => setTestMode(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-medium"
            >
              🧪 Enter Test Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}