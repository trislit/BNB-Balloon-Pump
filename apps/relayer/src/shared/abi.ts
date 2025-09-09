// Contract ABIs for Balloon Pump Game

export const BALLOON_PUMP_ABI = [
  // Events
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "roundId", "type": "uint256"}
    ],
    "name": "Deposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "Withdrawn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "uint256", "name": "roundId", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "spend", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "pressure", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "pot", "type": "uint256"}
    ],
    "name": "Pumped",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "uint256", "name": "roundId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "pot", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "last", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "second", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "third", "type": "address"}
    ],
    "name": "Popped",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "uint256", "name": "roundId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "winnerAmount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "secondAmount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "thirdAmount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "platformFee", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "burnedAmount", "type": "uint256"}
    ],
    "name": "Settled",
    "type": "event"
  },

  // Read Functions
  {
    "inputs": [],
    "name": "currentRoundId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "rounds",
    "outputs": [
      {"internalType": "uint256", "name": "id", "type": "uint256"},
      {"internalType": "uint256", "name": "pot", "type": "uint256"},
      {"internalType": "uint256", "name": "pressure", "type": "uint256"},
      {"internalType": "uint256", "name": "threshold", "type": "uint256"},
      {"internalType": "uint64", "name": "openedAt", "type": "uint64"},
      {"internalType": "uint64", "name": "poppedAt", "type": "uint64"},
      {"internalType": "address[3]", "name": "lastThree", "type": "address[3]"},
      {"internalType": "bool", "name": "settled", "type": "bool"},
      {"internalType": "bool", "name": "open", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}, {"internalType": "address", "name": "", "type": "address"}],
    "name": "vaults",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "config",
    "outputs": [
      {"internalType": "uint16", "name": "feeBps", "type": "uint16"},
      {"internalType": "uint128", "name": "maxPerPump", "type": "uint128"},
      {"internalType": "uint128", "name": "maxPerRoundUser", "type": "uint128"},
      {"internalType": "address", "name": "feeWallet", "type": "address"},
      {"internalType": "address", "name": "burnWallet", "type": "address"},
      {"internalType": "address", "name": "relayer", "type": "address"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // Write Functions
  {
    "inputs": [
      {"internalType": "address", "name": "token", "type": "uint256"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "token", "type": "uint256"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint256", "name": "deadline", "type": "uint256"},
      {"internalType": "uint8", "name": "v", "type": "uint8"},
      {"internalType": "bytes32", "name": "r", "type": "bytes32"},
      {"internalType": "bytes32", "name": "s", "type": "bytes32"}
    ],
    "name": "depositWithPermit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "token", "type": "uint256"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "spend", "type": "uint256"}
    ],
    "name": "pump",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "token", "type": "address"}],
    "name": "maybePop",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "token", "type": "address"}],
    "name": "settlePayouts",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // Admin Functions
  {
    "inputs": [
      {"internalType": "uint16", "name": "feeBps", "type": "uint16"},
      {"internalType": "uint128", "name": "maxPerPump", "type": "uint128"},
      {"internalType": "uint128", "name": "maxPerRoundUser", "type": "uint128"},
      {"internalType": "address", "name": "feeWallet", "type": "address"},
      {"internalType": "address", "name": "burnWallet", "type": "address"},
      {"internalType": "address", "name": "relayer", "type": "address"}
    ],
    "name": "setConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "threshold", "type": "uint256"}],
    "name": "openRound",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// ERC20 ABI for token interactions
export const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}, {"name": "_spender", "type": "address"}],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [{"name": "_from", "type": "address"}, {"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}],
    "name": "transferFrom",
    "outputs": [{"name": "", "type": "bool"}],
    "type": "function"
  }
] as const;
