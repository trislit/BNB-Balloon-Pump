'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { apiClient } from '@/lib/apiClient';

interface PumpControlsProps {
  userBalance?: string;
  onPumpSuccess?: () => void;
}

export function PumpControls({ userBalance = '0', onPumpSuccess }: PumpControlsProps) {
  const { address } = useAccount();
  const [pumpAmount, setPumpAmount] = useState('100');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handlePump = async () => {
    if (!address || !pumpAmount || isLoading) return;

    setIsLoading(true);
    setLastResult(null);

    try {
      const result = await apiClient.pump({
        userAddress: address,
        amount: pumpAmount,
      });

      if (result.success) {
        setLastResult('success');
        onPumpSuccess?.();
        
        // Clear success message after 3 seconds
        setTimeout(() => setLastResult(null), 3000);
      } else {
        setLastResult(`error: ${result.error}`);
      }
    } catch (error) {
      console.error('Pump failed:', error);
      setLastResult('error: Failed to pump balloon');
    } finally {
      setIsLoading(false);
    }
  };

  const maxPumpAmount = Math.min(parseFloat(userBalance), 1000);
  const balanceNum = parseFloat(userBalance);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-white/80 text-sm">
        <span>Pump Amount:</span>
        <span>Balance: {userBalance} Test Tokens</span>
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
        disabled={isLoading || !address || Number(pumpAmount) > balanceNum || Number(pumpAmount) <= 0}
        className="w-full gradient-button disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Pumping...
          </div>
        ) : (
          '🎈 Pump Balloon'
        )}
      </button>

      {lastResult === 'success' && (
        <div className="text-center text-green-400 font-semibold animate-bounce">
          🎉 Balloon Pumped! +{pumpAmount} pressure
        </div>
      )}

      {lastResult && lastResult.startsWith('error:') && (
        <div className="text-center text-red-400 font-semibold">
          ❌ {lastResult.replace('error: ', '')}
        </div>
      )}
    </div>
  );
}
