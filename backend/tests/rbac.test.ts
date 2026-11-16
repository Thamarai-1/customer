import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import {
  startTestDatabase,
  stopTestDatabase,
  clearTestDatabase,
  createTestUser
} from './test-helper.js';
import { UserRole } from '../src/modules/users/user.model.js';

describe('Role-Based Access Control (RBAC) Tests', () => {
  beforeAll(async () => {
    await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('ADMIN should successfully access User Management routes', async () => {
    const { accessToken } = await createTestUser(UserRole.ADMIN, 'admin.rbac@example.com');

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('MARKETING_MANAGER should receive 403 FORBIDDEN when attempting User Management access', async () => {
    const { accessToken } = await createTestUser(UserRole.MARKETING_MANAGER, 'marketing.rbac@example.com');

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('COMPLIANCE_REVIEWER should receive 403 FORBIDDEN when attempting User Management access', async () => {
    const { accessToken } = await createTestUser(UserRole.COMPLIANCE_REVIEWER, 'compliance.rbac@example.com');

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('COMPLIANCE_REVIEWER should receive 403 FORBIDDEN when attempting to delete customer', async () => {
    const { accessToken } = await createTestUser(UserRole.COMPLIANCE_REVIEWER, 'reviewer.del@example.com');

    const res = await request(app)
      .delete('/api/v1/customers/CUST-999')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });

  it('Unauthenticated requests to protected endpoints should receive 401 UNAUTHENTICATED', async () => {
    const res = await request(app).get('/api/v1/customers');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('Requests with corrupted or invalid bearer token should receive 401', async () => {
    const res = await request(app)
      .get('/api/v1/customers')
      .set('Authorization', 'Bearer totally-invalid-jwt-token');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});
