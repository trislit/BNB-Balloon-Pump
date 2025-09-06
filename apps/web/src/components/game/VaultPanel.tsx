'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther } from '@balloonpump/shared';
import { BALLOON_PUMP_ABI } from '@balloonpump/shared';
import { getCurrentChainConfig } from '@balloonpump/shared';

interface VaultPanelProps {
  vaultBalance?: bigint;
}

export function VaultPanel({ vaultBalance }: VaultPanelProps) {
  const [depositAmount, setDepositAmount] = useState('100');
  const [withdrawAmount, setWithdrawAmount] = useState('50');
  const config = getCurrentChainConfig();
  const contractAddress = config.contracts.balloonPump;

  const { writeContract: depositContract, data: depositHash, isPending: isDepositPending } = useWriteContract();
  const { writeContract: withdrawContract, data: withdrawHash, isPending: isWithdrawPending } = useWriteContract();

  const { isLoading: isDepositConfirming, isSuccess: isDepositConfirmed } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  const { isLoading: isWithdrawConfirming, isSuccess: isWithdrawConfirmed } = useWaitForTransactionReceipt({
    hash: withdrawHash,
  });

  const handleDeposit = async () => {
    const amount = BigInt(depositAmount);

    try {
      await depositContract({
        address: contractAddress as `0x${string}`,
        abi: BALLOON_PUMP_ABI,
        functionName: 'deposit',
        args: [config.tokens.BNB, amount],
        value: amount, // For BNB deposits
      });
    } catch (error) {
      console.error('Deposit failed:', error);
      alert('Deposit failed. Please try again.');
    }
  };

  const handleWithdraw = async () => {
    if (!vaultBalance || BigInt(withdrawAmount) > vaultBalance) {
      alert('Insufficient vault balance!');
      return;
    }

    const amount = BigInt(withdrawAmount);

    try {
      await withdrawContract({
        address: contractAddress as `0x${string}`,
        abi: BALLOON_PUMP_ABI,
        functionName: 'withdraw',
        args: [config.tokens.BNB, amount],
      });
    } catch (error) {
      console.error('Withdraw failed:', error);
      alert('Withdraw failed. Please try again.');
    }
  };

  return (
    <div className="glass-card p-6">
      <h3 className="text-xl font-bold text-white mb-4">💰 Your Vault</h3>

      {/* Balance Display */}
      <div className="bg-white/10 rounded-lg p-4 mb-4">
        <div className="text-white/80 text-sm mb-1">Vault Balance</div>
        <div className="text-2xl font-bold text-white">
          {vaultBalance ? formatEther(vaultBalance) : '0'} BNB
        </div>
      </div>

      {/* Deposit Section */}
      <div className="mb-4">
        <h4 className="text-white font-semibold mb-2">Deposit BNB</h4>
        <div className="flex space-x-2 mb-2">
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            min="0.01"
            step="0.01"
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Amount in BNB"
          />
          <button
            onClick={() => setDepositAmount('100')}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-colors"
          >
            100
          </button>
          <button
            onClick={() => setDepositAmount('500')}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-colors"
          >
            500
          </button>
        </div>
        <button
          onClick={handleDeposit}
          disabled={isDepositPending || isDepositConfirming}
          className="w-full gradient-button disabled:opacity-50"
        >
          {isDepositPending || isDepositConfirming ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {isDepositConfirming ? 'Depositing...' : 'Preparing...'}
            </div>
          ) : (
            '💰 Deposit to Vault'
          )}
        </button>
        {isDepositConfirmed && (
          <div className="text-green-400 text-sm mt-2 text-center">
            ✅ Deposit successful!
          </div>
        )}
      </div>

      {/* Withdraw Section */}
      <div>
        <h4 className="text-white font-semibold mb-2">Withdraw BNB</h4>
        <div className="flex space-x-2 mb-2">
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            min="0.01"
            step="0.01"
            max={vaultBalance ? formatEther(vaultBalance) : '0'}
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Amount in BNB"
          />
          <button
            onClick={() => setWithdrawAmount(vaultBalance ? formatEther(vaultBalance / BigInt(2)) : '0')}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-colors"
          >
            50%
          </button>
        </div>
        <button
          onClick={handleWithdraw}
          disabled={!vaultBalance || BigInt(withdrawAmount) > vaultBalance || isWithdrawPending || isWithdrawConfirming}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isWithdrawPending || isWithdrawConfirming ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {isWithdrawConfirming ? 'Withdrawing...' : 'Preparing...'}
            </div>
          ) : (
            '💸 Withdraw from Vault'
          )}
        </button>
        {isWithdrawConfirmed && (
          <div className="text-green-400 text-sm mt-2 text-center">
            ✅ Withdrawal successful!
          </div>
        )}
      </div>

      <div className="mt-4 text-white/60 text-xs text-center">
        💡 Deposit BNB to your vault to start pumping balloons!
      </div>
    </div>
  );
}
