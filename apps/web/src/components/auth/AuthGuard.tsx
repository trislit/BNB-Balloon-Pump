'use client';

import { useAccount } from 'wagmi';
import { ConnectWallet } from './ConnectWallet';
import { SignInWithEthereum } from './SignInWithEthereum';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { address, isConnected, isConnecting } = useAccount();

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
        <div className="text-center">
          <ConnectWallet />
          <SignInWithEthereum />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}