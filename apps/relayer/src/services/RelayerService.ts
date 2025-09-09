import { ethers } from 'ethers';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BALLOON_PUMP_ABI, getCurrentChainConfig } from '../shared';
import { logger } from '../utils/logger';
import { PumpRequest, PumpResult } from '../types';
import { TestModeService } from './TestModeService';

export class RelayerService {
  private provider: ethers.JsonRpcProvider;
  private fallbackProvider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;
  private supabase: SupabaseClient;
  private config = getCurrentChainConfig();
  private testModeService: TestModeService;
  private isTestMode: boolean;

  constructor() {
    // Check if we're in test mode
    this.isTestMode = process.env.NODE_ENV === 'test' || process.env.TEST_MODE === 'true';

    if (this.isTestMode) {
      logger.info('🎮 Running in TEST MODE - Using Supabase-only token tracking');
      this.initializeTestMode();
    } else {
      logger.info('⛓️ Running in PRODUCTION MODE - Using blockchain');
      this.initializeProviders();
    }

    this.initializeSupabase();
  }

  private initializeProviders() {
    const primaryUrl = process.env.RPC_URL_PRIMARY;
    const fallbackUrl = process.env.RPC_URL_FALLBACK;

    if (!primaryUrl) {
      throw new Error('RPC_URL_PRIMARY is required for production mode');
    }

    this.provider = new ethers.JsonRpcProvider(primaryUrl);

    if (fallbackUrl) {
      this.fallbackProvider = new ethers.JsonRpcProvider(fallbackUrl);
    }
  }

  private initializeTestMode() {
    this.testModeService = new TestModeService();
  }

  private initializeSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async initialize(): Promise<void> {
    try {
      if (this.isTestMode) {
        // Test mode initialization
        logger.info('🎮 Test mode initialized - Ready for Supabase-only operations');
        return;
      }

      // Production mode initialization
      const privateKey = process.env.RELAYER_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('RELAYER_PRIVATE_KEY is required for production mode');
      }

      this.wallet = new ethers.Wallet(privateKey, this.provider);

      // Initialize contract
      const contractAddress = process.env.CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('CONTRACT_ADDRESS is required for production mode');
      }

      this.contract = new ethers.Contract(contractAddress, BALLOON_PUMP_ABI, this.wallet);

      // Test connection
      const network = await this.provider.getNetwork();
      logger.info(`✅ Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
      logger.info(`📝 Relayer address: ${this.wallet.address}`);

      // Verify contract
      const code = await this.provider.getCode(contractAddress);
      if (code === '0x') {
        throw new Error(`No contract found at address: ${contractAddress}`);
      }

      logger.info(`✅ Contract verified at: ${contractAddress}`);

    } catch (error) {
      logger.error('❌ Failed to initialize relayer:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Clean up connections if needed
    logger.info('✅ Relayer disconnected');
  }

  async validatePumpRequest(request: PumpRequest): Promise<boolean> {
    try {
      // Check user vault balance
      const vaultBalance = await this.contract.vaults(request.userAddress, request.token);
      if (vaultBalance < request.amount) {
        logger.warn(`❌ Insufficient vault balance for ${request.userAddress}: ${vaultBalance} < ${request.amount}`);
        return false;
      }

      // Check rate limits
      const userRequests = await this.getUserRequestsLastMinute(request.userAddress);
      const maxRequests = parseInt(process.env.MAX_TX_PER_MINUTE_PER_USER || '10');

      if (userRequests >= maxRequests) {
        logger.warn(`❌ Rate limit exceeded for ${request.userAddress}: ${userRequests}/${maxRequests}`);
        return false;
      }

      // Check if round is active
      const roundData = await this.contract.getCurrentRound();
      if (!roundData.open) {
        logger.warn(`❌ Round is not active: ${roundData.id}`);
        return false;
      }

      return true;

    } catch (error) {
      logger.error('❌ Error validating pump request:', error);
      return false;
    }
  }

  async relayPump(request: PumpRequest): Promise<PumpResult> {
    const startTime = Date.now();

    try {
      logger.info(`🎈 Starting pump relay for ${request.userAddress}, amount: ${request.amount}`);

      if (this.isTestMode) {
        // Test mode: Use Supabase simulation
        return await this.testModeService.simulatePump(request.userAddress, request.amount.toString());
      }

      // HYBRID MODE: Instant Supabase update + Blockchain transaction
      
      // 1. INSTANT: Update Supabase immediately for responsive UI
      const optimisticResult = await this.applyOptimisticUpdate(request);
      if (!optimisticResult.success) {
        return {
          success: false,
          requestId: request.id,
          error: optimisticResult.error
        };
      }

      // 2. VALIDATE: Check blockchain state
      const isValid = await this.validatePumpRequest(request);
      if (!isValid) {
        // Rollback optimistic update
        await this.rollbackOptimisticUpdate(request);
        return {
          success: false,
          requestId: request.id,
          error: 'Request validation failed'
        };
      }

      // 3. BLOCKCHAIN: Execute the pump transaction
      const tx = await this.contract.pump(
        request.userAddress,
        request.token,
        request.amount,
        {
          gasLimit: 200000,
          gasPrice: await this.getOptimalGasPrice()
        }
      );

      logger.info(`📤 Transaction sent: ${tx.hash}`);

      // 4. UPDATE: Mark as pending blockchain confirmation
      await this.updatePumpStatus(request.id, 'sent', tx.hash);

      // 5. CONFIRM: Wait for blockchain confirmation (async)
      this.confirmTransactionAsync(request, tx);

      // 6. RETURN: Immediate success with optimistic update
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        requestId: request.id,
        transactionHash: tx.hash,
        blockNumber: 0, // Will be updated when confirmed
        gasUsed: '0', // Will be updated when confirmed
        duration,
        pending: true // Indicates blockchain confirmation pending
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Pump failed after ${duration}ms:`, error);

