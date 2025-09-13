'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/apiClient';

interface PumpControlsProps {
  userBalance?: string;
  onPumpSuccess?: (result?: any) => void;
}

export function PumpControls({ userBalance = '0', onPumpSuccess }: PumpControlsProps) {
  // DISABLED AUTH - Use test address for testing
  const testAddress = '0x1234567890123456789012345678901234567890';
  const address = testAddress; // Override wallet address with test address
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
        onPumpSuccess?.(result);
        
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
        <span>Pump Amount (from vault):</span>
        <span>Vault: {userBalance} Tokens</span>
      </div>
      <div className="text-xs text-yellow-300 text-center mb-2">
        ⚠️ Balloon can pop randomly! Last 3 pumpers win rewards
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

      <motion.button
        onClick={handlePump}
        disabled={isLoading || !address || Number(pumpAmount) > balanceNum || Number(pumpAmount) <= 0}
        className="w-full gradient-button disabled:opacity-50 disabled:cursor-not-allowed"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={isLoading ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.5, repeat: isLoading ? Infinity : 0 }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Pumping...
          </div>
        ) : (
          '🎈 Pump Balloon'
        )}
      </motion.button>

      {lastResult === 'success' && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          className="text-center text-green-400 font-bold text-lg bg-green-500/20 rounded-lg p-4 border border-green-500/30"
        >
          🎉 Balloon Pumped! +{pumpAmount} pressure
          <div className="text-sm text-green-300 mt-1">
            Balloon is growing! 🎈
          </div>
        </motion.div>
      )}

      {lastResult && lastResult.startsWith('error:') && (
        <div className="text-center text-red-400 font-semibold">
          ❌ {lastResult.replace('error: ', '')}
        </div>
      )}
    </div>
  );
}
