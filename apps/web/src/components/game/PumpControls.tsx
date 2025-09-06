'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from '@balloonpump/shared';
import { BALLOON_PUMP_ABI } from '@balloonpump/shared';
import { getCurrentChainConfig } from '@balloonpump/shared';

interface PumpControlsProps {
  roundId?: bigint;
  isActive?: boolean;
  userVault?: bigint;
}

export function PumpControls({ roundId, isActive, userVault }: PumpControlsProps) {
  const [pumpAmount, setPumpAmount] = useState('100');
  const config = getCurrentChainConfig();
  const contractAddress = config.contracts.balloonPump;

  const { writeContract, data: hash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const handlePump = async () => {
    if (!roundId || !isActive || !userVault) return;

    const amount = BigInt(pumpAmount);

    if (amount > userVault) {
      alert('Insufficient vault balance!');
      return;
    }

    try {
      writeContract({
        address: contractAddress as `0x${string}`,
        abi: BALLOON_PUMP_ABI,
        functionName: 'pump',
        args: [config.tokens.BNB, amount], // user, token, amount
      });
    } catch (error) {
      console.error('Pump transaction failed:', error);
      alert('Failed to pump balloon. Please try again.');
    }
  };

  const maxPumpAmount = userVault ? Math.min(Number(userVault), 1000) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-white/80 text-sm">
        <span>Pump Amount:</span>
        <span>Balance: {userVault ? formatEther(userVault) : '0'} BNB</span>
      </div>

      <div className="flex space-x-2">
        <input
          type="number"
          value={pumpAmount}
          onChange={(e) => setPumpAmount(e.target.value)}
          min="1"
          max={maxPumpAmount}
          step="10"
          className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter amount"
        />

        <button
          onClick={() => setPumpAmount(Math.floor(maxPumpAmount / 4).toString())}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-colors"
        >
          25%
        </button>

        <button
          onClick={() => setPumpAmount(Math.floor(maxPumpAmount / 2).toString())}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-colors"
        >
          50%
        </button>

        <button
          onClick={() => setPumpAmount(maxPumpAmount.toString())}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-colors"
        >
          MAX
        </button>
      </div>

      <button
        onClick={handlePump}
        disabled={!isActive || isPending || isConfirming || !userVault || Number(pumpAmount) > maxPumpAmount}
        className="w-full gradient-button disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Preparing...
          </div>
        ) : isConfirming ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Pumping...
          </div>
        ) : isConfirmed ? (
          '🎈 Pumped Successfully!'
        ) : (
          '🎈 Pump Balloon'
        )}
      </button>

      {!isActive && (
        <div className="text-center text-red-400 font-semibold animate-pulse">
          ⚠️ Round Ended - Wait for Next Round
        </div>
      )}

      {isConfirmed && (
        <div className="text-center text-green-400 font-semibold animate-bounce">
          🎉 Balloon Pumped! +{pumpAmount} pressure
        </div>
      )}
    </div>
  );
}
