'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Balloon } from './Balloon';
import { GameStats } from './GameStats';
import { Leaderboard } from './Leaderboard';
import { PumpControls } from './PumpControls';
import { VaultPanel } from './VaultPanel';
import { apiClient } from '@/lib/apiClient';

export function GameContainer() {
  // Force redeploy to fix API issues
  const { address } = useAccount();
  const [gameState, setGameState] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const fetchGameData = async () => {
    if (!address) return;
    
    try {
      const [state, balance] = await Promise.all([
        apiClient.getGameState(),
        apiClient.getUserBalance(address)
      ]);
      
      setGameState(state);
      setUserBalance(balance);
    } catch (error) {
      console.error('Failed to fetch game data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePumpSuccess = () => {
    // Refresh game data after successful pump
    fetchGameData();
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && address) {
      fetchGameData();
      
      // Refresh every 5 seconds
      const interval = setInterval(fetchGameData, 5000);
      return () => clearInterval(interval);
    }
  }, [address, isMounted]);

  if (!isMounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mb-4"></div>
          <div className="text-white">Loading game...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Game Stats & Balloon */}
          <div className="lg:col-span-2 space-y-6">
            <GameStats 
              gameState={gameState}
              userBalance={userBalance}
            />
            
                    <div className="flex justify-center">
                      <Balloon
                        size={gameState?.pressure || gameState?.currentPressure || 0}
                        isPopped={(gameState?.pressure || 0) >= 100}
                      />
                    </div>
            
            <PumpControls 
              userBalance={userBalance}
              onPumpSuccess={handlePumpSuccess}
            />
          </div>

          {/* Right Column - Vault & Leaderboard */}
          <div className="space-y-6">
            <VaultPanel 
              userBalance={userBalance}
              onBalanceUpdate={fetchGameData}
            />
            <Leaderboard />
          </div>
        </div>
      </div>
    </div>
  );
}