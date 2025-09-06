import { Router, Request, Response } from 'express';
import { RelayerService } from '../services/RelayerService';
import { logger } from '../utils/logger';

const router = Router();

// Inject services through middleware (will be set in main app)
let relayerService: RelayerService;
let queueService: any;

export const setServices = (relayer: RelayerService, queue: any) => {
  relayerService = relayer;
  queueService = queue;
};

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  try {
    const relayerHealth = await relayerService.getHealthStatus();
    const queueStatus = await queueService.getQueueStatus();

    const isHealthy = relayerHealth.status === 'healthy';

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        relayer: relayerHealth,
        queue: queueStatus
      }
    };

    res.status(isHealthy ? 200 : 503).json(response);

  } catch (error: any) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const relayerHealth = await relayerService.getHealthStatus();
    const queueStatus = await queueService.getQueueStatus();

    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV
      },
      services: {
        relayer: relayerHealth,
        queue: queueStatus
      },
      configuration: {
        rpcUrl: process.env.RPC_URL_PRIMARY ? 'configured' : 'missing',
        contractAddress: process.env.CONTRACT_ADDRESS ? 'configured' : 'missing',
        supabaseUrl: process.env.SUPABASE_URL ? 'configured' : 'missing',
        maxTxPerMinute: process.env.MAX_TX_PER_MINUTE_PER_USER,
        maxPendingTx: process.env.MAX_PENDING_TX
      }
    };

    res.json(response);

  } catch (error: any) {
    logger.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

export { router as healthRoutes };
