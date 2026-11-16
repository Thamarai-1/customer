import { CustomerRepository } from './customer.repository.js';
import { ActivityService } from '../activities/activity.service.js';
import { BillingService } from '../billing/billing.service.js';
import { PreferenceService } from '../communications/preference.service.js';

export interface AssembledCustomerProfile {
  customer: {
    id: string;
    customerId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    customerType: string;
    accountStatus: string;
    loyaltyTier: string;
    loyaltyPoints: number;
    membershipStartDate: Date;
    createdAt: Date;
  };
  subscription: {
    activePlan: string;
    planType: string;
    planStatus: string;
    planStartDate: Date;
    planEndDate?: Date;
  };
  activity: {
    lastActivityDate: Date | null;
    activityCount30d: number;
    activityCountPrevious30d: number;
    activityTrend: string;
  };
  billing: {
    totalInvoiced: number;
    outstandingAmount: number;
    currency: string;
    paymentStatus: string;
    overdueInvoicesCount: number;
    hasDisputedInvoices: boolean;
  };
  communicationPreferences: {
    emailConsent: boolean;
    smsConsent: boolean;
    whatsappConsent: boolean;
    preferredChannel: string;
    optedOut: boolean;
    consentUpdatedAt: Date;
  };
}

export class CustomerProfileService {
  /**
   * Consolidate customer, subscription, activity, billing, and preferences into a unified profile
   */
  static async assembleProfile(customerIdOrId: string): Promise<AssembledCustomerProfile> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerIdOrId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    // Fetch related domains concurrently for performance
    const [activitySummary, billingSummary, preferences] = await Promise.all([
      ActivityService.getActivitySummary(customer.customerId).catch(() => ({
        customerId: customer.customerId,
        lastActivityDate: null,
        activityCount30d: 0,
        activityCountPrevious30d: 0,
        activityTrend: 'NO_RECENT_ACTIVITY' as const,
        recentActivityBreakdown: {}
      })),
      BillingService.getCustomerBillingSummary(customer.customerId).catch(() => ({
        customerId: customer.customerId,
        totalInvoiced: 0,
        totalOutstanding: 0,
        currency: 'USD',
        paymentStatus: 'PAID' as const,
        overdueInvoicesCount: 0,
        hasDisputedInvoices: false,
        latestInvoiceDate: null
      })),
      PreferenceService.getPreferences(customer.customerId).catch(() => null)
    ]);

    return {
      customer: {
        id: customer._id.toString(),
        customerId: customer.customerId,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        customerType: customer.customerType,
        accountStatus: customer.accountStatus,
        loyaltyTier: customer.loyaltyInfo?.loyaltyTier || 'BRONZE',
        loyaltyPoints: customer.loyaltyInfo?.loyaltyPoints || 0,
        membershipStartDate: customer.loyaltyInfo?.membershipStartDate || customer.createdAt,
        createdAt: customer.createdAt
      },
      subscription: {
        activePlan: customer.subscription?.activePlan || 'Standard',
        planType: customer.subscription?.planType || 'Postpaid',
        planStatus: customer.subscription?.planStatus || 'ACTIVE',
        planStartDate: customer.subscription?.planStartDate || customer.createdAt,
        planEndDate: customer.subscription?.planEndDate
      },
      activity: {
        lastActivityDate: activitySummary.lastActivityDate,
        activityCount30d: activitySummary.activityCount30d,
        activityCountPrevious30d: activitySummary.activityCountPrevious30d,
        activityTrend: activitySummary.activityTrend
      },
      billing: {
        totalInvoiced: billingSummary.totalInvoiced,
        outstandingAmount: billingSummary.totalOutstanding,
        currency: billingSummary.currency,
        paymentStatus: billingSummary.paymentStatus,
        overdueInvoicesCount: billingSummary.overdueInvoicesCount,
        hasDisputedInvoices: billingSummary.hasDisputedInvoices
      },
      communicationPreferences: {
        emailConsent: preferences?.emailConsent ?? false,
        smsConsent: preferences?.smsConsent ?? false,
        whatsappConsent: preferences?.whatsappConsent ?? false,
        preferredChannel: preferences?.preferredChannel || 'EMAIL',
        optedOut: preferences?.optedOut ?? false,
        consentUpdatedAt: preferences?.consentUpdatedAt || new Date()
      }
    };
  }
}
