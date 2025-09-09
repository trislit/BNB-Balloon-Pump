import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { RelayerService } from './services/RelayerService';
import { QueueService } from './services/QueueService';
import { logger } from './utils/logger';
import { healthRoutes, setServices as setHealthServices } from './routes/health';
import { pumpRoutes } from './routes/pump';
import { queueRoutes } from './routes/queue';
import { vaultRoutes } from './routes/vault';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Initialize services
const relayerService = new RelayerService();
const queueService = new QueueService(relayerService);

// Set services for routes
setHealthServices(relayerService, queueService);

// Routes
app.use('/health', healthRoutes);
app.use('/api/pump', pumpRoutes(relayerService, queueService));
app.use('/api/queue', queueRoutes(queueService));
app.use('/api/vault', vaultRoutes(relayerService));

// Start services
async function startServices() {
  try {
    logger.info('🚀 Starting Balloon Pump Relayer Service...');

    // Initialize relayer
    await relayerService.initialize();
    logger.info('✅ Relayer service initialized');

    // Start queue processor
    await queueService.start();
    logger.info('✅ Queue service started');

    // Start server
    app.listen(PORT, () => {
      logger.info(`🎯 Relayer service running on port ${PORT}`);
      logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
      logger.info(`📊 Queue status: http://localhost:${PORT}/api/queue/status`);
    });

  } catch (error) {
    logger.error('❌ Failed to start services:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Received SIGINT, shutting down gracefully...');

  try {
    await queueService.stop();
    await relayerService.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the service
startServices().catch((error) => {
  logger.error('❌ Fatal error starting services:', error);
  process.exit(1);
});
