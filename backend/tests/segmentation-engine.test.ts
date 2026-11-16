import { describe, it, expect } from 'vitest';
import { SegmentationEvaluator } from '../src/modules/segmentation/segmentation.evaluator.js';
import {
  CustomerSegmentType,
  ClassificationStatus,
  ReasonCode
} from '../src/modules/segmentation/segmentation.constants.js';
import { DEFAULT_SEGMENTATION_CONFIG } from '../src/modules/segmentation/segmentation.rules.js';
import { AssembledCustomerProfile } from '../src/modules/customers/customer-profile.service.js';
import { IBillingRecord, PaymentStatus, InvoiceStatus } from '../src/modules/billing/billing-record.model.js';

describe('Customer Segmentation Engine Unit & Scenario Tests', () => {
  const baseDate = new Date('2026-11-16T12:00:00.000Z');

  // Helper factory for customer profiles
  const createMockProfile = (overrides?: Partial<AssembledCustomerProfile>): AssembledCustomerProfile => {
    const defaultProfile: AssembledCustomerProfile = {
      customer: {
        id: '673891000000000000000001',
        customerId: 'CUST-UNIT-01',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        customerType: 'TELECOM',
        accountStatus: 'ACTIVE',
        loyaltyTier: 'SILVER',
        loyaltyPoints: 600,
        membershipStartDate: new Date('2025-11-16T12:00:00.000Z'), // 365 days ago
        createdAt: new Date('2025-11-16T12:00:00.000Z')
      },
      subscription: {
        activePlan: 'Unlimited 5G Pro',
        planType: 'Postpaid',
        planStatus: 'ACTIVE',
        planStartDate: new Date('2025-11-16T12:00:00.000Z')
      },
      activity: {
        lastActivityDate: new Date('2026-11-12T12:00:00.000Z'), // 4 days ago
        activityCount30d: 8,
        activityCountPrevious30d: 8,
        activityTrend: 'STABLE'
      },
      billing: {
        totalInvoiced: 600,
        outstandingAmount: 0,
        currency: 'USD',
        paymentStatus: 'PAID',
        overdueInvoicesCount: 0,
        hasDisputedInvoices: false
      },
      communicationPreferences: {
        emailConsent: true,
        smsConsent: true,
        whatsappConsent: false,
        preferredChannel: 'EMAIL',
        optedOut: false,
        consentUpdatedAt: new Date('2025-11-16T12:00:00.000Z')
      }
    };

    return {
      ...defaultProfile,
      ...overrides,
      customer: { ...defaultProfile.customer, ...overrides?.customer },
      subscription: { ...defaultProfile.subscription, ...overrides?.subscription },
      activity: { ...defaultProfile.activity, ...overrides?.activity },
      billing: { ...defaultProfile.billing, ...overrides?.billing }
    };
  };

  // Helper factory for billing records
  const createMockInvoice = (overrides?: Partial<IBillingRecord>): IBillingRecord => {
    return {
      customerId: 'CUST-UNIT-01',
      invoiceId: 'INV-1001',
      invoiceAmount: 100,
      outstandingAmount: 0,
      currency: 'USD',
      invoiceDate: new Date('2026-10-01T12:00:00.000Z'),
      dueDate: new Date('2026-10-25T12:00:00.000Z'),
      paymentStatus: PaymentStatus.PAID,
      invoiceStatus: InvoiceStatus.ACTIVE,
      disputeStatus: 'NONE',
      ...overrides
    } as unknown as IBillingRecord;
  };

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Consistent Customer
  // ---------------------------------------------------------------------------
  it('Scenario 1: should correctly classify a Consistent Customer with regular activity and timely payment', () => {
    const profile = createMockProfile({
      activity: {
        lastActivityDate: new Date('2026-11-10T12:00:00.000Z'),
        activityCount30d: 6,
        activityCountPrevious30d: 6,
        activityTrend: 'STABLE'
      },
      billing: {
        totalInvoiced: 500,
        outstandingAmount: 0,
        currency: 'USD',
        paymentStatus: 'PAID',
        overdueInvoicesCount: 0,
        hasDisputedInvoices: false
      }
    });

    const invoices = [
      createMockInvoice({ invoiceId: 'INV-1', outstandingAmount: 0, paymentStatus: PaymentStatus.PAID })
    ];

    const result = SegmentationEvaluator.evaluate(profile, invoices, 12, DEFAULT_SEGMENTATION_CONFIG, baseDate);

    expect(result.classificationStatus).toBe(ClassificationStatus.CLASSIFIED);
    expect(result.primarySegment).toBe(CustomerSegmentType.CONSISTENT_CUSTOMER);
    expect(result.segments).toContain(CustomerSegmentType.CONSISTENT_CUSTOMER);
    expect(result.reasonCodes).toContain(ReasonCode.REGULAR_ACTIVITY);
    expect(result.reasonCodes).toContain(ReasonCode.ACTIVE_PLAN);
    expect(result.reasonCodes).toContain(ReasonCode.PAYMENT_ON_TIME);
    expect(result.reasonCodes).toContain(ReasonCode.CONSISTENT_ENGAGEMENT);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Loyalty Candidate
  // ---------------------------------------------------------------------------
  it('Scenario 2: should classify a customer with high loyalty points and long tenure as Loyalty Candidate', () => {
    const profile = createMockProfile({
      customer: {
        id: '673891000000000000000002',
        customerId: 'CUST-LOYAL-01',
        firstName: 'VIP',
        lastName: 'Member',
        email: 'vip@example.com',
        customerType: 'TELECOM',
        accountStatus: 'ACTIVE',
        loyaltyTier: 'PLATINUM',
        loyaltyPoints: 2800,
        membershipStartDate: new Date('2024-01-01T12:00:00.000Z'), // ~2+ years
        createdAt: new Date('2024-01-01T12:00:00.000Z')
      },
      activity: {
        lastActivityDate: new Date('2026-11-14T12:00:00.000Z'),
        activityCount30d: 12,
        activityCountPrevious30d: 10,
        activityTrend: 'INCREASING'
      }
    });

    const invoices = [
      createMockInvoice({ invoiceId: 'INV-L1', outstandingAmount: 0, paymentStatus: PaymentStatus.PAID })
    ];

    const result = SegmentationEvaluator.evaluate(profile, invoices, 25, DEFAULT_SEGMENTATION_CONFIG, baseDate);

    expect(result.classificationStatus).toBe(ClassificationStatus.CLASSIFIED);
    expect(result.segments).toContain(CustomerSegmentType.LOYALTY_CANDIDATE);
    expect(result.reasonCodes).toContain(ReasonCode.HIGH_LOYALTY_POINTS);
    expect(result.reasonCodes).toContain(ReasonCode.LONG_MEMBERSHIP_DURATION);
    expect(result.reasonCodes).toContain(ReasonCode.POSITIVE_PAYMENT_HISTORY);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Declining Activity Customer
  // ---------------------------------------------------------------------------
  it('Scenario 3: should classify a customer as Declining Activity when activity drops by 75%', () => {
    const profile = createMockProfile({
      customer: {
        id: '673891000000000000000003',
        customerId: 'CUST-DECLINE-01',
        firstName: 'Falling',
        lastName: 'Engagement',
        email: 'decline@example.com',
        customerType: 'RETAIL',
        accountStatus: 'ACTIVE',
        loyaltyTier: 'BRONZE',
        loyaltyPoints: 150,
        membershipStartDate: new Date('2025-06-01T12:00:00.000Z'),
        createdAt: new Date('2025-06-01T12:00:00.000Z')
      },
      activity: {
        lastActivityDate: new Date('2026-11-01T12:00:00.000Z'), // 15 days ago
        activityCount30d: 3,
        activityCountPrevious30d: 12, // Dropped from 12 to 3 = 75% reduction
        activityTrend: 'DECREASING'
      }
    });

    const invoices = [createMockInvoice({ invoiceId: 'INV-D1', outstandingAmount: 0 })];
    const result = SegmentationEvaluator.evaluate(profile, invoices, 15, DEFAULT_SEGMENTATION_CONFIG, baseDate);

    expect(result.classificationStatus).toBe(ClassificationStatus.CLASSIFIED);
    expect(result.segments).toContain(CustomerSegmentType.DECLINING_ACTIVITY);
    expect(result.primarySegment).toBe(CustomerSegmentType.DECLINING_ACTIVITY);
    expect(result.evidence.activityReductionPercent).toBe(75);
    expect(result.reasonCodes).toContain(ReasonCode.ACTIVITY_REDUCTION);
    expect(result.reasonCodes).toContain(ReasonCode.REDUCED_USAGE_FREQUENCY);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 4: Inactive / Dormant Customer
  // ---------------------------------------------------------------------------
  it('Scenario 4: should classify as Inactive when days since last activity exceeds threshold', () => {
    const profile = createMockProfile({
      customer: {
        id: '673891000000000000000004',
        customerId: 'CUST-INACTIVE-01',
        firstName: 'Dormant',
        lastName: 'Customer',
        email: 'dormant@example.com',
        customerType: 'TELECOM',
        accountStatus: 'INACTIVE',
        loyaltyTier: 'BRONZE',
        loyaltyPoints: 50,
        membershipStartDate: new Date('2025-01-01T12:00:00.000Z'),
        createdAt: new Date('2025-01-01T12:00:00.000Z')
      },
      activity: {
        lastActivityDate: new Date('2026-08-01T12:00:00.000Z'), // 107 days ago (> 60 days)
        activityCount30d: 0,
        activityCountPrevious30d: 0,
        activityTrend: 'NO_RECENT_ACTIVITY'
      }
    });

    const invoices = [createMockInvoice({ invoiceId: 'INV-I1', outstandingAmount: 0 })];
    const result = SegmentationEvaluator.evaluate(profile, invoices, 8, DEFAULT_SEGMENTATION_CONFIG, baseDate);

    expect(result.classificationStatus).toBe(ClassificationStatus.CLASSIFIED);
    expect(result.segments).toContain(CustomerSegmentType.INACTIVE);
    expect(result.primarySegment).toBe(CustomerSegmentType.INACTIVE);
    expect(result.reasonCodes).toContain(ReasonCode.NO_RECENT_ACTIVITY);
    expect(result.reasonCodes).toContain(ReasonCode.INACTIVITY_THRESHOLD_EXCEEDED);
    expect(result.evidence.daysSinceLastActivity).toBeGreaterThanOrEqual(60);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 5: Overdue Bill Customer
  // ---------------------------------------------------------------------------
  it('Scenario 5: should classify as Overdue Bill when unpaid invoice is past due date', () => {
    const profile = createMockProfile({
      customer: {
        id: '673891000000000000000005',
        customerId: 'CUST-OVERDUE-01',
        firstName: 'PastDue',
        lastName: 'Subscriber',
        email: 'overdue@example.com',
        customerType: 'TELECOM',
        accountStatus: 'ACTIVE',
        loyaltyTier: 'BRONZE',
        loyaltyPoints: 100,
        membershipStartDate: new Date('2026-01-01T12:00:00.000Z'),
        createdAt: new Date('2026-01-01T12:00:00.000Z')
      },
      billing: {
        totalInvoiced: 400,
        outstandingAmount: 250,
        currency: 'USD',
        paymentStatus: 'OVERDUE',
        overdueInvoicesCount: 1,
        hasDisputedInvoices: false
      }
    });

    const overdueInvoice = createMockInvoice({
      invoiceId: 'INV-OD-1',
      invoiceAmount: 250,
      outstandingAmount: 250,
      dueDate: new Date('2026-10-15T12:00:00.000Z'), // Overdue by ~32 days
      paymentStatus: PaymentStatus.OVERDUE,
      disputeStatus: 'NONE'
    });

    const result = SegmentationEvaluator.evaluate(profile, [overdueInvoice], 6, DEFAULT_SEGMENTATION_CONFIG, baseDate);

    expect(result.classificationStatus).toBe(ClassificationStatus.CLASSIFIED);
    expect(result.primarySegment).toBe(CustomerSegmentType.OVERDUE_BILL);
    expect(result.segments).toContain(CustomerSegmentType.OVERDUE_BILL);
    expect(result.reasonCodes).toContain(ReasonCode.OVERDUE_INVOICE);
    expect(result.reasonCodes).toContain(ReasonCode.OUTSTANDING_BALANCE);
    expect(result.reasonCodes).toContain(ReasonCode.PAYMENT_DUE_DATE_PASSED);
    expect(result.evidence.overdueInvoiceCount).toBe(1);
    expect(result.evidence.oldestOverdueDays).toBeGreaterThan(0);
    expect(result.evidence.oldestOverdueInvoiceId).toBe('INV-OD-1');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 6: Combined Scenario - Loyal Customer with Overdue Bill
  // ---------------------------------------------------------------------------
  it('Scenario 6: should assign multiple segments and prioritize OVERDUE_BILL as primary for loyal customer with overdue invoice', () => {
    const profile = createMockProfile({
      customer: {
        id: '673891000000000000000006',
        customerId: 'CUST-LOYAL-OVERDUE',
        firstName: 'Alex',
        lastName: 'LoyalOverdue',
        email: 'alex.loyal@example.com',
        customerType: 'TELECOM',
        accountStatus: 'ACTIVE',
        loyaltyTier: 'GOLD',
        loyaltyPoints: 3200,
        membershipStartDate: new Date('2024-01-01T12:00:00.000Z'),
        createdAt: new Date('2024-01-01T12:00:00.000Z')
      },
      activity: {
        lastActivityDate: new Date('2026-11-14T12:00:00.000Z'),
        activityCount30d: 9,
        activityCountPrevious30d: 9,
        activityTrend: 'STABLE'
      },
      billing: {
        totalInvoiced: 1200,
        outstandingAmount: 180,
        currency: 'USD',
        paymentStatus: 'OVERDUE',
        overdueInvoicesCount: 1,
        hasDisputedInvoices: false
      }
    });

    const overdueInvoice = createMockInvoice({
      invoiceId: 'INV-LO-1',
      invoiceAmount: 180,
      outstandingAmount: 180,
      dueDate: new Date('2026-10-20T12:00:00.000Z'),
      paymentStatus: PaymentStatus.OVERDUE
    });

    const result = SegmentationEvaluator.evaluate(profile, [overdueInvoice], 20, DEFAULT_SEGMENTATION_CONFIG, baseDate);

    // Multi-segment verification
    expect(result.segments).toContain(CustomerSegmentType.LOYALTY_CANDIDATE);
    expect(result.segments).toContain(CustomerSegmentType.OVERDUE_BILL);
    expect(result.segments.length).toBeGreaterThanOrEqual(2);

    // Primary priority verification: OVERDUE_BILL (1) precedes LOYALTY_CANDIDATE (4)
    expect(result.primarySegment).toBe(CustomerSegmentType.OVERDUE_BILL);

    // Both loyalty and overdue reason codes must be present
    expect(result.reasonCodes).toContain(ReasonCode.HIGH_LOYALTY_POINTS);
    expect(result.reasonCodes).toContain(ReasonCode.OVERDUE_INVOICE);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 7: Edge Case - Insufficient Activity Data
  // ---------------------------------------------------------------------------
  it('Scenario 7: should return INSUFFICIENT_DATA when customer has no historical activity or billing records', () => {
    const profile = createMockProfile({
      customer: {
        id: '673891000000000000000007',
        customerId: 'CUST-NO-DATA',
        firstName: 'New',
        lastName: 'Customer',
        email: 'nodata@example.com',
        customerType: 'RETAIL',
        accountStatus: 'ACTIVE',
        loyaltyTier: 'BRONZE',
        loyaltyPoints: 0,
        membershipStartDate: new Date('2026-11-15T12:00:00.000Z'), // 1 day old
        createdAt: new Date('2026-11-15T12:00:00.000Z')
      },
      activity: {
        lastActivityDate: null,
        activityCount30d: 0,
        activityCountPrevious30d: 0,
        activityTrend: 'NO_RECENT_ACTIVITY'
      },
      billing: {
        totalInvoiced: 0,
        outstandingAmount: 0,
        currency: 'USD',
        paymentStatus: 'PAID',
        overdueInvoicesCount: 0,
        hasDisputedInvoices: false
      }
    });

    // Zero invoices, zero lifetime activities
    const result = SegmentationEvaluator.evaluate(profile, [], 0, DEFAULT_SEGMENTATION_CONFIG, baseDate);

    expect(result.classificationStatus).toBe(ClassificationStatus.INSUFFICIENT_DATA);
    expect(result.primarySegment).toBeNull();
    expect(result.segments).toHaveLength(0);
    expect(result.reasonCodes).toContain(ReasonCode.INSUFFICIENT_ACTIVITY_HISTORY);
    expect(result.confidence).toBeLessThanOrEqual(0.35);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 8: Edge Case - Disputed Invoice Handling
  // ---------------------------------------------------------------------------
  it('Scenario 8: should exclude disputed invoices and not classify customer as OVERDUE_BILL when only overdue invoice is in dispute', () => {
    const profile = createMockProfile({
      customer: {
        id: '673891000000000000000008',
        customerId: 'CUST-DISPUTE-01',
        firstName: 'Dispute',
        lastName: 'Account',
        email: 'dispute@example.com',
        customerType: 'TELECOM',
        accountStatus: 'ACTIVE',
        loyaltyTier: 'SILVER',
        loyaltyPoints: 400,
        membershipStartDate: new Date('2025-06-01T12:00:00.000Z'),
        createdAt: new Date('2025-06-01T12:00:00.000Z')
      },
      billing: {
        totalInvoiced: 200,
        outstandingAmount: 200,
        currency: 'USD',
        paymentStatus: 'OVERDUE',
        overdueInvoicesCount: 1,
        hasDisputedInvoices: true
      }
    });

    const disputedInvoice = createMockInvoice({
      invoiceId: 'INV-DISP-1',
      invoiceAmount: 200,
      outstandingAmount: 200,
      dueDate: new Date('2026-10-10T12:00:00.000Z'),
      paymentStatus: PaymentStatus.OVERDUE,
      disputeStatus: 'IN_DISPUTE' // Under formal dispute
    });

    const result = SegmentationEvaluator.evaluate(profile, [disputedInvoice], 10, DEFAULT_SEGMENTATION_CONFIG, baseDate);

    // Overdue Bill must NOT be triggered because the overdue invoice is disputed
    expect(result.segments).not.toContain(CustomerSegmentType.OVERDUE_BILL);
    expect(result.primarySegment).not.toBe(CustomerSegmentType.OVERDUE_BILL);
    expect(result.reasonCodes).toContain(ReasonCode.DISPUTED_INVOICE_EXCLUDED);
  });

  // ---------------------------------------------------------------------------
  // Additional Edge Case: Overdue invoice with zero outstanding balance
  // ---------------------------------------------------------------------------
  it('should not classify as overdue if outstandingAmount is 0 regardless of past due date', () => {
    const profile = createMockProfile();
    const zeroBalanceInvoice = createMockInvoice({
      invoiceId: 'INV-ZERO-1',
      invoiceAmount: 150,
      outstandingAmount: 0,
      dueDate: new Date('2026-10-01T12:00:00.000Z'),
      paymentStatus: PaymentStatus.PAID
    });

    const result = SegmentationEvaluator.evaluate(profile, [zeroBalanceInvoice], 10, DEFAULT_SEGMENTATION_CONFIG, baseDate);

    expect(result.segments).not.toContain(CustomerSegmentType.OVERDUE_BILL);
  });

  // ---------------------------------------------------------------------------
  // Additional Edge Case: Declining activity without sufficient historical baseline
  // ---------------------------------------------------------------------------
  it('should not classify as Declining Activity if previous window had fewer than minBaselineActivityCount', () => {
    const profile = createMockProfile({
      activity: {
        lastActivityDate: new Date('2026-11-10T12:00:00.000Z'),
        activityCount30d: 0,
        activityCountPrevious30d: 1, // Only 1 activity in previous window (< 3)
        activityTrend: 'DECREASING'
      }
    });

    const invoices = [createMockInvoice()];
    const result = SegmentationEvaluator.evaluate(profile, invoices, 5, DEFAULT_SEGMENTATION_CONFIG, baseDate);

    expect(result.segments).not.toContain(CustomerSegmentType.DECLINING_ACTIVITY);
    expect(result.reasonCodes).toContain(ReasonCode.INSUFFICIENT_COMPARISON_BASELINE);
  });
});
