'use client';

import { formatEther } from '@/lib/shared';

interface GameStatsProps {
  round?: any;
  userVault?: bigint;
}

export function GameStats({ round, userVault }: GameStatsProps) {
  const pressure = round?.pressure ? Number(round.pressure) : 0;
  const threshold = round?.threshold ? Number(round.threshold) : 10000;
  const pot = round?.pot ? Number(round.pot) : 0;
  const pressurePercentage = threshold > 0 ? (pressure / threshold) * 100 : 0;

  const stats = [
    {
      label: 'Round Status',
      value: round?.open ? 'Active' : 'Ended',
      color: round?.open ? 'text-green-400' : 'text-red-400',
      icon: round?.open ? '🎈' : '💥',
    },
    {
      label: 'Pressure',
      value: `${pressure.toLocaleString()} / ${threshold.toLocaleString()}`,
      color: 'text-blue-400',
      icon: '⚡',
    },
    {
      label: 'Pot Size',
      value: `${formatEther(BigInt(pot))} BNB`,
      color: 'text-yellow-400',
      icon: '💰',
    },
    {
      label: 'Risk Level',
      value: pressurePercentage > 80 ? 'Very High' : pressurePercentage > 60 ? 'High' : pressurePercentage > 40 ? 'Medium' : 'Low',
      color: pressurePercentage > 60 ? 'text-red-400' : pressurePercentage > 40 ? 'text-yellow-400' : 'text-green-400',
      icon: pressurePercentage > 60 ? '🔴' : pressurePercentage > 40 ? '🟡' : '🟢',
    },
    {
      label: 'Your Vault',
      value: userVault ? `${formatEther(userVault)} BNB` : '0 BNB',
      color: 'text-purple-400',
      icon: '🏦',
    },
    {
      label: 'Last Pumpers',
      value: round?.lastThree?.filter((addr: string) => addr !== '0x0000000000000000000000000000000000000000').length || 0,
      color: 'text-indigo-400',
      icon: '👥',
    },
  ];

  return (
    <div className="glass-card p-6">
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

      {/* Last Three Pumpers */}
      {round?.lastThree && round.lastThree.some((addr: string) => addr !== '0x0000000000000000000000000000000000000000') && (
        <div className="mt-6">
          <h4 className="text-white font-semibold mb-2">🏆 Last Three Pumpers</h4>
          <div className="space-y-2">
            {round.lastThree.map((address: string, index: number) => {
              if (address === '0x0000000000000000000000000000000000000000') return null;

              const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
              const shortenedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

              return (
                <div key={address} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                  <div className="flex items-center space-x-2">
                    <span>{medal}</span>
                    <span className="text-white/80 font-mono text-sm">{shortenedAddress}</span>
                  </div>
                  <div className="text-white/60 text-xs">
                    {index === 0 ? '85%' : index === 1 ? '10%' : '3%'} of pot
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
