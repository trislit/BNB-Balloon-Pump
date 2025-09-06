'use client';

import { useState, useEffect } from 'react';

// Mock leaderboard data - in real app this would come from Supabase
const mockLeaderboard = [
  { address: '0x1234...5678', winnings: 1250.5, popsTriggered: 8, rank: 1 },
  { address: '0xabcd...ef12', winnings: 980.2, popsTriggered: 6, rank: 2 },
  { address: '0x9876...4321', winnings: 756.8, popsTriggered: 5, rank: 3 },
  { address: '0x5555...aaaa', winnings: 623.4, popsTriggered: 4, rank: 4 },
  { address: '0xbbbb...1111', winnings: 445.7, popsTriggered: 3, rank: 5 },
];

export function Leaderboard() {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'all-time'>('all-time');

  const getMedal = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-400';
      case 3: return 'text-amber-600';
      default: return 'text-white/80';
    }
  };

  return (
    <div className="glass-card p-6">
      <h3 className="text-xl font-bold text-white mb-4">🏆 Leaderboard</h3>

      {/* Timeframe Selector */}
      <div className="flex space-x-1 mb-4 bg-white/10 rounded-lg p-1">
        {(['daily', 'weekly', 'all-time'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setTimeframe(period)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              timeframe === period
                ? 'bg-white/20 text-white'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            {period === 'daily' ? 'Today' : period === 'weekly' ? 'This Week' : 'All Time'}
          </button>
        ))}
      </div>

      {/* Leaderboard List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {mockLeaderboard.map((player, index) => (
          <div
            key={player.address}
            className={`flex items-center justify-between p-3 rounded-lg transition-all ${
              index < 3
                ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`text-lg font-bold ${getRankColor(player.rank)}`}>
                {getMedal(player.rank)}
              </div>
              <div>
                <div className="text-white font-medium">{player.address}</div>
                <div className="text-white/60 text-xs">
                  {player.popsTriggered} pops triggered
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-green-400 font-bold">
                {player.winnings.toFixed(1)} BNB
              </div>
              <div className="text-white/60 text-xs">winnings</div>
            </div>
          </div>
        ))}
      </div>

      {/* Stats Summary */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-400">1,247</div>
            <div className="text-white/60 text-xs">Total Players</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">45,892 BNB</div>
            <div className="text-white/60 text-xs">Total Winnings</div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-4 text-center">
        <div className="text-white/60 text-xs">
          💡 Keep pumping to climb the leaderboard!
        </div>
      </div>
    </div>
  );
}
