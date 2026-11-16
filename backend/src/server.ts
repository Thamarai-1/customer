import { Server } from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { AuthService } from './modules/auth/auth.service.js';
import { logger } from './utils/logger.js';

let server: Server | null = null;
let isShuttingDown = false;

const startServer = async (): Promise<void> => {
  try {
    logger.info(`Starting Customer Loyalty and Engagement Assistant Backend in [${env.NODE_ENV}] mode...`, 'Server');

    // Connect Primary Database
    try {
      await connectDatabase();
      // Bootstrap initial admin user if not present
      await AuthService.bootstrapAdmin();
    } catch (dbError) {
      logger.error('Failed to connect to primary database during startup', 'Server', {
        error: dbError instanceof Error ? dbError.message : String(dbError)
      });
      // In production, exit if primary database cannot be reached
      if (env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }

    // Connect Cache & Rate Limiting Infrastructure
    try {
      await connectRedis();
    } catch (redisError) {
      logger.warn('Redis unavailable at startup, caching degraded', 'Server', {
        error: redisError instanceof Error ? redisError.message : String(redisError)
      });
    }

    // Start HTTP Server
    server = app.listen(env.BACKEND_PORT, () => {
      logger.info(
        `Backend HTTP server running on port ${env.BACKEND_PORT} (API Prefix: /api/v1)`,
        'Server'
      );
    });
  } catch (error) {
    logger.error('Fatal error during application startup', 'Server', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  logger.info(`Received ${signal}. Initiating graceful shutdown...`, 'Server');

  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit.', 'Server');
    process.exit(1);
  }, 10000);

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((err) => {
          if (err) return reject(err);
          logger.info('HTTP server closed.', 'Server');
          resolve();
        });
      });
    }

    await disconnectRedis();
    await disconnectDatabase();

    clearTimeout(shutdownTimeout);
    logger.info('Graceful shutdown complete. Exiting cleanly.', 'Server');
    process.exit(0);
  } catch (err) {
    clearTimeout(shutdownTimeout);
    logger.error('Error encountered during graceful shutdown', 'Server', {
      error: err instanceof Error ? err.message : String(err)
    });
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection', 'Process', {
    reason: reason instanceof Error ? reason.stack : String(reason)
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', 'Process', {
    error: error.message,
    stack: error.stack
  });
  gracefulShutdown('uncaughtException');
});

// Run server only when executed directly
startServer();
