'use client';

import { formatEther } from '@/lib/shared';

interface GameStatsProps {
  gameState?: any;
  userBalance?: string;
}

export function GameStats({ gameState, userBalance = '0' }: GameStatsProps) {
  const pressure = gameState?.pressure || gameState?.currentPressure || 0;
  const pot = gameState?.pot || gameState?.potAmount || '0';
  const pressurePercentage = (pressure / 1000) * 100; // 1000 pressure = 100%
  
  // Calculate pop chance based on pressure
  const getPopChance = () => {
    if (pressure <= 1000) {
      return 3 + ((pressure / 1000) * 12); // 3% to 15%
    } else {
      const excess = (pressure - 1000) / 1000;
      return 15 + (excess * excess * 75); // 15% to 90%
    }
  };
  
  const popChance = Math.min(getPopChance(), 95); // Cap at 95%
  
  const stats = [
    {
      label: 'Round Status',
      value: 'Active',
      color: 'text-green-400',
      icon: '🎈',
    },
    {
      label: 'Pressure',
      value: `${pressure.toFixed(1)} (${pressurePercentage.toFixed(1)}%)`,
      color: pressurePercentage > 100 ? 'text-red-400' : pressurePercentage > 80 ? 'text-orange-400' : 'text-blue-400',
      icon: '⚡',
    },
    {
      label: 'Pop Chance',
      value: `${popChance.toFixed(1)}%`,
      color: popChance > 50 ? 'text-red-400' : popChance > 25 ? 'text-orange-400' : 'text-yellow-400',
      icon: '💥',
    },
    {
      label: 'Pot Size',
      value: `${parseFloat(pot).toFixed(2)} Tokens`,
      color: 'text-yellow-400',
      icon: '💰',
    },
    {
      label: 'Risk Level',
      value: pressurePercentage > 150 ? 'EXTREME' : pressurePercentage > 120 ? 'VERY HIGH' : pressurePercentage > 100 ? 'HIGH' : pressurePercentage > 80 ? 'MEDIUM' : 'LOW',
      color: pressurePercentage > 150 ? 'text-red-500' : pressurePercentage > 120 ? 'text-red-400' : pressurePercentage > 100 ? 'text-orange-400' : pressurePercentage > 80 ? 'text-yellow-400' : 'text-green-400',
      icon: pressurePercentage > 150 ? '🚨' : pressurePercentage > 120 ? '🔴' : pressurePercentage > 100 ? '🟠' : pressurePercentage > 80 ? '🟡' : '🟢',
    },
    {
      label: 'Your Vault',
      value: `${parseFloat(userBalance).toFixed(2)} Tokens`,
      color: 'text-purple-400',
      icon: '🏦',
    },
    {
      label: 'Participants',
      value: gameState?.participantCount || 0,
      color: 'text-indigo-400',
      icon: '👥',
    },
    {
      label: 'Pop Chance',
      value: gameState?.popChance ? `${gameState.popChance}%` : '1.00%',
      color: gameState?.popChance > 10 ? 'text-red-500' : gameState?.popChance > 5 ? 'text-yellow-400' : 'text-green-400',
      icon: '🎲',
    },
  ];

  return (
    <div className="glass-card p-6">
      {isPopped && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4 text-center animate-pulse">
          <div className="text-2xl mb-2">🎉 BALLOON POPPED! 🎉</div>
          <div className="text-red-300 font-bold">
            Last pumper wins {parseFloat(pot).toFixed(2)} tokens!
          </div>
        </div>
      )}
      
      <h3 className="text-xl font-bold text-white mb-4">📊 Game Statistics</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className={`text-lg font-bold ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-white/60 text-xs">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Progress Bar for Pressure */}
      <div className="mt-6">
        <div className="flex justify-between text-white/80 text-sm mb-2">
          <span>Pressure Progress</span>
          <span>{pressurePercentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              pressurePercentage > 80 ? 'bg-red-500' :
              pressurePercentage > 60 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(pressurePercentage, 100)}%` }}
          />
        </div>
        {pressurePercentage > 90 && (
          <div className="text-red-400 text-xs mt-2 text-center animate-pulse">
            ⚠️ CRITICAL RISK - Balloon may pop any moment!
          </div>
        )}
      </div>

      {/* Last Pumper */}
      {gameState?.lastPumpedBy && (
        <div className="mt-6">
          <h4 className="text-white font-semibold mb-2">🏆 Last Pumper</h4>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-white/80 font-mono text-sm">
              {gameState.lastPumpedBy.slice(0, 6)}...{gameState.lastPumpedBy.slice(-4)}
            </div>
            <div className="text-white/60 text-xs mt-1">
              Will win 85% of pot if balloon pops!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
