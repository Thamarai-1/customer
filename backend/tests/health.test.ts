import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Health & Liveness API Endpoints', () => {
  it('GET /api/v1/health should return 200 and standard health payload', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message', 'Customer Engagement Assistant API is running');
    expect(res.body).toHaveProperty('timestamp');
    expect(new Date(res.body.timestamp).getTime()).not.toBeNaN();
  });

  it('GET /api/v1/health/readiness should report infrastructure health status', async () => {
    const res = await request(app).get('/api/v1/health/readiness');

    // Either 200 (if connected) or 503 (if local mock/live services not yet bound)
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('services');
    expect(res.body.services).toHaveProperty('database');
    expect(res.body.services).toHaveProperty('redis');
    expect(['UP', 'DOWN']).toContain(res.body.services.database.status);
    expect(['UP', 'DOWN']).toContain(res.body.services.redis.status);
  });

  it('GET /api/v1/unknown-endpoint should return 404 with structured error', async () => {
    const res = await request(app).get('/api/v1/non-existent-resource');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body.error).toHaveProperty('message');
  });
});
