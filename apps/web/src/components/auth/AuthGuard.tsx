'use client';

import { useSession } from 'next-auth/react';
import { useAccount } from 'wagmi';
import { ConnectWallet } from './ConnectWallet';
import { SignInWithEthereum } from './SignInWithEthereum';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const { address, isConnected } = useAccount();

  // Loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  // Not connected to wallet
  if (!isConnected || !address) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4 text-white">Welcome to Balloon Pump</h2>
          <p className="text-white/80 mb-6">
            Connect your wallet to start pumping balloons and earning rewards!
          </p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  // Connected but not signed in with SIWE
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4 text-white">Sign In Required</h2>
          <p className="text-white/80 mb-6">
            Sign in with your wallet to access the game.
          </p>
          <SignInWithEthereum />
        </div>
      </div>
    );
  }

  // Fully authenticated
  return <>{children}</>;
}
