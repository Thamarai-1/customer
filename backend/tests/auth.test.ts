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
import { RefreshTokenModel } from '../src/modules/auth/refresh-token.model.js';

describe('Authentication & Token Lifecycle Tests', () => {
  beforeAll(async () => {
    await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('POST /api/v1/auth/login should authenticate valid user and return tokens', async () => {
    await createTestUser(UserRole.ADMIN, 'admin@example.com', 'SecureAdmin123!');

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'SecureAdmin123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.email).toBe('admin@example.com');
    expect(res.body.data.user.role).toBe(UserRole.ADMIN);
  });

  it('POST /api/v1/auth/login should reject invalid password with 401', async () => {
    await createTestUser(UserRole.MARKETING_MANAGER, 'user@example.com', 'CorrectPassword123!');

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'user@example.com',
        password: 'WrongPassword999!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('POST /api/v1/auth/login should reject non-existent email with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'ghost@example.com',
        password: 'Password123!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/login should reject inactive user with 403', async () => {
    await createTestUser(UserRole.MARKETING_MANAGER, 'inactive@example.com', 'Pass12345!', false);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'inactive@example.com',
        password: 'Pass12345!'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
  });

  it('POST /api/v1/auth/refresh should perform token rotation and invalidate old token', async () => {
    await createTestUser(UserRole.ADMIN, 'refresh.user@example.com', 'Pass12345!');

    // 1. Initial Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'refresh.user@example.com', password: 'Pass12345!' });

    const initialRefreshToken = loginRes.body.data.refreshToken;
    expect(initialRefreshToken).toBeDefined();

    // 2. Refresh Token Call
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data).toHaveProperty('accessToken');
    expect(refreshRes.body.data).toHaveProperty('refreshToken');
    const newRefreshToken = refreshRes.body.data.refreshToken;
    expect(newRefreshToken).not.toBe(initialRefreshToken);

    // 3. Token Reuse Attempt (Replay Attack)
    const replayRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken });

    expect(replayRes.status).toBe(401);
    expect(replayRes.body.error.code).toBe('SECURITY_ALERT');
  });

  it('POST /api/v1/auth/logout should revoke active refresh token', async () => {
    await createTestUser(UserRole.MARKETING_MANAGER, 'logout.user@example.com', 'Pass12345!');

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'logout.user@example.com', password: 'Pass12345!' });

    const refreshToken = loginRes.body.data.refreshToken;

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken });

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Verify revoked token cannot be refreshed
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(401);
  });

  it('GET /api/v1/auth/me should return authenticated user details', async () => {
    const { accessToken } = await createTestUser(UserRole.COMPLIANCE_REVIEWER, 'reviewer@example.com');

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('reviewer@example.com');
    expect(res.body.data.user.role).toBe(UserRole.COMPLIANCE_REVIEWER);
  });

  it('POST /api/v1/auth/change-password should verify current password and update hash', async () => {
    const { user, accessToken } = await createTestUser(UserRole.ADMIN, 'changepwd@example.com', 'OldPassword123!');

    // 1. Invalid current password fails
    const failRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'IncorrectOldPassword!',
        newPassword: 'BrandNewPassword123!'
      });

    expect(failRes.status).toBe(400);

    // 2. Valid current password succeeds
    const successRes = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'OldPassword123!',
        newPassword: 'BrandNewPassword123!'
      });

    expect(successRes.status).toBe(200);

    // 3. Login with new password succeeds
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: user.email,
        password: 'BrandNewPassword123!'
      });

    expect(loginRes.status).toBe(200);
  });
});
