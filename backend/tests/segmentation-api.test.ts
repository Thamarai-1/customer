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
import { CustomerModel, CustomerType, AccountStatus, LoyaltyTier } from '../src/modules/customers/customer.model.js';
import { ActivityModel, ActivityType } from '../src/modules/activities/activity.model.js';
import { BillingRecordModel, PaymentStatus } from '../src/modules/billing/billing-record.model.js';
import { CustomerSegmentType, ClassificationStatus } from '../src/modules/segmentation/segmentation.constants.js';

describe('Customer Segmentation Engine API Integration Tests', () => {
  let adminToken: string;
  let marketingToken: string;
  let reviewerToken: string;

  beforeAll(async () => {
    await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    const admin = await createTestUser(UserRole.ADMIN, 'admin.seg@example.com');
    adminToken = admin.accessToken;

    const marketing = await createTestUser(UserRole.MARKETING_MANAGER, 'mkt.seg@example.com');
    marketingToken = marketing.accessToken;

    const reviewer = await createTestUser(UserRole.COMPLIANCE_REVIEWER, 'rev.seg@example.com');
    reviewerToken = reviewer.accessToken;

    // Seed test customers
    const cust1 = await CustomerModel.create({
      customerId: 'CUST-API-001',
      firstName: 'Priya',
      lastName: 'Nair',
      email: 'priya.nair@example.com',
      customerType: CustomerType.TELECOM,
      accountStatus: AccountStatus.ACTIVE,
      loyaltyInfo: {
        loyaltyTier: LoyaltyTier.PLATINUM,
        loyaltyPoints: 3500,
        membershipStartDate: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000)
      },
      subscription: {
        activePlan: 'Enterprise Premier 5G',
        planStatus: 'ACTIVE',
        planType: 'Annual Contract'
      }
    });

    const cust2 = await CustomerModel.create({
      customerId: 'CUST-API-002',
      firstName: 'Robert',
      lastName: 'Taylor',
      email: 'robert.taylor@example.com',
      customerType: CustomerType.RETAIL,
      accountStatus: AccountStatus.ACTIVE,
      loyaltyInfo: {
        loyaltyTier: LoyaltyTier.BRONZE,
        loyaltyPoints: 120,
        membershipStartDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)
      },
      subscription: {
        activePlan: 'Basic Rewards',
        planStatus: 'ACTIVE',
        planType: 'Monthly'
      }
    });

    // Seed activities for cust1 (steady engagement)
    for (let i = 0; i < 8; i++) {
      await ActivityModel.create({
        customerId: cust1.customerId,
        customerRef: cust1._id,
        activityType: ActivityType.LOGIN,
        activityDate: new Date(Date.now() - (i * 3 + 1) * 24 * 60 * 60 * 1000)
      });
    }

    // Seed paid invoice for cust1
    await BillingRecordModel.create({
      customerId: cust1.customerId,
      customerRef: cust1._id,
      invoiceId: 'INV-API-01',
      invoiceAmount: 200,
      outstandingAmount: 0,
      dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      paymentStatus: PaymentStatus.PAID
    });

    // Seed overdue invoice for cust2
    await BillingRecordModel.create({
      customerId: cust2.customerId,
      customerRef: cust2._id,
      invoiceId: 'INV-API-02',
      invoiceAmount: 150,
      outstandingAmount: 150,
      dueDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      paymentStatus: PaymentStatus.OVERDUE,
      disputeStatus: 'NONE'
    });
  });

  // 1. GET /api/v1/segmentation/segments
  it('GET /api/v1/segmentation/segments should return 5 predefined segment definitions', async () => {
    const res = await request(app)
      .get('/api/v1/segmentation/segments')
      .set('Authorization', `Bearer ${reviewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(5);
    const keys = res.body.data.map((d: { segmentKey: string }) => d.segmentKey);
    expect(keys).toContain(CustomerSegmentType.CONSISTENT_CUSTOMER);
    expect(keys).toContain(CustomerSegmentType.LOYALTY_CANDIDATE);
    expect(keys).toContain(CustomerSegmentType.OVERDUE_BILL);
  });

  // 2. POST /api/v1/segmentation/customers/:customerId/classify
  it('POST /api/v1/segmentation/customers/:customerId/classify should classify customer and return evidence & explanations', async () => {
    const res = await request(app)
      .post('/api/v1/segmentation/customers/CUST-API-001/classify')
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.customerId).toBe('CUST-API-001');
    expect(res.body.data.classificationStatus).toBe(ClassificationStatus.CLASSIFIED);
    expect(res.body.data.segments).toContain(CustomerSegmentType.LOYALTY_CANDIDATE);
    expect(res.body.data.reasonCodes.length).toBeGreaterThan(0);
    expect(res.body.data.explanations.length).toBeGreaterThan(0);
    expect(res.body.data.evidence.loyaltyPoints).toBe(3500);
    expect(res.body.data.confidence).toBeGreaterThanOrEqual(0.85);
  });

  // 3. GET /api/v1/segmentation/customers/:customerId
  it('GET /api/v1/segmentation/customers/:customerId should retrieve existing or on-demand classification', async () => {
    const res = await request(app)
      .get('/api/v1/segmentation/customers/CUST-API-002')
      .set('Authorization', `Bearer ${reviewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.customerId).toBe('CUST-API-002');
    expect(res.body.data.primarySegment).toBe(CustomerSegmentType.OVERDUE_BILL);
    expect(res.body.data.evidence.totalOutstandingAmount).toBe(150);
  });

  // 4. POST /api/v1/segmentation/classify-all
  it('POST /api/v1/segmentation/classify-all should execute batch classification on all customers', async () => {
    const res = await request(app)
      .post('/api/v1/segmentation/classify-all')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ batchSize: 50 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalCustomers).toBe(2);
    expect(res.body.data.processedCount).toBe(2);
    expect(res.body.data.classifiedCount).toBeGreaterThan(0);
  });

  // 5. GET /api/v1/segmentation/segments/:segmentName/customers
  it('GET /api/v1/segmentation/segments/:segmentName/customers should return paginated customers in segment', async () => {
    // First classify both customers
    await request(app).post('/api/v1/segmentation/classify-all').set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .get(`/api/v1/segmentation/segments/${CustomerSegmentType.OVERDUE_BILL}/customers?page=1&limit=10`)
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].customerId).toBe('CUST-API-002');
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.totalRecords).toBeGreaterThanOrEqual(1);
  });

  // 6. GET /api/v1/segmentation/statistics
  it('GET /api/v1/segmentation/statistics should return aggregated segmentation distribution metrics', async () => {
    await request(app).post('/api/v1/segmentation/classify-all').set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .get('/api/v1/segmentation/statistics')
      .set('Authorization', `Bearer ${reviewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalCustomers).toBe(2);
    expect(res.body.data.classifiedCustomers).toBe(2);
    expect(res.body.data.segmentCounts).toBeDefined();
    expect(res.body.data.primarySegmentCounts).toBeDefined();
    expect(res.body.data.segmentPercentages).toBeDefined();
  });

  // 7. GET /api/v1/segmentation/customers/:customerId/history
  it('GET /api/v1/segmentation/customers/:customerId/history should preserve historical classifications', async () => {
    // First classification
    await request(app).post('/api/v1/segmentation/customers/CUST-API-001/classify').set('Authorization', `Bearer ${adminToken}`);

    // Reclassification
    await request(app).post('/api/v1/segmentation/customers/CUST-API-001/classify').set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .get('/api/v1/segmentation/customers/CUST-API-001/history')
      .set('Authorization', `Bearer ${reviewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  // 8. GET & PUT /api/v1/segmentation/config
  it('GET & PUT /api/v1/segmentation/config should retrieve and allow ADMIN to update thresholds', async () => {
    // GET initial
    const getRes = await request(app)
      .get('/api/v1/segmentation/config')
      .set('Authorization', `Bearer ${marketingToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.ruleVersion).toBeDefined();

    // PUT update as ADMIN
    const updateRes = await request(app)
      .put('/api/v1/segmentation/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ruleVersion: '1.1.0',
        loyaltyPointsThreshold: 1500,
        activityReductionThresholdPercent: 60,
        notes: 'Updated for Q4 seasonal campaign'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.ruleVersion).toBe('1.1.0');
    expect(updateRes.body.data.loyaltyPointsThreshold).toBe(1500);
    expect(updateRes.body.data.activityReductionThresholdPercent).toBe(60);
  });

  // 9. RBAC: Non-admin role cannot update config
  it('PUT /api/v1/segmentation/config should reject MARKETING_MANAGER with 403 Forbidden', async () => {
    const res = await request(app)
      .put('/api/v1/segmentation/config')
      .set('Authorization', `Bearer ${marketingToken}`)
      .send({
        ruleVersion: '2.0.0',
        loyaltyPointsThreshold: 800
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 10. Security: Unauthenticated request rejected with 401
  it('GET /api/v1/segmentation/statistics should reject unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/v1/segmentation/statistics');
    expect(res.status).toBe(401);
  });

  // 11. 404 for non-existent customer
  it('POST /api/v1/segmentation/customers/:id/classify should return 404 for unknown customer', async () => {
    const res = await request(app)
      .post('/api/v1/segmentation/customers/CUST-NON-EXISTENT/classify')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