      // Rollback optimistic update
      if (!this.isTestMode) {
        await this.rollbackOptimisticUpdate(request);
      }

      // Update database with failure
      await this.updatePumpStatus(request.id, 'failed', undefined, error.message);

      // Log failure
      await this.logPumpAction(request, undefined, 'failed', error.message);

      return {
        success: false,
        requestId: request.id,
        error: error.message,
        duration
      };
    }
  }

  private async getOptimalGasPrice(): Promise<bigint> {
    try {
      const feeData = await this.provider.getFeeData();

      // Use priority fee if set, otherwise use max fee
      const priorityFee = process.env.PRIORITY_FEE
        ? BigInt(process.env.PRIORITY_FEE)
        : feeData.maxFeePerGas || feeData.gasPrice || BigInt(5000000000); // 5 gwei fallback

      return priorityFee;
    } catch (error) {
      logger.warn('⚠️ Failed to get optimal gas price, using fallback');
      return BigInt(5000000000); // 5 gwei fallback
    }
  }

  private async getUserRequestsLastMinute(userAddress: string): Promise<number> {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

      const { count, error } = await this.supabase
        .from('pumps')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userAddress)
        .gte('requested_at', oneMinuteAgo);

      if (error) throw error;
      return count || 0;

    } catch (error) {
      logger.error('❌ Error checking user rate limit:', error);
      return 0; // Allow request if we can't check
    }
  }

  private async updatePumpStatus(
    requestId: string,
    status: string,
    txHash?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        relayed_tx: txHash,
        updated_at: new Date().toISOString()
      };

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      const { error } = await this.supabase
        .from('pumps')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

    } catch (error) {
      logger.error('❌ Error updating pump status:', error);
    }
  }

  private async logPumpAction(
    request: PumpRequest,
    txHash: string | undefined,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_actions')
        .insert({
          session_id: request.sessionId,
          wallet_address: request.userAddress,
          action: 'pump_balloon',
          amount: request.amount.toString(),
          transaction_hash: txHash,
          metadata: {
            status,
            error: errorMessage,
            roundId: request.roundId?.toString()
          }
        });

      if (error) throw error;

    } catch (error) {
      logger.error('❌ Error logging pump action:', error);
    }
  }

  // Test mode methods
  async getUserBalance(walletAddress: string): Promise<string> {
    if (this.isTestMode) {
      return await this.testModeService.getUserBalance(walletAddress);
    }
    // In production, this would query the smart contract
    return '0';
  }

  async depositToVault(walletAddress: string, amount: string): Promise<boolean> {
    if (this.isTestMode) {
      return await this.testModeService.simulateDeposit(walletAddress, amount);
    }
    // In production, this would call smart contract deposit
    return false;
  }

  async withdrawFromVault(walletAddress: string, amount: string): Promise<boolean> {
    if (this.isTestMode) {
      return await this.testModeService.simulateWithdraw(walletAddress, amount);
    }
    // In production, this would call smart contract withdraw
    return false;
  }

  async getGameState(): Promise<any> {
    if (this.isTestMode) {
      return await this.testModeService.getGameState();
    }
    // In production, this would query smart contract
    return {
      roundId: 1,
      status: 'active',
      pressure: 0,
      pot: 0,
      lastPumpers: []
    };
  }

  async getLeaderboard(limit: number = 10): Promise<any[]> {
    if (this.isTestMode) {
      return await this.testModeService.getLeaderboard(limit);
    }
    // In production, this would query smart contract or additional data
    return [];
  }

  // HYBRID MODE: Optimistic Updates
  private async applyOptimisticUpdate(request: PumpRequest): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Check user has enough vault balance in Supabase cache
      const { data: user, error: userError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('evm_address', request.userAddress.toLowerCase())
        .single();

      if (userError || !user) {
        return { success: false, error: 'User not found' };
      }

      // 2. Update game state optimistically
      const pumpAmount = request.amount.toString();
      
      // Update rounds cache with new pressure
      const { data: round, error: roundError } = await this.supabase
        .from('rounds_cache')
        .select('*')
        .eq('round_id', 1)
        .single();

      if (roundError || !round) {
        return { success: false, error: 'Round not found' };
      }

      const currentPressure = parseFloat(round.pressure || '0');
      const newPressure = currentPressure + (parseFloat(pumpAmount) / 10); // 1/10th of pump amount adds to pressure
      const currentPot = parseFloat(round.pot || '0');
      const newPot = currentPot + (parseFloat(pumpAmount) * 0.1); // 10% goes to pot

      // Check if balloon should pop (>100 pressure)
      const shouldPop = newPressure > 100;

      if (shouldPop) {
        // Reset round and distribute rewards
        await this.handleBalloonPop(request.userAddress, newPot);
      } else {
        // Update round state
        await this.supabase
          .from('rounds_cache')
          .update({
            pressure: newPressure.toString(),
            pot: newPot.toString(),
            last1: round.last2 || null,
            last2: round.last3 || null,
            last3: request.userAddress.toLowerCase()
          })
          .eq('round_id', 1);
      }

      // 3. Record pump action
      await this.supabase
        .from('pumps')
        .update({
          status: 'optimistic' // Special status for optimistic updates
        })
        .eq('id', request.id);

      logger.info(`✅ Applied optimistic update for ${request.userAddress}: +${pumpAmount} pump`);
      return { success: true };

    } catch (error: any) {
      logger.error('❌ Failed to apply optimistic update:', error);
      return { success: false, error: error.message };
    }
  }

  private async rollbackOptimisticUpdate(request: PumpRequest): Promise<void> {
    try {
      // This would require storing the previous state
      // For now, we'll mark the pump as failed
      await this.supabase
        .from('pumps')
        .update({
          status: 'failed',
          error_message: 'Optimistic update rolled back'
        })
        .eq('id', request.id);

      logger.warn(`⚠️ Rolled back optimistic update for ${request.userAddress}`);
    } catch (error) {
      logger.error('❌ Failed to rollback optimistic update:', error);
    }
  }

  private async handleBalloonPop(winnerAddress: string, potAmount: number): Promise<void> {
    try {
      // Distribute rewards: 85% to winner, 10% to 2nd, 3% to 3rd, 2% platform
      const winnerReward = potAmount * 0.85;
      
      // Award winner
      await this.supabase
        .from('profiles')
        .update({
          test_tokens: this.supabase.raw(`CAST(CAST(test_tokens AS DECIMAL) + ${winnerReward} AS TEXT)`)
        })
        .eq('evm_address', winnerAddress.toLowerCase());

      // Reset round
      await this.supabase
        .from('rounds_cache')
        .update({
          pressure: '0',
          pot: '0',
          last1: null,
          last2: null,
          last3: null,
          status: 'active'
        })
        .eq('round_id', 1);

      logger.info(`🎉 Balloon popped! Winner: ${winnerAddress}, Reward: ${winnerReward}`);
    } catch (error) {
      logger.error('❌ Failed to handle balloon pop:', error);
    }
  }

  private async confirmTransactionAsync(request: PumpRequest, tx: any): Promise<void> {
    try {
      // Wait for blockchain confirmation
      const receipt = await tx.wait();
      
      logger.info(`✅ Blockchain confirmation: ${tx.hash} in block ${receipt.blockNumber}`);

      // Update database with confirmed status
      await this.updatePumpStatus(request.id, 'confirmed', tx.hash);

      // Update with actual gas used
      await this.supabase
        .from('pumps')
        .update({
          gas_used: receipt.gasUsed.toString(),
          block_number: receipt.blockNumber
        })
        .eq('id', request.id);

      // Log successful confirmation
      await this.logPumpAction(request, tx.hash, 'confirmed');

    } catch (error: any) {
      logger.error(`❌ Blockchain confirmation failed for ${request.id}:`, error);
      
      // Mark as blockchain failed but keep optimistic update
      await this.updatePumpStatus(request.id, 'blockchain_failed', tx.hash, error.message);
    }
  }

  // Health check method
  async getHealthStatus(): Promise<any> {
    if (this.isTestMode) {
      return {
        status: 'healthy',
        mode: 'test',
        message: 'Running in test mode with Supabase-only token tracking'
      };
    }

    try {
      const blockNumber = await this.provider.getBlockNumber();
      const balance = await this.provider.getBalance(this.wallet.address);

      return {
        status: 'healthy',
        mode: 'hybrid',
        message: 'Running in hybrid mode: Supabase + BNB blockchain',
        blockNumber,
        relayerBalance: ethers.formatEther(balance),
        network: await this.provider.getNetwork()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        mode: 'hybrid',
        error: error.message
      };
    }
  }
}
