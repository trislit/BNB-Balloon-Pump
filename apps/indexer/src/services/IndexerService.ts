import { ethers } from 'ethers';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BALLOON_PUMP_ABI, getCurrentChainConfig } from '@balloonpump/shared';
import { logger } from '../utils/logger';

export class IndexerService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private supabase: SupabaseClient;
  private config = getCurrentChainConfig();
  private isRunning = false;
  private lastProcessedBlock: number = 0;

  constructor() {
    this.initializeProviders();
    this.initializeSupabase();
  }

  private initializeProviders() {
    const rpcUrl = process.env.RPC_URL_PRIMARY || process.env.RPC_URL;
    if (!rpcUrl) {
      throw new Error('RPC_URL_PRIMARY or RPC_URL is required');
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  private initializeSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async initialize(): Promise<void> {
    try {
      // Initialize contract
      const contractAddress = process.env.CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('CONTRACT_ADDRESS is required');
      }

      this.contract = new ethers.Contract(contractAddress, BALLOON_PUMP_ABI, this.provider);

      // Test connection
      const network = await this.provider.getNetwork();
      logger.info(`✅ Connected to network: ${network.name} (Chain ID: ${network.chainId})`);

      // Verify contract
      const code = await this.provider.getCode(contractAddress);
      if (code === '0x') {
        throw new Error(`No contract found at address: ${contractAddress}`);
      }

      logger.info(`✅ Contract verified at: ${contractAddress}`);

      // Get last processed block from database
      await this.loadLastProcessedBlock();

    } catch (error) {
      logger.error('❌ Failed to initialize indexer:', error);
      throw error;
    }
  }

  private async loadLastProcessedBlock(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('indexer_state')
        .select('last_block')
        .eq('id', 'balloon_pump_indexer')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.last_block) {
        this.lastProcessedBlock = data.last_block;
        logger.info(`📍 Resuming from block: ${this.lastProcessedBlock}`);
      } else {
        // Start from contract deployment block or recent block
        this.lastProcessedBlock = await this.provider.getBlockNumber() - 1000; // Start 1000 blocks ago
        logger.info(`📍 Starting from block: ${this.lastProcessedBlock}`);
      }
    } catch (error) {
      logger.error('❌ Failed to load last processed block:', error);
      this.lastProcessedBlock = await this.provider.getBlockNumber() - 100;
    }
  }

  private async saveLastProcessedBlock(blockNumber: number): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('indexer_state')
        .upsert({
          id: 'balloon_pump_indexer',
          last_block: blockNumber,
          updated_at: new Date().toISOString()
        });

      if (error) {
        logger.error('❌ Failed to save last processed block:', error);
      }
    } catch (error) {
      logger.error('❌ Failed to save last processed block:', error);
    }
  }

  async start(): Promise<void> {
    this.isRunning = true;
    logger.info('🔍 Starting blockchain event indexing...');

    // Start listening for new events
    this.setupEventListeners();

    // Process historical events
    await this.processHistoricalEvents();

    // Start periodic sync
    this.startPeriodicSync();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    logger.info('✅ Indexer stopped');
  }

  private setupEventListeners(): void {
    // Listen for Deposited events
    this.contract.on('Deposited', async (user, token, amount, roundId, event) => {
      if (!this.isRunning) return;
      
      try {
        await this.handleDepositedEvent({
          user,
          token,
          amount,
          roundId,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          logIndex: event.logIndex
        });
      } catch (error) {
        logger.error('❌ Failed to handle Deposited event:', error);
      }
    });

    // Listen for Pumped events
    this.contract.on('Pumped', async (user, token, amount, newPressure, roundId, event) => {
      if (!this.isRunning) return;
      
      try {
        await this.handlePumpedEvent({
          user,
          token,
          amount,
          newPressure,
          roundId,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          logIndex: event.logIndex
        });
      } catch (error) {
        logger.error('❌ Failed to handle Pumped event:', error);
      }
    });

    // Listen for Popped events
    this.contract.on('Popped', async (roundId, winner, reward, newRoundId, event) => {
      if (!this.isRunning) return;
      
      try {
        await this.handlePoppedEvent({
          roundId,
          winner,
          reward,
          newRoundId,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          logIndex: event.logIndex
        });
      } catch (error) {
        logger.error('❌ Failed to handle Popped event:', error);
      }
    });

    logger.info('✅ Event listeners set up');
  }

  private async processHistoricalEvents(): Promise<void> {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = this.lastProcessedBlock + 1;

      if (fromBlock > currentBlock) {
        logger.info('📍 No historical events to process');
        return;
      }

      logger.info(`📚 Processing historical events from block ${fromBlock} to ${currentBlock}`);

      // Process in chunks to avoid RPC limits
      const chunkSize = 1000;
      
      for (let start = fromBlock; start <= currentBlock; start += chunkSize) {
        const end = Math.min(start + chunkSize - 1, currentBlock);
        
        await this.processEventsInRange(start, end);
        await this.sleep(100); // Rate limiting
      }

      this.lastProcessedBlock = currentBlock;
      await this.saveLastProcessedBlock(currentBlock);

      logger.info(`✅ Historical events processed up to block ${currentBlock}`);
    } catch (error) {
      logger.error('❌ Failed to process historical events:', error);
    }
  }

  private async processEventsInRange(fromBlock: number, toBlock: number): Promise<void> {
    try {
      // Get all events in this range
      const filter = {
        address: await this.contract.getAddress(),
        fromBlock,
        toBlock
      };

      const logs = await this.provider.getLogs(filter);
      
      for (const log of logs) {
        try {
          const parsedLog = this.contract.interface.parseLog(log);
          if (!parsedLog) continue;

          const eventData = {
            ...parsedLog.args,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            logIndex: log.logIndex
          };

          switch (parsedLog.name) {
            case 'Deposited':
              await this.handleDepositedEvent(eventData);
              break;
            case 'Pumped':
              await this.handlePumpedEvent(eventData);
              break;
            case 'Popped':
              await this.handlePoppedEvent(eventData);
              break;
          }
        } catch (error) {
          logger.error(`❌ Failed to process log at block ${log.blockNumber}:`, error);
        }
      }

      logger.debug(`📊 Processed ${logs.length} events in blocks ${fromBlock}-${toBlock}`);
    } catch (error) {
      logger.error(`❌ Failed to process events in range ${fromBlock}-${toBlock}:`, error);
    }
  }

  private async handleDepositedEvent(event: any): Promise<void> {
    try {
      // Update or create deposit record
      const { error } = await this.supabase
        .from('deposits')
        .upsert({
          tx: event.transactionHash,
          user_id: event.user.toLowerCase(),
          token: event.token.toLowerCase(),
          amount: event.amount.toString(),
          round_id: event.roundId.toString(),
          confirmed: true,
          block_number: event.blockNumber,
          log_index: event.logIndex,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      logger.info(`💰 Indexed deposit: ${event.user} deposited ${event.amount} tokens`);
    } catch (error) {
      logger.error('❌ Failed to handle Deposited event:', error);
    }
  }

  private async handlePumpedEvent(event: any): Promise<void> {
    try {
      // Update pump record with blockchain confirmation
      const { error: pumpError } = await this.supabase
        .from('pumps')
        .update({
          status: 'confirmed',
          relayed_tx: event.transactionHash,
          block_number: event.blockNumber,
          confirmed_at: new Date().toISOString()
        })
        .eq('user_id', event.user.toLowerCase())
        .eq('round_id', event.roundId.toString())
        .eq('status', 'sent'); // Only update pending transactions

      // Update rounds cache with blockchain state
      const { error: roundError } = await this.supabase
        .from('rounds_cache')
        .update({
          pressure: event.newPressure.toString(),
          updated_at: new Date().toISOString(),
          last_block: event.blockNumber
        })
        .eq('round_id', event.roundId.toString());

      if (pumpError) logger.error('❌ Failed to update pump record:', pumpError);
      if (roundError) logger.error('❌ Failed to update round cache:', roundError);

      logger.info(`🎈 Indexed pump: ${event.user} pumped, new pressure: ${event.newPressure}`);
    } catch (error) {
      logger.error('❌ Failed to handle Pumped event:', error);
    }
  }

  private async handlePoppedEvent(event: any): Promise<void> {
    try {
      // Update rounds cache - mark old round as ended
      await this.supabase
        .from('rounds_cache')
        .update({
          status: 'ended',
          winner: event.winner.toLowerCase(),
          final_reward: event.reward.toString(),
          ended_at: new Date().toISOString(),
          last_block: event.blockNumber
        })
        .eq('round_id', event.roundId.toString());

      // Create new round
      await this.supabase
        .from('rounds_cache')
        .upsert({
          round_id: event.newRoundId.toString(),
          status: 'active',
          pressure: '0',
          pot: '0',
          last1: null,
          last2: null,
          last3: null,
          created_at: new Date().toISOString(),
          last_block: event.blockNumber
        });

      // Update leaderboard
      await this.supabase
        .from('leaderboard')
        .upsert({
          user_id: event.winner.toLowerCase(),
          net_winnings: this.supabase.raw(`COALESCE(net_winnings, 0) + ${event.reward.toString()}`),
          pops_triggered: this.supabase.raw('COALESCE(pops_triggered, 0) + 1'),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      logger.info(`💥 Indexed balloon pop: Winner ${event.winner} won ${event.reward} tokens`);
    } catch (error) {
      logger.error('❌ Failed to handle Popped event:', error);
    }
  }

  private startPeriodicSync(): void {
    const syncInterval = parseInt(process.env.SYNC_INTERVAL_MS || '10000'); // 10 seconds

    setInterval(async () => {
      if (!this.isRunning) return;

      try {
        const currentBlock = await this.provider.getBlockNumber();
        
        if (currentBlock > this.lastProcessedBlock) {
          await this.processEventsInRange(this.lastProcessedBlock + 1, currentBlock);
          this.lastProcessedBlock = currentBlock;
          await this.saveLastProcessedBlock(currentBlock);
        }
      } catch (error) {
        logger.error('❌ Periodic sync failed:', error);
      }
    }, syncInterval);

    logger.info(`⏰ Periodic sync started (${syncInterval}ms interval)`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check
  async getHealthStatus(): Promise<any> {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const blocksBehind = currentBlock - this.lastProcessedBlock;

      return {
        status: 'healthy',
        isRunning: this.isRunning,
        currentBlock,
        lastProcessedBlock: this.lastProcessedBlock,
        blocksBehind,
        network: await this.provider.getNetwork()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}
