import { AuthService } from './auth.service';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export interface IAuditLogItem {
  _id: string;
  actorType: 'user' | 'system' | 'ai_agent';
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: string;
}

export interface AuditQueryFilter {
  action?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  limit?: number;
  skip?: number;
}

export class AuditService {
  private static getHeaders(): Record<string, string> {
    const token = AuthService.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  static async getLogs(filter?: AuditQueryFilter): Promise<{
    data: IAuditLogItem[];
    meta: { total: number; limit: number; skip: number };
  }> {
    const params = new URLSearchParams();
    if (filter?.action) params.append('action', filter.action);
    if (filter?.entityType) params.append('entityType', filter.entityType);
    if (filter?.entityId) params.append('entityId', filter.entityId);
    if (filter?.actorId) params.append('actorId', filter.actorId);
    if (filter?.limit) params.append('limit', String(filter.limit));
    if (filter?.skip) params.append('skip', String(filter.skip));

    const res = await fetch(`${API_BASE_URL}/audit/logs?${params.toString()}`, {
      headers: this.getHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to fetch audit logs');
    return {
      data: json.data || [],
      meta: json.meta || { total: 0, limit: 50, skip: 0 }
    };
  }
}
