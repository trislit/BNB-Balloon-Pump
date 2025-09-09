'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useUserStore } from '@/lib/userStore';

export function NicknameSelector() {
  const { address } = useAccount();
  const { getNickname, setNickname } = useUserStore();
  const [isEditing, setIsEditing] = useState(false);
  const [tempNickname, setTempNickname] = useState('');

  if (!address) return null;

  const currentNickname = getNickname(address);
  const isDefaultNickname = currentNickname === `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleStartEdit = () => {
    setTempNickname(isDefaultNickname ? '' : currentNickname);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (tempNickname.trim()) {
      setNickname(address, tempNickname.trim());
    }
    setIsEditing(false);
    setTempNickname('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTempNickname('');
  };

  if (isEditing) {
    return (
      <div className="glass-card p-4">
        <div className="space-y-3">
          <div className="text-white/80 text-sm">Choose your display name:</div>
          <input
            type="text"
            value={tempNickname}
            onChange={(e) => setTempNickname(e.target.value)}
            placeholder="Enter nickname..."
            maxLength={20}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!tempNickname.trim()}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 bg-white/10 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/20 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white/80 text-sm">Display Name</div>
          <div className="text-white font-medium">
            {currentNickname}
            {isDefaultNickname && (
              <span className="text-white/50 text-xs ml-2">(Default)</span>
            )}
          </div>
        </div>
        <button
          onClick={handleStartEdit}
          className="text-purple-400 hover:text-purple-300 text-sm underline"
        >
          {isDefaultNickname ? 'Set Nickname' : 'Edit'}
        </button>
      </div>
    </div>
  );
}
