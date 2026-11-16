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
import { CustomerModel } from '../src/modules/customers/customer.model.js';

describe('CSV and JSON Customer Data Import Tests', () => {
  let token: string;

  beforeAll(async () => {
    await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    const user = await createTestUser(UserRole.MARKETING_MANAGER, 'importer@example.com');
    token = user.accessToken;
  });

  it('POST /api/v1/customers/import should successfully import valid CSV data', async () => {
    const csvContent =
      'customerId,firstName,lastName,email,phone,customerType,accountStatus,loyaltyTier,loyaltyPoints,activePlan\n' +
      'CUST-CSV-01,Amit,Verma,amit.verma@example.com,+1-555-1111,TELECOM,ACTIVE,GOLD,1200,Gigabit Fiber\n' +
      'CUST-CSV-02,Priya,Nair,priya.nair@example.com,+1-555-2222,RETAIL,ACTIVE,SILVER,650,Standard Plan\n';

    const res = await request(app)
      .post('/api/v1/customers/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csvContent), 'customers.csv');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalRecords).toBe(2);
    expect(res.body.data.successfulRecords).toBe(2);
    expect(res.body.data.failedRecords).toBe(0);

    const count = await CustomerModel.countDocuments();
    expect(count).toBe(2);
  });

  it('POST /api/v1/customers/import should successfully import valid JSON data', async () => {
    const jsonRecords = [
      {
        customerId: 'CUST-JSON-01',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        customerType: 'RETAIL',
        loyaltyTier: 'BRONZE',
        activePlan: 'Starter'
      },
      {
        customerId: 'CUST-JSON-02',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        customerType: 'TELECOM',
        loyaltyTier: 'PLATINUM',
        activePlan: 'Enterprise Unlimited'
      }
    ];

    const res = await request(app)
      .post('/api/v1/customers/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(JSON.stringify(jsonRecords)), 'customers.json');

    expect(res.status).toBe(200);
    expect(res.body.data.successfulRecords).toBe(2);

    const cust = await CustomerModel.findOne({ customerId: 'CUST-JSON-02' });
    expect(cust).toBeDefined();
    expect(cust?.loyaltyInfo.loyaltyTier).toBe('PLATINUM');
  });

  it('POST /api/v1/customers/import should handle partial success and report row-level errors', async () => {
    const csvContent =
      'customerId,firstName,lastName,email,activePlan\n' +
      'CUST-PART-01,Valid,User,valid.user@example.com,Basic Plan\n' +
      'CUST-PART-02,Invalid,Email,not-a-valid-email-address,Basic Plan\n' +
      'CUST-PART-01,Duplicate,BatchId,duplicate.batch@example.com,Basic Plan\n';

    const res = await request(app)
      .post('/api/v1/customers/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(csvContent), 'customers_partial.csv');

    expect(res.status).toBe(200);
    expect(res.body.data.totalRecords).toBe(3);
    expect(res.body.data.successfulRecords).toBe(1);
    expect(res.body.data.failedRecords).toBe(2);
    expect(res.body.data.errors.length).toBeGreaterThanOrEqual(2);

    // Row 2 error should indicate invalid email
    const row2Error = res.body.data.errors.find((e: { row: number }) => e.row === 2);
    expect(row2Error).toBeDefined();
    expect(row2Error.field).toBe('email');

    // Row 3 error should indicate duplicate
    const row3Error = res.body.data.errors.find((e: { row: number }) => e.row === 3);
    expect(row3Error).toBeDefined();
    expect(row3Error.message).toContain('Duplicate');
  });
});
