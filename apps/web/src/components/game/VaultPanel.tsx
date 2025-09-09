'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { apiClient } from '@/lib/apiClient';

interface VaultPanelProps {
  userBalance?: string;
  onBalanceUpdate?: () => void;
}

export function VaultPanel({ userBalance = '0', onBalanceUpdate }: VaultPanelProps) {
  const { address } = useAccount();
  const [depositAmount, setDepositAmount] = useState('100');
  const [withdrawAmount, setWithdrawAmount] = useState('50');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleDeposit = async () => {
    if (!address || !depositAmount || isDepositing) return;

    setIsDepositing(true);
    setLastAction(null);

    try {
      const success = await apiClient.depositToVault(address, depositAmount);
      
      if (success) {
        setLastAction('deposit-success');
        onBalanceUpdate?.();
        setTimeout(() => setLastAction(null), 3000);
      } else {
        setLastAction('deposit-error');
      }
    } catch (error) {
      console.error('Deposit failed:', error);
      setLastAction('deposit-error');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!address || !withdrawAmount || isWithdrawing) return;

    const balanceNum = parseFloat(userBalance);
    const withdrawNum = parseFloat(withdrawAmount);

    if (withdrawNum > balanceNum) {
      setLastAction('withdraw-insufficient');
      setTimeout(() => setLastAction(null), 3000);
      return;
    }

    setIsWithdrawing(true);
    setLastAction(null);

    try {
      const success = await apiClient.withdrawFromVault(address, withdrawAmount);
      
      if (success) {
        setLastAction('withdraw-success');
        onBalanceUpdate?.();
        setTimeout(() => setLastAction(null), 3000);
      } else {
        setLastAction('withdraw-error');
      }
    } catch (error) {
      console.error('Withdraw failed:', error);
      setLastAction('withdraw-error');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const balanceNum = parseFloat(userBalance);

  return (
    <div className="glass-card p-6">
      <h3 className="text-xl font-bold text-white mb-4">💰 Your Vault</h3>

      {/* Balance Display */}
      <div className="bg-white/10 rounded-lg p-4 mb-4">
        <div className="text-white/80 text-sm mb-1">Vault Balance</div>
        <div className="text-2xl font-bold text-white">
          {balanceNum.toFixed(2)} Tokens
        </div>
        <div className="text-white/60 text-xs mt-1">
          {process.env.NODE_ENV === 'development' ? 'Test Mode' : 'Production Mode'}
        </div>
      </div>

      {/* Deposit Section */}
      <div className="mb-4">
        <h4 className="text-white font-semibold mb-2">Deposit Tokens</h4>
        <div className="flex space-x-2 mb-2">
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            min="0.01"
            step="0.01"
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Amount to deposit"
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
          disabled={isDepositing || !address || parseFloat(depositAmount) <= 0}
          className="w-full gradient-button disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDepositing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Depositing...
            </div>
          ) : (
            '💰 Deposit to Vault'
          )}
        </button>
        {lastAction === 'deposit-success' && (
          <div className="text-green-400 text-sm mt-2 text-center">
            ✅ Deposit successful!
          </div>
        )}
        {lastAction === 'deposit-error' && (
          <div className="text-red-400 text-sm mt-2 text-center">
            ❌ Deposit failed. Please try again.
          </div>
        )}
      </div>

      {/* Withdraw Section */}
      <div>
        <h4 className="text-white font-semibold mb-2">Withdraw Tokens</h4>
        <div className="flex space-x-2 mb-2">
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            min="0.01"
            step="0.01"
            max={balanceNum}
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Amount to withdraw"
          />
          <button
            onClick={() => setWithdrawAmount((balanceNum / 2).toFixed(2))}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-colors"
          >
            50%
          </button>
        </div>
        <button
          onClick={handleWithdraw}
          disabled={!address || parseFloat(withdrawAmount) > balanceNum || parseFloat(withdrawAmount) <= 0 || isWithdrawing}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isWithdrawing ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Withdrawing...
            </div>
          ) : (
            '💸 Withdraw from Vault'
          )}
        </button>
        {lastAction === 'withdraw-success' && (
          <div className="text-green-400 text-sm mt-2 text-center">
            ✅ Withdrawal successful!
          </div>
        )}
        {lastAction === 'withdraw-error' && (
          <div className="text-red-400 text-sm mt-2 text-center">
            ❌ Withdrawal failed. Please try again.
          </div>
        )}
        {lastAction === 'withdraw-insufficient' && (
          <div className="text-red-400 text-sm mt-2 text-center">
            ❌ Insufficient vault balance!
          </div>
        )}
      </div>

      <div className="mt-4 text-white/60 text-xs text-center">
        💡 Deposit tokens to your vault to start pumping balloons without transaction fees!
      </div>
    </div>
  );
}
