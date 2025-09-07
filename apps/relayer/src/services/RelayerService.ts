import { ethers } from 'ethers';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BALLOON_PUMP_ABI, getCurrentChainConfig } from '@balloonpump/shared';
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

      // Production mode: Use blockchain
      // Validate request
      const isValid = await this.validatePumpRequest(request);
      if (!isValid) {
        return {
          success: false,
          requestId: request.id,
          error: 'Request validation failed'
        };
      }

      // Execute the pump transaction
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

      // Wait for confirmation
      const receipt = await tx.wait();
      const duration = Date.now() - startTime;

      logger.info(`✅ Pump confirmed in block ${receipt.blockNumber}, took ${duration}ms`);

      // Update database
      await this.updatePumpStatus(request.id, 'confirmed', tx.hash);

      // Log success
      await this.logPumpAction(request, tx.hash, 'success');

      return {
        success: true,
        requestId: request.id,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Pump failed after ${duration}ms:`, error);

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
        mode: 'production',
        blockNumber,
        relayerBalance: ethers.formatEther(balance),
        network: await this.provider.getNetwork()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        mode: 'production',
        error: error.message
      };
    }
  }
}
