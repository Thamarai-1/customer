import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { ServiceHealth } from '../types/index.js';

let isConnecting = false;

// Sanitize MongoDB URI for logging to prevent credential leakage
const sanitizeUri = (uri: string): string => {
  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  } catch {
    return 'mongodb://[redacted]';
  }
};

export const registerDatabaseLifecycleEvents = (): void => {
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established successfully', 'Database');
  });

  mongoose.connection.on('error', (err: Error) => {
    logger.error('MongoDB connection error occurred', 'Database', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection disconnected', 'Database');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected successfully', 'Database');
  });
};

export const connectDatabase = async (
  uri = env.MONGODB_URI,
  timeoutMs = env.MONGODB_TIMEOUT_MS
): Promise<typeof mongoose> => {
  // Return existing connection if already connected
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
    return mongoose;
  }

  // Prevent race conditions with concurrent connection requests
  if (isConnecting) {
    logger.debug('Database connection already in progress, waiting...', 'Database');
    await new Promise((resolve) => setTimeout(resolve, 500));
    if ((mongoose.connection.readyState as number) === 1) {
      return mongoose;
    }
  }

  isConnecting = true;
  logger.info(`Connecting to MongoDB at: ${sanitizeUri(uri)}`, 'Database');

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: timeoutMs,
      connectTimeoutMS: timeoutMs,
      maxPoolSize: 20,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      family: 4 // IPv4 preference
    });
    isConnecting = false;
    return conn;
  } catch (error) {
    isConnecting = false;
    logger.error('Failed to connect to MongoDB', 'Database', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    logger.info('Closing MongoDB connection...', 'Database');
    await mongoose.disconnect();
    logger.info('MongoDB connection closed cleanly', 'Database');
  }
};

export const checkDatabaseHealth = async (): Promise<ServiceHealth> => {
  const state = mongoose.connection.readyState;
  if (state === mongoose.ConnectionStates.connected && mongoose.connection.db) {
    try {
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      const latencyMs = Date.now() - startTime;
      return { status: 'UP', latencyMs, details: 'MongoDB ping responsive' };
    } catch (err) {
      return {
        status: 'DOWN',
        details: err instanceof Error ? err.message : 'Ping failed'
      };
    }
  }

  const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  return {
    status: 'DOWN',
    details: `Current connection state: ${states[state] ?? 'Unknown'}`
  };
};

registerDatabaseLifecycleEvents();
