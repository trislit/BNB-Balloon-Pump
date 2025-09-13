'use client';

import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { ConnectWallet } from './ConnectWallet';
import { SignInWithEthereum } from './SignInWithEthereum';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isConnected, address, isConnecting } = useAccount();
  const [connectionTimeout, setConnectionTimeout] = useState(false);
  const [testMode, setTestMode] = useState(false);

  // Set a timeout for wallet connection
  useEffect(() => {
    if (isConnecting) {
      const timeout = setTimeout(() => {
        setConnectionTimeout(true);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    } else {
      setConnectionTimeout(false);
    }
  }, [isConnecting]);

  // Show loading state while connecting (with timeout)
  if (isConnecting && !connectionTimeout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mb-4"></div>
          <div className="text-white">Connecting wallet...</div>
          <div className="text-white/60 text-sm mt-2">This may take a few seconds</div>
        </div>
      </div>
    );
  }

  // Show timeout message if connection takes too long
  if (isConnecting && connectionTimeout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-4">
          <div className="text-yellow-400 text-6xl mb-4">⚠️</div>
          <div className="text-white text-xl mb-2">Wallet Connection Timeout</div>
          <div className="text-white/80 mb-4">
            The wallet connection is taking longer than expected. Please try again.
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Refresh Page
          </button>
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
          
          {/* Test Mode Button */}
          <div className="text-center">
            <button
              onClick={() => setTestMode(true)}
              className="text-white/60 hover:text-white text-sm underline"
            >
              Skip wallet connection (Test Mode)
            </button>
          </div>
          
          {/* Debug info */}
          <div className="text-center text-xs text-white/40">
            <div>isConnecting: {isConnecting ? 'true' : 'false'}</div>
            <div>isConnected: {isConnected ? 'true' : 'false'}</div>
            <div>address: {address || 'none'}</div>
          </div>
        </div>
      </div>
    );
  }

  // User is connected or in test mode, show the app
  if (isConnected && address) {
    return <>{children}</>;
  }

  // Test mode - bypass wallet connection
  if (testMode) {
    return <>{children}</>;
  }
}