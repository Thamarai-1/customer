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
import { CustomerModel, LoyaltyTier } from '../src/modules/customers/customer.model.js';
import { ActivityModel, ActivityType } from '../src/modules/activities/activity.model.js';
import { BillingRecordModel, PaymentStatus } from '../src/modules/billing/billing-record.model.js';
import { CommunicationPreferenceModel, PreferredChannel } from '../src/modules/communications/preference.model.js';

describe('Customer Profile Assembly & Sub-Resource Management Tests', () => {
  let token: string;

  beforeAll(async () => {
    await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    const user = await createTestUser(UserRole.MARKETING_MANAGER, 'profile.tester@example.com');
    token = user.accessToken;
  });

  it('GET /api/v1/customers/:id/profile should assemble complete profile across all domains', async () => {
    // 1. Create Customer
    const customer = await CustomerModel.create({
      customerId: 'CUST-PRF-001',
      firstName: 'Rahul',
      lastName: 'Sharma',
      email: 'rahul.sharma@example.com',
      phone: '+1-555-0999',
      loyaltyInfo: {
        loyaltyTier: LoyaltyTier.GOLD,
        loyaltyPoints: 1450,
        membershipStartDate: new Date('2025-01-01')
      },
      subscription: {
        activePlan: 'Premium 5G Fiber',
        planStatus: 'ACTIVE',
        planStartDate: new Date('2025-01-01')
      }
    });

    // 2. Create Activities (10 in last 30d, 5 in prev 30d)
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = 0; i < 10; i++) {
      await ActivityModel.create({
        customerId: customer.customerId,
        customerRef: customer._id,
        activityType: ActivityType.LOGIN,
        activityDate: new Date(now - (i * 2 + 1) * dayMs),
        source: 'MOBILE_APP'
      });
    }

    for (let i = 0; i < 5; i++) {
      await ActivityModel.create({
        customerId: customer.customerId,
        customerRef: customer._id,
        activityType: ActivityType.SERVICE_USAGE,
        activityDate: new Date(now - (35 + i * 2) * dayMs),
        source: 'WEB'
      });
    }

    // 3. Create Billing Records
    await BillingRecordModel.create({
      customerId: customer.customerId,
      customerRef: customer._id,
      invoiceId: 'INV-PRF-001',
      invoiceAmount: 120.00,
      outstandingAmount: 0,
      currency: 'USD',
      invoiceDate: new Date(now - 15 * dayMs),
      dueDate: new Date(now + 15 * dayMs),
      paymentStatus: PaymentStatus.PAID
    });

    // 4. Create Communication Preferences
    await CommunicationPreferenceModel.create({
      customerId: customer.customerId,
      customerRef: customer._id,
      emailConsent: true,
      smsConsent: true,
      preferredChannel: PreferredChannel.EMAIL,
      optedOut: false
    });

    // 5. Query Profile Endpoint
    const res = await request(app)
      .get(`/api/v1/customers/${customer.customerId}/profile`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.customer.customerId).toBe('CUST-PRF-001');
    expect(data.customer.loyaltyTier).toBe(LoyaltyTier.GOLD);
    expect(data.subscription.activePlan).toBe('Premium 5G Fiber');

    expect(data.activity.activityCount30d).toBe(10);
    expect(data.activity.activityCountPrevious30d).toBe(5);
    expect(data.activity.activityTrend).toBe('INCREASING');

    expect(data.billing.outstandingAmount).toBe(0);
    expect(data.billing.paymentStatus).toBe(PaymentStatus.PAID);

    expect(data.communicationPreferences.emailConsent).toBe(true);
    expect(data.communicationPreferences.preferredChannel).toBe('EMAIL');
    expect(data.communicationPreferences.optedOut).toBe(false);
  });

  it('GET /api/v1/customers/:id/profile should safely handle customer with missing related records', async () => {
    const customer = await CustomerModel.create({
      customerId: 'CUST-BARE-001',
      firstName: 'Bare',
      lastName: 'Customer',
      email: 'bare@example.com',
      subscription: { activePlan: 'Basic' }
    });

    const res = await request(app)
      .get(`/api/v1/customers/${customer.customerId}/profile`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.customer.customerId).toBe('CUST-BARE-001');
    expect(res.body.data.activity.activityCount30d).toBe(0);
    expect(res.body.data.activity.lastActivityDate).toBeNull();
    expect(res.body.data.billing.outstandingAmount).toBe(0);
  });
});
