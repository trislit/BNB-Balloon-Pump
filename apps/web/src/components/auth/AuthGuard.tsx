'use client';

import { useAccount } from 'wagmi';
import { ConnectWallet } from './ConnectWallet';
import { SignInWithEthereum } from './SignInWithEthereum';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isConnected, address, isConnecting } = useAccount();

  // Show loading state while connecting
  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mb-4"></div>
          <div className="text-white">Connecting wallet...</div>
        </div>
      </div>
    );
  }

  // If not connected to wallet, show connect wallet UI
  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">🎈 Balloon Pump</h1>
            <p className="text-white/80">Connect your wallet to start playing</p>
          </div>
          <ConnectWallet />
          <SignInWithEthereum />
        </div>
      </div>
    );
  }

  // User is connected, show the app
  return <>{children}</>;
}