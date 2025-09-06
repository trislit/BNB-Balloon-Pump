'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { Balloon } from './Balloon';
import { GameStats } from './GameStats';
import { Leaderboard } from './Leaderboard';
import { VaultPanel } from './VaultPanel';
import { PumpControls } from './PumpControls';
import { getCurrentChainConfig } from '@balloonpump/shared';
import { BALLOON_PUMP_ABI } from '@balloonpump/shared';

export function GameContainer() {
  const { data: session } = useSession();
  const { address } = useAccount();
  const [currentRound, setCurrentRound] = useState<any>(null);
  const [userVault, setUserVault] = useState<any>(null);

  const config = getCurrentChainConfig();
  const contractAddress = config.contracts.balloonPump;

  // Read current round data
  const { data: roundData } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: BALLOON_PUMP_ABI,
    functionName: 'getCurrentRound',
    watch: true,
  });

  // Read user vault balance
  const { data: vaultData } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: BALLOON_PUMP_ABI,
    functionName: 'vaults',
    args: address ? [address, config.tokens.BNB] : undefined,
    watch: true,
  });

  useEffect(() => {
    if (roundData) {
      setCurrentRound(roundData);
    }
    if (vaultData) {
      setUserVault(vaultData);
    }
  }, [roundData, vaultData]);

  if (!session || !address) {
    return null; // AuthGuard should handle this
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Game Area */}
      <div className="lg:col-span-2 space-y-6">
        {/* Balloon Display */}
        <div className="glass-card p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Round #{currentRound?.id || 1}</h2>
            <div className="text-white/80">
              Pressure: {currentRound?.pressure ? `${currentRound.pressure.toString()} / ${currentRound.threshold.toString()}` : '0 / 10000'}
            </div>
          </div>

          <div className="flex justify-center mb-6">
            <Balloon
              size={currentRound?.pressure ? Number(currentRound.pressure) / Number(currentRound.threshold) * 100 : 0}
              isPopped={!currentRound?.open}
            />
          </div>

          <PumpControls
            roundId={currentRound?.id}
            isActive={currentRound?.open}
            userVault={userVault}
          />
        </div>

        {/* Game Stats */}
        <GameStats round={currentRound} userVault={userVault} />
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Vault Panel */}
        <VaultPanel vaultBalance={userVault} />

        {/* Leaderboard */}
        <Leaderboard />
      </div>
    </div>
  );
}
