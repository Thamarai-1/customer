import { describe, it, expect, afterAll } from 'vitest';
import mongoose from 'mongoose';
import {
  checkDatabaseHealth,
  disconnectDatabase
} from '../src/config/database.js';

describe('Database Module Connection & Health', () => {
  afterAll(async () => {
    await disconnectDatabase();
  });

  it('checkDatabaseHealth should return DOWN when disconnected', async () => {
    // If not connected yet, health check should return DOWN
    if (mongoose.connection.readyState === 0) {
      const health = await checkDatabaseHealth();
      expect(health.status).toBe('DOWN');
      expect(health.details).toContain('Disconnected');
    }
  });

  it('disconnectDatabase should execute cleanly when not connected', async () => {
    await expect(disconnectDatabase()).resolves.not.toThrow();
  });

  it('mongoose connection instance should maintain lifecycle event listeners', () => {
    expect(mongoose.connection.listenerCount('connected')).toBeGreaterThan(0);
    expect(mongoose.connection.listenerCount('error')).toBeGreaterThan(0);
    expect(mongoose.connection.listenerCount('disconnected')).toBeGreaterThan(0);
  });
});
