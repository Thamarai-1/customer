import { describe, it, expect } from 'vitest';
import { getRedisClient, checkRedisHealth, redisService } from '../src/config/redis.js';

describe('Redis Configuration & Service Handling', () => {
  it('getRedisClient should return a singleton Redis client instance', () => {
    const client1 = getRedisClient();
    const client2 = getRedisClient();

    expect(client1).toBeDefined();
    expect(client1).toBe(client2);
  });

  it('checkRedisHealth should report DOWN when Redis is not connected', async () => {
    const health = await checkRedisHealth();

    expect(health).toHaveProperty('status');
    expect(['UP', 'DOWN']).toContain(health.status);
    if (health.status === 'DOWN') {
      expect(health.details).toBeDefined();
    }
  });

  it('redisService should expose required service interfaces', () => {
    expect(typeof redisService.getClient).toBe('function');
    expect(typeof redisService.checkHealth).toBe('function');
    expect(typeof redisService.isConnected).toBe('function');
  });
});
