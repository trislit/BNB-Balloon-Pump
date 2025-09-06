import Web3 from 'web3';
import axios from 'axios';

export class BlockchainService {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this.tatumApiKey = 't-68ace357796ef2921a09788e-a0929c1a43484924a195db6f';
    this.contractAddress = process.env.CONTRACT_ADDRESS || null;
  }

  async initialize() {
    try {
      // Initialize Web3 with Tatum BNB provider
      const tatumProvider = `https://api.tatum.io/v3/blockchain/node/bsc/${this.tatumApiKey}`;
      this.web3 = new Web3(tatumProvider);

      console.log('✅ Connected to BNB Smart Chain via Tatum');

      // Load contract if address is provided
      if (this.contractAddress) {
        await this.loadContract();
      }
    } catch (error) {
      console.error('❌ Error initializing blockchain service:', error);
      throw error;
    }
  }

  async loadContract() {
    try {
      // Contract ABI would be imported/generated from the compiled contract
      const contractABI = [
        // ERC20 standard functions
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
          "constant": false,
          "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}],
          "name": "transfer",
          "outputs": [{"name": "", "type": "bool"}],
          "type": "function"
        },
        // Game-specific functions
        {
          "constant": false,
          "inputs": [{"name": "player", "type": "address"}, {"name": "balloonSize", "type": "uint256"}],
          "name": "pumpBalloon",
          "outputs": [],
          "type": "function"
        },
        {
          "constant": false,
          "inputs": [{"name": "player", "type": "address"}, {"name": "pumpsLost", "type": "uint256"}],
          "name": "balloonPopped",
          "outputs": [],
          "type": "function"
        },
        {
          "constant": false,
          "inputs": [{"name": "player", "type": "address"}, {"name": "amount", "type": "uint256"}],
          "name": "distributeGameReward",
          "outputs": [],
          "type": "function"
        }
      ];

      this.contract = new this.web3.eth.Contract(contractABI, this.contractAddress);
      console.log('✅ Contract loaded at:', this.contractAddress);
    } catch (error) {
      console.error('❌ Error loading contract:', error);
    }
  }

  async deployContract(contractCode) {
    try {
      const response = await axios.post(
        'https://api.tatum.io/v3/blockchain/sc/deploy',
        {
          chain: 'BSC',
          contractAddress: process.env.OWNER_ADDRESS,
          privateKey: process.env.PRIVATE_KEY,
          body: contractCode
        },
        {
          headers: {
            'x-api-key': this.tatumApiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      this.contractAddress = response.data.contractAddress;
      console.log('🚀 Contract deployed at:', this.contractAddress);

      // Reload contract with new address
      await this.loadContract();

      return response.data;
    } catch (error) {
      console.error('❌ Error deploying contract:', error);
      throw error;
    }
  }

  async getBalance(address) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const balance = await this.contract.methods.balanceOf(address).call();
      return this.web3.utils.fromWei(balance, 'ether');
    } catch (error) {
      console.error('❌ Error getting balance:', error);
      throw error;
    }
  }

  async enterGame(playerAddress, amount) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const amountWei = this.web3.utils.toWei(amount.toString(), 'ether');

      console.log(`🎮 ${playerAddress} entering game with ${amount} BPM`);

      // This would require the player's signature
      const txData = this.contract.methods.enterGame(amountWei).encodeABI();

      return {
        success: true,
        txData: txData,
        message: `Prepared transaction to enter game with ${amount} BPM`
      };
    } catch (error) {
      console.error('❌ Error entering game:', error);
      throw error;
    }
  }

  async pumpBalloon(playerAddress, pumpAmount) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const amountWei = this.web3.utils.toWei(pumpAmount.toString(), 'ether');

      console.log(`🎈 ${playerAddress} pumping balloon with ${pumpAmount} BPM`);

      const txData = this.contract.methods.pumpBalloon(amountWei).encodeABI();

      return {
        success: true,
        txData: txData,
        message: `Prepared transaction to pump balloon with ${pumpAmount} BPM`
      };
    } catch (error) {
      console.error('❌ Error pumping balloon:', error);
      throw error;
    }
  }

  async withdrawFromVault(playerAddress, amount) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const amountWei = this.web3.utils.toWei(amount.toString(), 'ether');

      console.log(`💰 ${playerAddress} withdrawing ${amount} BPM from vault`);

      const txData = this.contract.methods.withdrawFromVault(amountWei).encodeABI();

      return {
        success: true,
        txData: txData,
        message: `Prepared transaction to withdraw ${amount} BPM from vault`
      };
    } catch (error) {
      console.error('❌ Error withdrawing from vault:', error);
      throw error;
    }
  }

  async getPlayerInfo(playerAddress) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const playerInfo = await this.contract.methods.getPlayerInfo(playerAddress).call();
      return {
        vaultBalance: this.web3.utils.fromWei(playerInfo.vaultBalance, 'ether'),
        totalPumps: playerInfo.totalPumps,
        lastPumpTime: new Date(parseInt(playerInfo.lastPumpTime) * 1000),
        isActive: playerInfo.isActive
      };
    } catch (error) {
      console.error('❌ Error getting player info:', error);
      throw error;
    }
  }

  async getGameStats() {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const gameStats = await this.contract.methods.getGameStats().call();
      return {
        balloonSize: this.web3.utils.fromWei(gameStats.balloonSize, 'ether'),
        vaultBalance: this.web3.utils.fromWei(gameStats.vaultBalance, 'ether'),
        jackpot: this.web3.utils.fromWei(gameStats.jackpot, 'ether'),
        burned: this.web3.utils.fromWei(gameStats.burned, 'ether'),
        active: gameStats.active,
        startTime: new Date(parseInt(gameStats.startTime) * 1000),
        popProbability: gameStats.popProbability / 100 // Convert to percentage
      };
    } catch (error) {
      console.error('❌ Error getting game stats:', error);
      throw error;
    }
  }

  async getLastThreePumpers() {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const pumpers = await this.contract.methods.getLastThreePumpers().call();
      return {
        addresses: pumpers.addresses,
        amounts: pumpers.amounts.map(amount => this.web3.utils.fromWei(amount, 'ether')),
        timestamps: pumpers.timestamps.map(ts => new Date(parseInt(ts) * 1000))
      };
    } catch (error) {
      console.error('❌ Error getting last three pumpers:', error);
      throw error;
    }
  }

  async getPlayerStats(address) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const stats = await this.contract.methods.getPlayerStats(address).call();
      return {
        rewards: this.web3.utils.fromWei(stats.rewards, 'ether'),
        balloonsPopped: stats.popped,
        successfulPumps: stats.pumps,
        balance: this.web3.utils.fromWei(stats.balance, 'ether')
      };
    } catch (error) {
      console.error('❌ Error getting player stats:', error);
      throw error;
    }
  }

  async mintTokens(amount) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      const amountWei = this.web3.utils.toWei(amount.toString(), 'ether');

      // This would require the owner's private key for signing
      // In production, this should be done through a secure backend
      console.log(`🪙 Minting ${amount} tokens...`);

      // For now, just log the transaction that would be sent
      const txData = this.contract.methods.distributeGameReward(
        process.env.OWNER_ADDRESS, // recipient
        amountWei
      ).encodeABI();

      return {
        success: true,
        amount: amount,
        txData: txData,
        message: 'Transaction prepared for minting'
      };
    } catch (error) {
      console.error('❌ Error minting tokens:', error);
      throw error;
    }
  }

  async pumpBalloon(playerAddress, balloonSize) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      console.log(`🎈 Recording pump for ${playerAddress}, size: ${balloonSize}`);

      // Prepare transaction data
      const txData = this.contract.methods.pumpBalloon(
        playerAddress,
        balloonSize
      ).encodeABI();

      return {
        success: true,
        player: playerAddress,
        balloonSize: balloonSize,
        txData: txData,
        message: 'Pump transaction prepared'
      };
    } catch (error) {
      console.error('❌ Error recording pump:', error);
      throw error;
    }
  }

  async recordBalloonPop(playerAddress, pumpsLost) {
    try {
      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      console.log(`💥 Recording balloon pop for ${playerAddress}, pumps lost: ${pumpsLost}`);

      const txData = this.contract.methods.balloonPopped(
        playerAddress,
        pumpsLost
      ).encodeABI();

      return {
        success: true,
        player: playerAddress,
        pumpsLost: pumpsLost,
        txData: txData,
        message: 'Balloon pop transaction prepared'
      };
    } catch (error) {
      console.error('❌ Error recording balloon pop:', error);
      throw error;
    }
  }

  async getBNBBalance(address) {
    try {
      const balance = await this.web3.eth.getBalance(address);
      return this.web3.utils.fromWei(balance, 'ether');
    } catch (error) {
      console.error('❌ Error getting BNB balance:', error);
      throw error;
    }
  }

  async getTransactionHistory(address, limit = 10) {
    try {
      const response = await axios.get(
        `https://api.tatum.io/v3/blockchain/sc/address/transaction/${this.contractAddress}`,
        {
          headers: { 'x-api-key': this.tatumApiKey },
          params: { address: address, limit: limit }
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ Error getting transaction history:', error);
      throw error;
    }
  }
}

