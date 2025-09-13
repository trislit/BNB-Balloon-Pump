'use client';

import { useAccount } from 'wagmi';
import { ConnectWallet } from './ConnectWallet';
import { SignInWithEthereum } from './SignInWithEthereum';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  // DISABLED AUTH - Always show the app for testing
  const testAddress = '0x1234567890123456789012345678901234567890';
  
  return <>{children}</>;
}