import { createClient, RedisClientType } from 'redis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { ServiceHealth } from '../types/index.js';

let redisClient: RedisClientType | null = null;
let isConnecting = false;

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    redisClient = createClient({
      url: env.REDIS_URL,
      socket: {
        connectTimeout: env.REDIS_CONNECT_TIMEOUT_MS,
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            logger.error('Redis max reconnection attempts reached', 'Redis');
            return new Error('Redis max reconnection attempts reached');
          }
          const delay = Math.min(retries * 200, 3000);
          logger.warn(`Reconnecting to Redis in ${delay}ms (attempt ${retries})...`, 'Redis');
          return delay;
        }
      }
    });

    redisClient.on('connect', () => {
      logger.info('Redis socket connected', 'Redis');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready for commands', 'Redis');
    });

    redisClient.on('error', (err: Error) => {
      logger.error('Redis client error', 'Redis', { error: err.message });
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis client reconnecting...', 'Redis');
    });

    redisClient.on('end', () => {
      logger.info('Redis client connection terminated', 'Redis');
    });
  }

  return redisClient;
};

export const connectRedis = async (): Promise<RedisClientType | null> => {
  const client = getRedisClient();

  if (client.isOpen) {
    return client;
  }

  if (isConnecting) {
    logger.debug('Redis connection attempt already active', 'Redis');
    return client;
  }

  isConnecting = true;
  try {
    logger.info(`Connecting to Redis at: ${env.REDIS_URL.replace(/:[^:@]+@/, ':****@')}`, 'Redis');
    await client.connect();
    isConnecting = false;
    return client;
  } catch (error) {
    isConnecting = false;
    logger.error('Failed to connect to Redis', 'Redis', {
      error: error instanceof Error ? error.message : String(error)
    });
    // In development or test, Redis failure might be non-fatal or handled gracefully
    return null;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient && redisClient.isOpen) {
    logger.info('Disconnecting Redis client...', 'Redis');
    await redisClient.quit();
    logger.info('Redis client disconnected cleanly', 'Redis');
  }
};

export const checkRedisHealth = async (): Promise<ServiceHealth> => {
  if (!redisClient || !redisClient.isOpen) {
    return {
      status: 'DOWN',
      details: 'Redis client is not connected'
    };
  }

  try {
    const startTime = Date.now();
    const pong = await redisClient.ping();
    const latencyMs = Date.now() - startTime;
    if (pong === 'PONG') {
      return { status: 'UP', latencyMs, details: 'Redis PING successful' };
    }
    return { status: 'DOWN', details: `Unexpected response: ${pong}` };
  } catch (err) {
    return {
      status: 'DOWN',
      details: err instanceof Error ? err.message : 'Redis ping error'
    };
  }
};

// Reusable Redis Service stub for future caching / rate limiting in Phase 2 & 5
export const redisService = {
  getClient: getRedisClient,
  checkHealth: checkRedisHealth,
  isConnected: (): boolean => !!redisClient && redisClient.isOpen
};
