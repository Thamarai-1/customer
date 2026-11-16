import { describe, it, expect } from 'vitest';
import { validateEnv } from '../src/config/env.js';

describe('Environment Configuration Validation', () => {
  it('should validate valid environment configuration with defaults', () => {
    const config = validateEnv({
      NODE_ENV: 'test',
      BACKEND_PORT: '5000',
      MONGODB_URI: 'mongodb://localhost:27017/test_db',
      REDIS_URL: 'redis://localhost:6379'
    });

    expect(config.NODE_ENV).toBe('test');
    expect(config.BACKEND_PORT).toBe(5000);
    expect(config.MONGODB_URI).toBe('mongodb://localhost:27017/test_db');
    expect(config.REDIS_URL).toBe('redis://localhost:6379');
    expect(config.JWT_EXPIRES_IN).toBe('15m');
  });

  it('should provide sensible defaults when optional environment keys are omitted', () => {
    const config = validateEnv({});

    expect(config.NODE_ENV).toBe('development');
    expect(config.BACKEND_PORT).toBe(5000);
    expect(config.MONGODB_TIMEOUT_MS).toBe(5000);
    expect(config.CORS_ORIGIN).toBe('*');
  });

  it('should reject invalid NODE_ENV values', () => {
    expect(() => {
      validateEnv({
        NODE_ENV: 'invalid_environment'
      });
    }).toThrow(/Environment validation failed/);
  });

  it('should reject non-numeric ports', () => {
    expect(() => {
      validateEnv({
        BACKEND_PORT: 'not-a-number'
      });
    }).toThrow(/Environment validation failed/);
  });
});
