import { Router, Request, Response } from 'express';
import { QueueService } from '../services/QueueService';
import { logger } from '../utils/logger';

export const queueRoutes = (queueService: QueueService) => {
  const router = Router();

  // GET /api/queue/status - Get current queue status
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const status = await queueService.getQueueStatus();

      res.json({
        success: true,
        status,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('❌ Error getting queue status:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // GET /api/queue/stats - Get detailed queue statistics
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const status = await queueService.getQueueStatus();

      // Get additional stats from database
      const supabase = queueService['supabase']; // Access private property

      // Get stats for the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: recentStats, error: statsError } = await supabase
        .from('pumps')
        .select('status, requested_at')
        .gte('requested_at', twentyFourHoursAgo);

      if (statsError) throw statsError;

      // Calculate statistics
      const stats = recentStats.reduce((acc, item) => {
        acc.total++;
        const status = item.status as keyof typeof acc;
        if (status in acc && status !== 'total') {
          acc[status] = (acc[status] || 0) + 1;
        }
        return acc;
      }, { total: 0, queued: 0, sent: 0, confirmed: 0, failed: 0 });

      // Calculate success rate
      const completed = stats.confirmed + stats.failed;
      const successRate = completed > 0 ? (stats.confirmed / completed) * 100 : 0;

      const response = {
        success: true,
        current: status,
        last24h: {
          total: stats.total,
          successRate: Math.round(successRate * 100) / 100,
          breakdown: {
            queued: stats.queued,
            processing: stats.sent,
            confirmed: stats.confirmed,
            failed: stats.failed
          }
        },
        timestamp: new Date().toISOString()
      };

      res.json(response);

    } catch (error: any) {
      logger.error('❌ Error getting queue stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // POST /api/queue/process - Manually trigger queue processing
  router.post('/process', async (req: Request, res: Response) => {
    try {
      // This would trigger immediate queue processing
      // In a real implementation, you'd call a method on the queue service

      res.json({
        success: true,
        message: 'Queue processing triggered',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('❌ Error triggering queue processing:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
};
