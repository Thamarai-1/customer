import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/database.js';
import { checkRedisHealth } from '../config/redis.js';

const router = Router();

/**
 * @route   GET /api/v1/health
 * @desc    Basic health check for application liveness
 * @access  Public
 */
router.get('/', (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'Customer Engagement Assistant API is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/v1/health/readiness
 * @desc    Comprehensive infrastructure readiness probe (MongoDB & Redis)
 * @access  Public
 */
router.get('/readiness', async (_req: Request, res: Response) => {
  const [dbHealth, redisHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth()
  ]);

  const isHealthy = dbHealth.status === 'UP'; // MongoDB is required primary store

  return res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    message: isHealthy
      ? 'All core infrastructure services are healthy'
      : 'One or more required infrastructure services are degraded or unavailable',
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealth,
      redis: redisHealth
    }
  });
});

export default router;
