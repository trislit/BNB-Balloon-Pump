import { Router, Request, Response } from 'express';
import { RelayerService } from '../services/RelayerService';
import { QueueService } from '../services/QueueService';
import { PumpRequestBody, PumpResponse } from '../types';
import { logger } from '../utils/logger';

export const pumpRoutes = (relayerService: RelayerService, queueService: QueueService) => {
  const router = Router();

  // POST /api/pump - Submit a pump request to the queue
  router.post('/', async (req: Request, res: Response) => {
    try {
      const body: PumpRequestBody = req.body;

      // Validate request body
      if (!body.userAddress || !body.sessionId || !body.token || !body.amount) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userAddress, sessionId, token, amount'
        } as PumpResponse);
      }

      // Validate Ethereum address
      if (!/^0x[a-fA-F0-9]{40}$/.test(body.userAddress)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Ethereum address format'
        } as PumpResponse);
      }

      // Validate amount
      let amount: bigint;
      try {
        amount = BigInt(body.amount);
        if (amount <= 0) {
          throw new Error('Amount must be positive');
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid amount format'
        } as PumpResponse);
      }

      // Create pump request
      const pumpRequest = {
        userAddress: body.userAddress.toLowerCase(),
        sessionId: body.sessionId,
        token: body.token,
        amount,
        roundId: body.roundId ? BigInt(body.roundId) : undefined
      };

      logger.info(`📥 Received pump request for ${pumpRequest.userAddress}, amount: ${pumpRequest.amount}`);

      // Add to queue
      const requestId = await queueService.addPumpRequest(pumpRequest);

      const response: PumpResponse = {
        success: true,
        requestId,
        message: 'Pump request queued successfully'
      };

      logger.info(`✅ Pump request queued: ${requestId}`);
      res.json(response);

    } catch (error: any) {
      logger.error('❌ Error processing pump request:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      } as PumpResponse);
    }
  });

  // GET /api/pump/state - Get current game state
  router.get('/state', async (req: Request, res: Response) => {
    try {
      const gameState = await relayerService.getGameState();

      res.json({
        success: true,
        gameState,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('❌ Error getting game state:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  // GET /api/pump/balance/:userAddress - Get user balance (alias for vault balance)
  router.get('/balance/:userAddress', async (req: Request, res: Response) => {
    try {
      const { userAddress } = req.params;

      if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Ethereum address format'
        });
      }

      const balance = await relayerService.getUserBalance(userAddress);

      res.json({
        success: true,
        balance,
        userAddress: userAddress.toLowerCase()
      });

    } catch (error: any) {
      logger.error(`❌ Error getting user balance for ${req.params.userAddress}:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  // GET /api/pump/payout-percentages - Get current dynamic payout percentages
  router.get('/payout-percentages', async (req: Request, res: Response) => {
    try {
      const supabase = relayerService['supabase']; // Access private property
      
      const { data, error } = await supabase.rpc('get_current_payout_percentages');
      
      if (error) {
        throw error;
      }

      res.json({
        success: true,
        payoutPercentages: data,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('❌ Error getting payout percentages:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  // GET /api/pump/leaderboard - Get leaderboard
  router.get('/leaderboard', async (req: Request, res: Response) => {
    try {
      const { limit = '10' } = req.query;
      const limitNum = parseInt(Array.isArray(limit) ? limit[0] as string : (limit as string) || '10');

      const leaderboard = await relayerService.getLeaderboard(limitNum);

      res.json({
        success: true,
        leaderboard,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('❌ Error getting leaderboard:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  // GET /api/pump/user/:userAddress - Get user's pump requests
  router.get('/user/:userAddress', async (req: Request, res: Response) => {
    try {
      const { userAddress } = req.params;
      const { limit = '10', offset = '0' } = req.query;

      if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Ethereum address'
        });
      }

      const supabase = relayerService['supabase'];

      const limitNum = parseInt(Array.isArray(limit) ? limit[0] as string : (limit as string) || '10');
      const offsetNum = parseInt(Array.isArray(offset) ? offset[0] as string : (offset as string) || '0');

      const { data, error } = await supabase
        .from('pumps')
        .select('*')
        .eq('user_id', userAddress.toLowerCase())
        .order('requested_at', { ascending: false })
        .range(offsetNum, offsetNum + limitNum - 1);

      if (error) throw error;

      const response = {
        success: true,
        requests: data.map(row => ({
          id: row.id,
          sessionId: row.session_id,
          token: row.token,
          amount: row.spend,
          roundId: row.round_id,
          status: row.status,
          requestedAt: row.requested_at,
          relayedTx: row.relayed_tx,
          errorMessage: row.error_message,
          retryCount: row.retry_count
        })),
        total: data.length
      };

      res.json(response);

    } catch (error: any) {
      logger.error(`❌ Error fetching pump requests for ${req.params.userAddress}:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  // GET /api/pump/:requestId - Get pump request status (MUST BE LAST)
  router.get('/:requestId', async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;

      if (!requestId) {
        return res.status(400).json({
          success: false,
          error: 'Request ID is required'
        });
      }

      // Query the database for the request status
      const supabase = relayerService['supabase']; // Access private property (not ideal but works)

      const { data, error } = await supabase
        .from('pumps')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          error: 'Pump request not found'
        });
      }

      const response = {
        success: true,
        request: {
          id: data.id,
          userAddress: data.user_id,
          sessionId: data.session_id,
          token: data.token,
          amount: data.spend,
          roundId: data.round_id,
          status: data.status,
          requestedAt: data.requested_at,
          relayedTx: data.relayed_tx,
          errorMessage: data.error_message,
          retryCount: data.retry_count,
          updatedAt: data.updated_at
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error(`❌ Error fetching pump request ${req.params.requestId}:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  });

  return router;
};
