'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectWallet } from './ConnectWallet';
import { SignInWithEthereum } from './SignInWithEthereum';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { address, isConnected, isConnecting, isDisconnected } = useAccount();
  const [testMode, setTestMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('🔍 AuthGuard Debug:', {
      mounted,
      isConnected,
      isConnecting,
      isDisconnected,
      address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'none',
      testMode
    });
  }, [mounted, isConnected, isConnecting, isDisconnected, address, testMode]);

  // Show loading only briefly, then show options
  if (!mounted || isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/80">Loading...</p>
        </div>
      </div>
    );
  }

  // If wallet is connected, show the game
  if (isConnected && address) {
    console.log('✅ Wallet connected, showing game');
    return <>{children}</>;
  }

  // Show wallet connection options
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-6">Connect Your Wallet</h2>
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