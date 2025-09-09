import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  nicknames: Record<string, string>; // address -> nickname mapping
  setNickname: (address: string, nickname: string) => void;
  getNickname: (address: string) => string;
  clearNickname: (address: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      nicknames: {},
      
      setNickname: (address: string, nickname: string) => {
        set((state) => ({
          nicknames: {
            ...state.nicknames,
            [address.toLowerCase()]: nickname
          }
        }));
      },
      
      getNickname: (address: string) => {
        const nickname = get().nicknames[address.toLowerCase()];
        return nickname || `${address.slice(0, 6)}...${address.slice(-4)}`;
      },
      
      clearNickname: (address: string) => {
        set((state) => {
          const newNicknames = { ...state.nicknames };
          delete newNicknames[address.toLowerCase()];
          return { nicknames: newNicknames };
        });
      }
    }),
    {
      name: 'balloon-pump-user-storage',
    }
  )
);
