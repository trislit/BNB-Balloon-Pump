'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useSignMessage, useAccount } from 'wagmi';
import { SiweMessage } from 'siwe';

export function SignInWithEthereum() {
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (!address || !chainId) return;

    setIsLoading(true);

    try {
      // Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Balloon Pump Game',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce: Math.random().toString(36).substring(2, 15),
      });

      // Sign the message
      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      // Authenticate with NextAuth
      const result = await signIn('credentials', {
        message: JSON.stringify(message),
        signature,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // Refresh session
      await getSession();

    } catch (error) {
      console.error('SIWE sign-in error:', error);
      alert('Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-white/80 text-sm mb-4">
        Sign this message to prove you own this wallet and access the game.
      </div>

      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className="w-full gradient-button disabled:opacity-50"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Signing...
          </div>
        ) : (
          'Sign In with Ethereum'
        )}
      </button>

      <div className="text-white/60 text-xs text-center">
        This signature proves wallet ownership without revealing your private key.
      </div>
    </div>
  );
}
