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
import { LoyaltyTier, AccountStatus } from '../src/modules/customers/customer.model.js';

describe('Customer Management CRUD, Search & Pagination Tests', () => {
  let adminToken: string;
  let marketingToken: string;

  beforeAll(async () => {
    await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    const admin = await createTestUser(UserRole.ADMIN, 'admin.cust@example.com');
    adminToken = admin.accessToken;

    const marketing = await createTestUser(UserRole.MARKETING_MANAGER, 'mkt.cust@example.com');
    marketingToken = marketing.accessToken;
  });

  it('POST /api/v1/customers should successfully create a new customer record', async () => {
    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({
        customerId: 'CUST-TEST-001',
        firstName: 'Rahul',
        lastName: 'Sharma',
        email: 'rahul.sharma@example.com',
        phone: '+1-555-0101',
        customerType: 'TELECOM',
        loyaltyInfo: {
          loyaltyTier: LoyaltyTier.GOLD,
          loyaltyPoints: 1200
        },
        subscription: {
          activePlan: 'Unlimited 5G Premier',
          planType: 'Postpaid'
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.customerId).toBe('CUST-TEST-001');
    expect(res.body.data.loyaltyInfo.loyaltyTier).toBe(LoyaltyTier.GOLD);
  });

  it('POST /api/v1/customers should reject duplicate customerId with 409 CONFLICT', async () => {
    const payload = {
      customerId: 'CUST-DUP-001',
      firstName: 'First',
      lastName: 'Customer',
      email: 'first@example.com',
      subscription: { activePlan: 'Basic' }
    };

    await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send(payload);

    const dupRes = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({
        ...payload,
        email: 'different@example.com'
      });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('CONFLICT');
  });

  it('GET /api/v1/customers/:id should retrieve customer by business customerId or ObjectId', async () => {
    const createRes = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({
        customerId: 'CUST-LOOKUP-01',
        firstName: 'Look',
        lastName: 'Up',
        email: 'lookup@example.com',
        subscription: { activePlan: 'Pro' }
      });

    const mongoId = createRes.body.data._id;

    // 1. Lookup by business customerId
    const byBusinessId = await request(app)
      .get('/api/v1/customers/CUST-LOOKUP-01')
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(byBusinessId.status).toBe(200);
    expect(byBusinessId.body.data.customerId).toBe('CUST-LOOKUP-01');

    // 2. Lookup by MongoDB ObjectId
    const byMongoId = await request(app)
      .get(`/api/v1/customers/${mongoId}`)
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(byMongoId.status).toBe(200);
    expect(byMongoId.body.data._id).toBe(mongoId);
  });

  it('PUT /api/v1/customers/:id should update customer details', async () => {
    await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({
        customerId: 'CUST-UPDATE-01',
        firstName: 'Original',
        lastName: 'Name',
        email: 'orig@example.com',
        subscription: { activePlan: 'Basic' }
      });

    const updateRes = await request(app)
      .put('/api/v1/customers/CUST-UPDATE-01')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({
        firstName: 'UpdatedFirst',
        loyaltyInfo: {
          loyaltyTier: LoyaltyTier.PLATINUM,
          loyaltyPoints: 3500
        }
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.firstName).toBe('UpdatedFirst');
    expect(updateRes.body.data.loyaltyInfo.loyaltyTier).toBe(LoyaltyTier.PLATINUM);
  });

  it('PATCH /api/v1/customers/:id/status should update customer account status', async () => {
    await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({
        customerId: 'CUST-STATUS-01',
        firstName: 'Status',
        lastName: 'Test',
        email: 'status@example.com',
        subscription: { activePlan: 'Basic' }
      });

    const patchRes = await request(app)
      .patch('/api/v1/customers/CUST-STATUS-01/status')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({ status: AccountStatus.SUSPENDED });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.accountStatus).toBe(AccountStatus.SUSPENDED);
  });

  it('DELETE /api/v1/customers/:id should archive customer when requested by ADMIN', async () => {
    await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: 'CUST-ARCHIVE-01',
        firstName: 'Archive',
        lastName: 'Target',
        email: 'archive@example.com',
        subscription: { activePlan: 'Basic' }
      });

    const delRes = await request(app)
      .delete('/api/v1/customers/CUST-ARCHIVE-01')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.data.accountStatus).toBe(AccountStatus.ARCHIVED);
  });

  it('GET /api/v1/customers should support search, filter and pagination', async () => {
    // Seed 3 customers
    await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({
        customerId: 'CUST-FILTER-01',
        firstName: 'Aarav',
        lastName: 'Gupta',
        email: 'aarav.g@example.com',
        loyaltyInfo: { loyaltyTier: LoyaltyTier.PLATINUM },
        subscription: { activePlan: 'Enterprise Plan' }
      });

    await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({
        customerId: 'CUST-FILTER-02',
        firstName: 'Sneha',
        lastName: 'Reddy',
        email: 'sneha.r@example.com',
        loyaltyInfo: { loyaltyTier: LoyaltyTier.BRONZE },
        subscription: { activePlan: 'Basic' }
      });

    const filterRes = await request(app)
      .get('/api/v1/customers?loyaltyTier=PLATINUM')
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(filterRes.status).toBe(200);
    expect(filterRes.body.data.length).toBe(1);
    expect(filterRes.body.data[0].customerId).toBe('CUST-FILTER-01');
    expect(filterRes.body.meta).toHaveProperty('totalRecords', 1);
  });
});
