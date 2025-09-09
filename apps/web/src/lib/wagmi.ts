import { http, createConfig } from 'wagmi';
import { bsc, bscTestnet } from 'wagmi/chains';
import { walletConnect, injected, metaMask } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'demo-project-id';

export const config = createConfig({
  chains: [bsc, bscTestnet],
  connectors: [
    injected(),
    metaMask(),
    // walletConnect({ projectId }), // Disabled to avoid demo project ID errors
  ],
  transports: {
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
  },
});
