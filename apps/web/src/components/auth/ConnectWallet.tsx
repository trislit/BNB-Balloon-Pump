'use client';

import { useState } from 'react';
import { useConnect, useDisconnect, useAccount } from 'wagmi';
import { formatEther } from '@balloonpump/shared';

export function ConnectWallet() {
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected, chain } = useAccount();
  const [showModal, setShowModal] = useState(false);

  if (isConnected && address) {
    return (
      <div className="space-y-4">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80">Connected Wallet</span>
            <button
              onClick={() => disconnect()}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Disconnect
            </button>
          </div>
          <div className="font-mono text-white text-sm">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
          {chain && (
            <div className="text-white/60 text-xs mt-1">
              {chain.name} (Chain ID: {chain.id})
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
          disabled={isPending}
          className="w-full gradient-button disabled:opacity-50"
        >
          {isPending ? 'Connecting...' : `Connect ${connector.name}`}
        </button>
      ))}

      <div className="text-center">
        <button
          onClick={() => setShowModal(true)}
          className="text-white/60 hover:text-white text-sm underline"
        >
          What is a Web3 wallet?
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-white">About Web3 Wallets</h3>
            <div className="text-white/80 space-y-3 text-sm">
              <p>
                A Web3 wallet allows you to interact with blockchain applications and manage your digital assets securely.
              </p>
              <p>
                Popular wallets include MetaMask, Trust Wallet, and Coinbase Wallet. Download one from their official websites.
              </p>
              <p>
                Make sure you're connected to BNB Smart Chain (BSC) network for this game.
              </p>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 w-full gradient-button"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
