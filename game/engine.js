import { v4 as uuidv4 } from 'uuid';

export class GameEngine {
  constructor() {
    this.players = new Map();
    this.gameState = {
      currentBalloonSize: 0,
      totalVaultBalance: 0,
      currentJackpot: 0,
      totalBurned: 0,
      totalPlayers: 0,
      totalPumps: 0,
      isActive: true
    };
    this.riskMultiplier = 1.0;
  }

  async initialize() {
    console.log('🎯 Game engine initialized with vault-based mechanics');
    console.log('🎈 Balloon pump game ready - deposit tokens and pump the balloon!');
  }

  async addPlayer(playerId, playerName) {
    const player = {
      id: playerId,
      name: playerName,
      vaultBalance: 0,
      totalPumps: 0,
      riskLevel: 0,
      isActive: true,
      joinedAt: new Date(),
      lastPumpTime: null
    };

    this.players.set(playerId, player);
    this.gameState.totalPlayers++;

    return player;
  }

  async depositToVault(playerId, amount) {
    const player = this.players.get(playerId);
    if (!player || !player.isActive) {
      throw new Error('Player not found or inactive');
    }

    if (amount < 10) {
      throw new Error('Minimum deposit is 10 BPM');
    }

    // Update player vault
    player.vaultBalance += amount;

    // Update game totals
    this.gameState.totalVaultBalance += amount;
    this.gameState.currentJackpot += amount;

    return {
      success: true,
      vaultBalance: player.vaultBalance,
      message: `Successfully deposited ${amount} BPM to vault`
    };
  }

  async withdrawFromVault(playerId, amount) {
    const player = this.players.get(playerId);
    if (!player || !player.isActive) {
      throw new Error('Player not found or inactive');
    }

    if (player.vaultBalance < amount) {
      throw new Error('Insufficient vault balance');
    }

    // Update player vault
    player.vaultBalance -= amount;

    // Update game totals
    this.gameState.totalVaultBalance -= amount;

    return {
      success: true,
      vaultBalance: player.vaultBalance,
      message: `Successfully withdrew ${amount} BPM from vault`
    };
  }

  async pumpBalloon(playerId, pumpAmount) {
    const player = this.players.get(playerId);
    if (!player || !player.isActive) {
      throw new Error('Player not found or inactive');
    }

    if (player.vaultBalance < pumpAmount) {
      throw new Error('Insufficient vault balance');
    }

    const currentTime = new Date();
    const timeSinceLastPump = player.lastPumpTime
      ? currentTime - player.lastPumpTime
      : 0;

    // Cooldown mechanism (minimum 1 second between pumps)
    if (timeSinceLastPump < 1000) {
      return {
        success: false,
        reason: 'Too fast! Wait a moment between pumps.',
        cooldown: 1000 - timeSinceLastPump
      };
    }

    // Deduct from vault
    player.vaultBalance -= pumpAmount;
    player.lastPumpTime = currentTime;
    player.totalPumps++;

    // Update balloon size
    this.gameState.currentBalloonSize += pumpAmount;
    this.gameState.totalPumps++;

    // Calculate progressive risk (increases with balloon size)
    const baseRisk = this.gameState.currentBalloonSize / 1000; // Risk increases with size
    player.riskLevel = Math.min(baseRisk, 1);

    // Check if balloon should pop (progressive difficulty)
    const popProbability = Math.min(0.1 + (this.gameState.currentBalloonSize / 10000), 0.5); // Max 50% chance
    const shouldPop = Math.random() < popProbability;

    if (shouldPop && this.gameState.currentBalloonSize > 10) {
      // Balloon popped - distribute rewards
      const jackpotAmount = this.gameState.currentJackpot;

      // Reset balloon
      this.gameState.currentBalloonSize = 0;
      this.gameState.currentJackpot = 0;

      return {
        success: false,
        reason: `💥 Balloon popped! Jackpot of ${jackpotAmount} BPM distributed!`,
        balloonSize: 0,
        riskLevel: 0,
        jackpot: jackpotAmount,
        popped: true
      };
    }

    return {
      success: true,
      balloonSize: this.gameState.currentBalloonSize,
      riskLevel: player.riskLevel,
      pumps: player.totalPumps,
      vaultBalance: player.vaultBalance,
      popProbability: Math.floor(popProbability * 100)
    };
  }

  async cashOut(playerId) {
    const player = this.players.get(playerId);
    if (!player || !player.isActive) {
      throw new Error('Player not found or inactive');
    }

    if (player.vaultBalance < 1) {
      return {
        success: false,
        reason: 'Nothing to withdraw from vault.',
        vaultBalance: player.vaultBalance
      };
    }

    // Withdraw all from vault
    const amount = player.vaultBalance;
    player.vaultBalance = 0;
    this.gameState.totalVaultBalance -= amount;

    return {
      success: true,
      amount: amount,
      vaultBalance: 0,
      message: `Successfully withdrew ${amount} BPM from vault`
    };
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      player.isActive = false;
      this.gameState.totalPlayers--;
    }
  }

  async getCurrentState() {
    return {
      ...this.gameState,
      activePlayers: Array.from(this.players.values()).filter(p => p.isActive),
      timestamp: new Date().toISOString()
    };
  }

  getPlayerStats(playerId) {
    return this.players.get(playerId) || null;
  }

  getLeaderboard() {
    return Array.from(this.players.values())
      .filter(p => p.isActive)
      .sort((a, b) => b.totalReward - a.totalReward)
      .slice(0, 10);
  }
}

