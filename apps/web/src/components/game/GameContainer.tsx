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
  const [gameEnded, setGameEnded] = useState(false);
  const [gameResult, setGameResult] = useState<any>(null);

  const fetchGameData = async () => {
    if (!address) return;
    
    try {
      const [state, balance] = await Promise.all([
        apiClient.getGameState(),
        apiClient.getUserBalance(address)
      ]);
      
      console.log('🎮 Game State:', state);
      console.log('💰 User Balance:', balance);
      
      setGameState(state);
      setUserBalance(balance);
    } catch (error) {
      console.error('Failed to fetch game data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePumpSuccess = (result?: any) => {
    // Check if game ended
    if (result?.balloon_popped || result?.game_ended) {
      setGameEnded(true);
      setGameResult(result);
    }
    // Refresh game data after successful pump
    fetchGameData();
  };

  const handleStartNewGame = () => {
    setGameEnded(false);
    setGameResult(null);
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
        {gameEnded ? (
          // Game End State
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-8 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-4xl font-bold text-white mb-4">BALLOON POPPED!</h1>
              <div className="text-xl text-white/80 mb-6">
                The balloon couldn't take the pressure anymore!
              </div>
              
              {gameResult && (
                <div className="bg-white/10 rounded-lg p-6 mb-6">
                  <h2 className="text-2xl font-bold text-white mb-4">🏆 Game Results</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-yellow-500/20 rounded-lg p-4">
                      <div className="text-yellow-300 font-bold text-lg">🥇 Winner</div>
                      <div className="text-white font-mono text-sm">
                        {gameResult.winner ? `${gameResult.winner.slice(0, 6)}...${gameResult.winner.slice(-4)}` : 'None'}
                      </div>
                      <div className="text-yellow-200 text-sm">
                        {gameResult.payout_structure?.winner_amount ? 
                          `${parseFloat(gameResult.payout_structure.winner_amount).toFixed(2)} tokens` : 
                          '0 tokens'
                        }
                      </div>
                    </div>
                    <div className="bg-gray-500/20 rounded-lg p-4">
                      <div className="text-gray-300 font-bold text-lg">🥈 Second</div>
                      <div className="text-white font-mono text-sm">
                        {gameResult.second ? `${gameResult.second.slice(0, 6)}...${gameResult.second.slice(-4)}` : 'None'}
                      </div>
                      <div className="text-gray-200 text-sm">
                        {gameResult.payout_structure?.second_amount ? 
                          `${parseFloat(gameResult.payout_structure.second_amount).toFixed(2)} tokens` : 
                          '0 tokens'
                        }
                      </div>
                    </div>
                    <div className="bg-orange-500/20 rounded-lg p-4">
                      <div className="text-orange-300 font-bold text-lg">🥉 Third</div>
                      <div className="text-white font-mono text-sm">
                        {gameResult.third ? `${gameResult.third.slice(0, 6)}...${gameResult.third.slice(-4)}` : 'None'}
                      </div>
                      <div className="text-orange-200 text-sm">
                        {gameResult.payout_structure?.third_amount ? 
                          `${parseFloat(gameResult.payout_structure.third_amount).toFixed(2)} tokens` : 
                          '0 tokens'
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-white/80 mb-2">
                      Final Pressure: <span className="font-bold text-white">{gameResult.pressure}</span>
                    </div>
                    <div className="text-white/80 mb-2">
                      Total Pot: <span className="font-bold text-white">{parseFloat(gameResult.pot).toFixed(2)} tokens</span>
                    </div>
                    <div className="text-white/60 text-sm">
                      Pop Reason: {gameResult.pop_reason === 'random_pop' ? 'Random chance' : 'Pressure threshold'}
                    </div>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleStartNewGame}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-8 rounded-lg text-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                🎈 Start New Game
              </button>
            </div>
          </div>
        ) : (
          // Active Game State
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Game Stats & Balloon */}
            <div className="lg:col-span-2 space-y-6">
              <GameStats 
                gameState={gameState}
                userBalance={userBalance}
              />
              
              <div className="flex justify-center">
                <Balloon
                  size={Math.min(((gameState?.pressure || gameState?.currentPressure || 0) / 1000) * 100, 200)}
                  isPopped={false} // Balloon is never "popped" in UI - it just pops when it pops
                  riskLevel={gameState?.riskLevel}
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
        )}
      </div>
    </div>
  );
}