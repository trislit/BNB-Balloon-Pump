import 'dotenv/config';
import { IndexerService } from './services/IndexerService';
import { logger } from './utils/logger';

const indexer = new IndexerService();

async function startIndexer() {
  try {
    logger.info('🔍 Starting Balloon Pump Indexer Service...');

    await indexer.initialize();
    logger.info('✅ Indexer service initialized');

    await indexer.start();
    logger.info('✅ Indexer service started');

    logger.info('🎯 Indexer service running - syncing blockchain events to Supabase');

  } catch (error) {
    logger.error('❌ Failed to start indexer:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Received SIGINT, shutting down gracefully...');

  try {
    await indexer.stop();
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

// Start the indexer
startIndexer().catch((error) => {
  logger.error('❌ Fatal error starting indexer:', error);
  process.exit(1);
});
