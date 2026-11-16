import { AuthService } from './auth.service';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface CustomerSummaryItem {
  _id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  customerType: string;
  accountStatus: string;
  loyaltyInfo: {
    loyaltyTier: string;
    loyaltyPoints: number;
  };
  subscription: {
    activePlan: string;
    planStatus: string;
  };
}

export interface CustomerListResponse {
  customers: CustomerSummaryItem[];
  meta: {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

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
    membershipStartDate: string;
    createdAt: string;
  };
  subscription: {
    activePlan: string;
    planType: string;
    planStatus: string;
    planStartDate: string;
    planEndDate?: string;
  };
  activity: {
    lastActivityDate: string | null;
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
    consentUpdatedAt: string;
  };
}

export class CustomerApiClient {
  private static getHeaders(): Record<string, string> {
    const token = AuthService.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  static async listCustomers(params: {
    page?: number;
    limit?: number;
    search?: string;
    loyaltyTier?: string;
    accountStatus?: string;
  }): Promise<CustomerListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.loyaltyTier) query.set('loyaltyTier', params.loyaltyTier);
    if (params.accountStatus) query.set('accountStatus', params.accountStatus);

    const res = await fetch(`${API_BASE_URL}/customers?${query.toString()}`, {
      headers: this.getHeaders()
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || data.error?.message || 'Failed to fetch customers');
    }

    return {
      customers: data.data || [],
      meta: data.meta || {
        page: 1,
        limit: 20,
        totalRecords: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      }
    };
  }

  static async getCustomerProfile(id: string): Promise<AssembledCustomerProfile> {
    const res = await fetch(`${API_BASE_URL}/customers/${id}/profile`, {
      headers: this.getHeaders()
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || data.error?.message || 'Failed to load customer profile');
    }

    return data.data;
  }
}
