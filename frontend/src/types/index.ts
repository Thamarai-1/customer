import { LucideIcon } from 'lucide-react';

export type NavItemKey =
  | 'dashboard'
  | 'customers'
  | 'segments'
  | 'campaigns'
  | 'offers'
  | 'ai-messages'
  | 'approvals'
  | 'compliance'
  | 'deliveries'
  | 'evaluation'
  | 'demo'
  | 'audit-logs'
  | 'settings';

export interface NavigationItem {
  id: NavItemKey;
  label: string;
  href: string;
  iconName: string;
  badge?: string;
  description: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface BackendHealthResponse {
  success: boolean;
  message: string;
  timestamp: string;
  services?: {
    database: {
      status: 'UP' | 'DOWN';
      latencyMs?: number;
      details?: string;
    };
    redis: {
      status: 'UP' | 'DOWN';
      latencyMs?: number;
      details?: string;
    };
  };
}
