'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/lib/userStore';
import { apiClient, LeaderboardEntry } from '@/lib/apiClient';

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'all-time'>('all-time');
  const { getNickname } = useUserStore();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await apiClient.getLeaderboard(10);
        setEntries(data);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        // Use mock data if API fails
        setEntries([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [timeframe]);

  const getRankIcon = (rank: number) => {
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
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {entries.map((entry, index) => {
            const displayName = entry.nickname || getNickname(entry.user_id);
            const rank = index + 1;
            
            return (
              <div
                key={entry.user_id}
                className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                  index < 3
                    ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`text-lg font-bold ${getRankColor(rank)}`}>
                    {getRankIcon(rank)}
                  </div>
                  <div>
                    <div className="text-white font-medium">{displayName}</div>
                    <div className="font-mono text-white/60 text-xs">
                      {entry.user_id.slice(0, 6)}...{entry.user_id.slice(-4)}
                    </div>
                    <div className="text-white/60 text-xs">
                      {entry.total_pumps} pumps
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-bold">
                    {parseFloat(entry.total_winnings).toFixed(1)} Tokens
                  </div>
                  <div className="text-white/60 text-xs">winnings</div>
                </div>
              </div>
            );
          })}

          {entries.length === 0 && (
            <div className="text-center py-8 text-white/60">
              No players yet. Be the first to pump!
            </div>
          )}
        </div>
      )}

      {/* Stats Summary */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-400">{entries.length}</div>
            <div className="text-white/60 text-xs">Total Players</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">
              {entries.reduce((sum, entry) => sum + parseFloat(entry.total_winnings), 0).toFixed(1)} Tokens
            </div>
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