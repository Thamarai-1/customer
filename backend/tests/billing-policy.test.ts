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
import { ReminderEvaluator } from '../src/modules/billing-policies/reminder-evaluator.js';
import { ReminderStage, IBillingPolicyConfig } from '../src/modules/billing-policies/billing-policies.types.js';
import { DEFAULT_BILLING_POLICY_CONFIG } from '../src/modules/billing-policies/billing-policies.constants.js';
import { PaymentStatus, InvoiceStatus, IBillingRecord } from '../src/modules/billing/billing-record.model.js';
import { CustomerModel, CustomerType, AccountStatus, LoyaltyTier, PlanStatus } from '../src/modules/customers/customer.model.js';
import { BillingRecordModel } from '../src/modules/billing/billing-record.model.js';

describe('Phase 4: Billing Policy Engine and Reminder Escalations', () => {
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

    const admin = await createTestUser(UserRole.ADMIN, 'admin@example.com');
    adminToken = admin.accessToken;

    const marketing = await createTestUser(UserRole.MARKETING_MANAGER, 'marketing@example.com');
    marketingToken = marketing.accessToken;
  });

  describe('Deterministic ReminderEvaluator Unit Tests', () => {
    const baseConfig: IBillingPolicyConfig = {
      ...DEFAULT_BILLING_POLICY_CONFIG,
      upcomingDaysThreshold: 7,
      reminder1DaysThreshold: 7,
      reminder2DaysThreshold: 15,
      reminder3DaysThreshold: 30,
      escalationDaysThreshold: 30,
      requireHumanReviewForEscalation: true,
      excludeDisputedInvoices: true,
      minOutstandingAmountToRemind: 1.0
    };

    const asOfDate = new Date('2026-06-01T12:00:00.000Z');

    it('identifies UPCOMING reminder for invoice due in 5 days', () => {
      const invoices = [
        {
          invoiceId: 'INV-UPCOMING',
          customerId: 'CUST-001',
          invoiceAmount: 100,
          outstandingAmount: 100,
          currency: 'USD',
          dueDate: new Date('2026-06-06T12:00:00.000Z'), // 5 days in future
          paymentStatus: PaymentStatus.PENDING,
          invoiceStatus: InvoiceStatus.ACTIVE,
          disputeStatus: 'NONE'
        } as unknown as IBillingRecord
      ];

      const evaluation = ReminderEvaluator.evaluate('CUST-001', invoices, baseConfig, asOfDate);

      expect(evaluation.highestStage).toBe(ReminderStage.UPCOMING);
      expect(evaluation.requiresHumanReview).toBe(false);
      expect(evaluation.invoices[0]?.daysOverdue).toBe(-5);
      expect(evaluation.recommendedAction).toBe('DISPATCH_UPCOMING_REMINDER');
    });

    it('identifies REMINDER_1 for invoice 4 days overdue', () => {
      const invoices = [
        {
          invoiceId: 'INV-STAGE-1',
          customerId: 'CUST-001',
          invoiceAmount: 120,
          outstandingAmount: 120,
          currency: 'USD',
          dueDate: new Date('2026-05-28T12:00:00.000Z'), // 4 days overdue
          paymentStatus: PaymentStatus.OVERDUE,
          invoiceStatus: InvoiceStatus.ACTIVE,
          disputeStatus: 'NONE'
        } as unknown as IBillingRecord
      ];

      const evaluation = ReminderEvaluator.evaluate('CUST-001', invoices, baseConfig, asOfDate);

      expect(evaluation.highestStage).toBe(ReminderStage.REMINDER_1);
      expect(evaluation.requiresHumanReview).toBe(false);
      expect(evaluation.invoices[0]?.stage).toBe(ReminderStage.REMINDER_1);
      expect(evaluation.recommendedAction).toBe('DISPATCH_REMINDER_1');
    });

    it('identifies REMINDER_2 for invoice 12 days overdue', () => {
      const invoices = [
        {
          invoiceId: 'INV-STAGE-2',
          customerId: 'CUST-001',
          invoiceAmount: 200,
          outstandingAmount: 200,
          currency: 'USD',
          dueDate: new Date('2026-05-20T12:00:00.000Z'), // 12 days overdue
          paymentStatus: PaymentStatus.OVERDUE,
          invoiceStatus: InvoiceStatus.ACTIVE,
          disputeStatus: 'NONE'
        } as unknown as IBillingRecord
      ];

      const evaluation = ReminderEvaluator.evaluate('CUST-001', invoices, baseConfig, asOfDate);

      expect(evaluation.highestStage).toBe(ReminderStage.REMINDER_2);
      expect(evaluation.recommendedAction).toBe('DISPATCH_REMINDER_2');
    });

    it('identifies REMINDER_3 for invoice 25 days overdue', () => {
      const invoices = [
        {
          invoiceId: 'INV-STAGE-3',
          customerId: 'CUST-001',
          invoiceAmount: 250,
          outstandingAmount: 250,
          currency: 'USD',
          dueDate: new Date('2026-05-07T12:00:00.000Z'), // 25 days overdue
          paymentStatus: PaymentStatus.OVERDUE,
          invoiceStatus: InvoiceStatus.ACTIVE,
          disputeStatus: 'NONE'
        } as unknown as IBillingRecord
      ];

      const evaluation = ReminderEvaluator.evaluate('CUST-001', invoices, baseConfig, asOfDate);

      expect(evaluation.highestStage).toBe(ReminderStage.REMINDER_3);
      expect(evaluation.recommendedAction).toBe('DISPATCH_REMINDER_3');
    });

    it('identifies ESCALATION_REVIEW and flags requiresHumanReview for invoice >30 days overdue', () => {
      const invoices = [
        {
          invoiceId: 'INV-CRITICAL',
          customerId: 'CUST-001',
          invoiceAmount: 500,
          outstandingAmount: 500,
          currency: 'USD',
          dueDate: new Date('2026-04-15T12:00:00.000Z'), // 47 days overdue
          paymentStatus: PaymentStatus.OVERDUE,
          invoiceStatus: InvoiceStatus.ACTIVE,
          disputeStatus: 'NONE'
        } as unknown as IBillingRecord
      ];

      const evaluation = ReminderEvaluator.evaluate('CUST-001', invoices, baseConfig, asOfDate);

      expect(evaluation.highestStage).toBe(ReminderStage.ESCALATION_REVIEW);
      expect(evaluation.requiresHumanReview).toBe(true);
      expect(evaluation.recommendedAction).toBe('ESCALATE_FOR_HUMAN_APPROVAL');
    });

    it('isolates disputed invoices from standard collection escalations', () => {
      const invoices = [
        {
          invoiceId: 'INV-DISPUTED',
          customerId: 'CUST-001',
          invoiceAmount: 350,
          outstandingAmount: 350,
          currency: 'USD',
          dueDate: new Date('2026-04-10T12:00:00.000Z'), // 52 days overdue, but under dispute!
          paymentStatus: PaymentStatus.OVERDUE,
          invoiceStatus: InvoiceStatus.ACTIVE,
          disputeStatus: 'UNDER_INVESTIGATION'
        } as unknown as IBillingRecord
      ];

      const evaluation = ReminderEvaluator.evaluate('CUST-001', invoices, baseConfig, asOfDate);

      expect(evaluation.hasDisputedInvoices).toBe(true);
      expect(evaluation.disputedInvoices.length).toBe(1);
      expect(evaluation.disputedInvoices[0]?.isDisputed).toBe(true);
      // Because it is disputed and excludeDisputedInvoices is true, standard escalation is held
      expect(evaluation.highestStage).toBe(ReminderStage.NONE);
      expect(evaluation.requiresHumanReview).toBe(false);
      expect(evaluation.recommendedAction).toBe('MAINTAIN_DISPUTE_HOLD');
    });

    it('properly tracks multi-currency outstanding and overdue balances', () => {
      const invoices = [
        {
          invoiceId: 'INV-USD',
          customerId: 'CUST-001',
          invoiceAmount: 150,
          outstandingAmount: 150,
          currency: 'USD',
          dueDate: new Date('2026-05-25T12:00:00.000Z'), // 7 days overdue
          paymentStatus: PaymentStatus.OVERDUE,
          invoiceStatus: InvoiceStatus.ACTIVE,
          disputeStatus: 'NONE'
        } as unknown as IBillingRecord,
        {
          invoiceId: 'INV-EUR',
          customerId: 'CUST-001',
          invoiceAmount: 200,
          outstandingAmount: 200,
          currency: 'EUR',
          dueDate: new Date('2026-05-20T12:00:00.000Z'), // 12 days overdue
          paymentStatus: PaymentStatus.OVERDUE,
          invoiceStatus: InvoiceStatus.ACTIVE,
          disputeStatus: 'NONE'
        } as unknown as IBillingRecord
      ];

      const evaluation = ReminderEvaluator.evaluate('CUST-001', invoices, baseConfig, asOfDate);

      expect(evaluation.totalOutstandingByCurrency['USD']).toBe(150);
      expect(evaluation.totalOutstandingByCurrency['EUR']).toBe(200);
      expect(evaluation.totalOverdueByCurrency['USD']).toBe(150);
      expect(evaluation.totalOverdueByCurrency['EUR']).toBe(200);
      expect(evaluation.highestStage).toBe(ReminderStage.REMINDER_2);
    });

    it('returns NO_ACTION_REQUIRED when all invoices are paid or zero balance', () => {
      const invoices = [
        {
          invoiceId: 'INV-PAID-1',
          customerId: 'CUST-001',
          invoiceAmount: 100,
          outstandingAmount: 0,
          currency: 'USD',
          dueDate: new Date('2026-05-01T12:00:00.000Z'),
          paymentStatus: PaymentStatus.PAID,
          invoiceStatus: InvoiceStatus.ACTIVE,
          disputeStatus: 'NONE'
        } as unknown as IBillingRecord
      ];

      const evaluation = ReminderEvaluator.evaluate('CUST-001', invoices, baseConfig, asOfDate);

      expect(evaluation.highestStage).toBe(ReminderStage.NONE);
      expect(evaluation.requiresHumanReview).toBe(false);
      expect(evaluation.invoices.length).toBe(0);
      expect(evaluation.recommendedAction).toBe('NO_ACTION_REQUIRED');
    });
  });

  describe('Billing Policies API Endpoints', () => {
    it('allows Admin to update policy thresholds and retrieve active config', async () => {
      // 1. Get initial config
      const getRes = await request(app)
        .get('/api/v1/billing-policies/config')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.escalationDaysThreshold).toBe(30);

      // 2. Admin updates escalationDaysThreshold to 45
      const putRes = await request(app)
        .put('/api/v1/billing-policies/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ escalationDaysThreshold: 45 });

      expect(putRes.status).toBe(200);
      expect(putRes.body.data.escalationDaysThreshold).toBe(45);
    });

    it('evaluates billing records for a customer via HTTP endpoint', async () => {
      const customer = await CustomerModel.create({
        customerId: 'CUST-API-BILL',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice.smith@example.com',
        customerType: CustomerType.INDIVIDUAL,
        accountStatus: AccountStatus.ACTIVE,
        loyaltyInfo: {
          loyaltyTier: LoyaltyTier.SILVER,
          loyaltyPoints: 200,
          membershipStartDate: new Date('2025-01-01')
        },
        subscription: {
          activePlan: 'STANDARD',
          planType: 'TELECOM',
          planStatus: PlanStatus.ACTIVE,
          planStartDate: new Date('2025-01-01')
        },
        source: 'DIRECT'
      });

      await BillingRecordModel.create({
        customerId: customer.customerId,
        customerRef: customer._id,
        invoiceId: 'INV-API-OVERDUE',
        invoiceAmount: 180,
        outstandingAmount: 180,
        currency: 'USD',
        invoiceDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days overdue
        paymentStatus: PaymentStatus.OVERDUE,
        invoiceStatus: InvoiceStatus.ACTIVE,
        disputeStatus: 'NONE'
      });

      const res = await request(app)
        .post(`/api/v1/billing-policies/customers/${customer.customerId}/evaluate`)
        .set('Authorization', `Bearer ${marketingToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.highestStage).toBe(ReminderStage.REMINDER_2);
      expect(res.body.data.totalOverdueByCurrency['USD']).toBe(180);
    });
  });
});
