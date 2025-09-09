import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RelayerService } from './RelayerService';
import { PumpRequest, PumpResult } from '../types';
import { logger } from '../utils/logger';

export class QueueService {
  private relayer: RelayerService;
  private supabase: SupabaseClient;
  private isProcessing = false;
  private intervalId: NodeJS.Timeout | null = null;

  // Configuration
  private readonly processInterval = parseInt(process.env.QUEUE_PROCESS_INTERVAL_MS || '1000');
  private readonly maxRetries = parseInt(process.env.QUEUE_MAX_RETRIES || '3');
  private readonly retryDelay = parseInt(process.env.QUEUE_RETRY_DELAY_MS || '5000');
  private readonly maxPending = parseInt(process.env.MAX_PENDING_TX || '100');

  constructor(relayer: RelayerService) {
    this.relayer = relayer;
    this.initializeSupabase();
  }

  private initializeSupabase() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async start(): Promise<void> {
    logger.info('🎯 Starting queue processor...');

    // Set up real-time subscription for new pump requests
    this.setupRealtimeSubscription();

    // Start periodic processing
    this.intervalId = setInterval(() => {
      this.processQueue();
    }, this.processInterval);

    logger.info(`✅ Queue processor started (interval: ${this.processInterval}ms)`);
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isProcessing = false;
    logger.info('✅ Queue processor stopped');
  }

  private setupRealtimeSubscription(): void {
    try {
      this.supabase
        .channel('pump_requests')
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'pumps',
            filter: 'status=eq.queued'
          },
          (payload) => {
            logger.info('🆕 New pump request detected:', payload.new.id);
            this.processQueue(); // Process immediately when new request arrives
          }
        )
        .subscribe();

      logger.info('✅ Real-time subscription for pump requests established');

    } catch (error) {
      logger.error('❌ Failed to setup real-time subscription:', error);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      // Get pending requests
      const pendingRequests = await this.getPendingRequests();

      if (pendingRequests.length === 0) {
        return; // No work to do
      }

      logger.info(`📋 Processing ${pendingRequests.length} pump requests`);

      // Process requests in parallel (but limited)
      const concurrencyLimit = 5; // Process max 5 requests simultaneously
      const chunks = this.chunkArray(pendingRequests, concurrencyLimit);

      for (const chunk of chunks) {
        const promises = chunk.map(request => this.processRequest(request));
        await Promise.allSettled(promises);

        // Small delay between chunks to avoid overwhelming the RPC
        if (chunks.length > 1) {
          await this.sleep(500);
        }
      }

    } catch (error) {
      logger.error('❌ Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processRequest(request: PumpRequest): Promise<void> {
    try {
      logger.info(`🔄 Processing pump request: ${request.id}`);

      // Mark as sent to prevent duplicate processing
      await this.updateRequestStatus(request.id, 'sent');

      // Relay the transaction
      const result = await this.relayer.relayPump(request);

      if (result.success) {
        logger.info(`✅ Pump request ${request.id} completed successfully`);
      } else {
        logger.warn(`⚠️ Pump request ${request.id} failed: ${result.error}`);

        // Handle retry logic
        await this.handleFailedRequest(request, result);
      }

    } catch (error: any) {
      logger.error(`❌ Error processing request ${request.id}:`, error);

      // Mark as failed and schedule retry if applicable
      await this.handleFailedRequest(request, { error: error.message });
    }
  }

  private async handleFailedRequest(request: PumpRequest, result: Partial<PumpResult>): Promise<void> {
    try {
      // Check if we should retry
      const retryCount = request.retryCount || 0;

      if (retryCount < this.maxRetries) {
        // Schedule retry
        logger.info(`🔄 Scheduling retry for request ${request.id} (attempt ${retryCount + 1}/${this.maxRetries})`);

        await this.sleep(this.retryDelay);

        // Reset status to queued for retry
        await this.updateRequestStatus(request.id, 'queued', retryCount + 1);

      } else {
        // Max retries reached, mark as permanently failed
        logger.error(`💀 Max retries reached for request ${request.id}, marking as failed`);

        await this.updateRequestStatus(request.id, 'failed', retryCount, result.error);
      }

    } catch (error) {
      logger.error(`❌ Error handling failed request ${request.id}:`, error);
    }
  }

  private async getPendingRequests(): Promise<PumpRequest[]> {
    try {
      const { data, error } = await this.supabase
        .from('pumps')
        .select('*')
        .eq('status', 'queued')
        .order('requested_at', { ascending: true })
        .limit(this.maxPending);

      if (error) throw error;

      return data.map(row => ({
        id: row.id,
        userAddress: row.user_id,
        sessionId: row.session_id,
        token: row.token,
        amount: BigInt(row.spend),
        roundId: BigInt(row.round_id),
        retryCount: row.retry_count || 0,
        requestedAt: new Date(row.requested_at)
      }));

    } catch (error) {
      logger.error('❌ Error fetching pending requests:', error);
      return [];
    }
  }

  private async updateRequestStatus(
    requestId: string,
    status: string,
    retryCount?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (retryCount !== undefined) {
        updateData.retry_count = retryCount;
      }

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      const { error } = await this.supabase
        .from('pumps')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

    } catch (error) {
      logger.error(`❌ Error updating request ${requestId} status:`, error);
    }
  }

  async addPumpRequest(request: Omit<PumpRequest, 'id' | 'requestedAt'>): Promise<string> {
    try {
      // Let Supabase generate the UUID
      const { data, error } = await this.supabase
        .from('pumps')
        .insert({
          user_id: request.userAddress,
          session_id: request.sessionId,
          round_id: request.roundId?.toString() || '1',
          token: request.token,
          spend: request.amount.toString(),
          status: 'queued',
          requested_at: new Date().toISOString(),
          retry_count: 0
        })
        .select('id')
        .single();

      if (error) throw error;

      const requestId = data.id;
      logger.info(`📥 Added pump request to queue: ${requestId}`);
      return requestId;

    } catch (error) {
      logger.error('❌ Error adding pump request to queue:', error);
      throw error;
    }
  }

  async getQueueStatus(): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('pumps')
        .select('status')
        .in('status', ['queued', 'sent']);

      if (error) throw error;

      const statusCounts = data.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        queued: statusCounts.queued || 0,
        processing: statusCounts.sent || 0,
        isActive: this.isProcessing,
        lastProcessed: new Date().toISOString()
      };

    } catch (error) {
      logger.error('❌ Error getting queue status:', error);
      return {
        queued: 0,
        processing: 0,
        isActive: false,
        error: (error as Error).message
      };
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
