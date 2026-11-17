import { AuthService } from './auth.service';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export type DeliveryMode = 'MOCK' | 'DRAFT_ONLY';
export type DeliveryStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'BLOCKED' | 'CANCELLED';

export interface IDeliveryRecord {
  _id: string;
  generatedMessageId: string;
  customerId: string;
  customerRef?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    customerType: string;
  };
  messageVersion: number;
  reviewId: string;
  approvalActionId: string;
  complianceValidationId: string;
  campaignRef?: {
    _id: string;
    name: string;
    campaignCode: string;
  };
  channel: string;
  deliveryMode: DeliveryMode;
  status: DeliveryStatus;
  idempotencyKey: string;
  providerMessageId?: string;
  recipientMasked: string;
  subject: string;
  bodySnippet: string;
  errorCode?: string;
  errorMessage?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface DeliveryStats {
  totalAttempts: number;
  mockDeliveries: number;
  draftOnlyRecords: number;
  successfulMockDeliveries: number;
  failedAttempts: number;
  blockedAttempts: number;
  duplicateAttemptsPrevented: number;
  channelDistribution: Record<string, number>;
  deliverySuccessRate: number;
}

export class DeliveryService {
  private static getHeaders(): Record<string, string> {
    const token = AuthService.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  static async getDeliveries(params?: {
    page?: number;
    limit?: number;
    customerId?: string;
    status?: string;
    deliveryMode?: string;
    channel?: string;
  }): Promise<{ data: IDeliveryRecord[]; meta: any }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.customerId) query.set('customerId', params.customerId);
    if (params?.status) query.set('status', params.status);
    if (params?.deliveryMode) query.set('deliveryMode', params.deliveryMode);
    if (params?.channel) query.set('channel', params.channel);

    const res = await fetch(`${API_BASE_URL}/deliveries?${query.toString()}`, {
      headers: this.getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch deliveries');
    return { data: json.data || [], meta: json.meta };
  }

  static async getDeliveryById(id: string): Promise<IDeliveryRecord> {
    const res = await fetch(`${API_BASE_URL}/deliveries/${id}`, {
      headers: this.getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch delivery record');
    return json.data;
  }

  static async getDashboardStats(): Promise<DeliveryStats> {
    const res = await fetch(`${API_BASE_URL}/deliveries/dashboard/stats`, {
      headers: this.getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch delivery stats');
    return json.data;
  }

  static async createDelivery(dto: {
    generatedMessageId: string;
    messageVersion: number;
    deliveryMode: DeliveryMode;
    idempotencyKey?: string;
    channel?: string;
  }): Promise<IDeliveryRecord> {
    const res = await fetch(`${API_BASE_URL}/deliveries`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(dto)
    });
    const json = await res.json();
    if (!res.ok) {
      const err = new Error(json.message || 'Delivery request failed') as any;
      err.data = json.data;
      throw err;
    }
    return json.data;
  }

  static async retryDelivery(deliveryId: string): Promise<IDeliveryRecord> {
    const res = await fetch(`${API_BASE_URL}/deliveries/${deliveryId}/retry`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Delivery retry failed');
    return json.data;
  }
}
