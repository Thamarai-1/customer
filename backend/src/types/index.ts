export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  errors?: unknown[];
  timestamp: string;
}

export interface ServiceHealth {
  status: 'UP' | 'DOWN';
  latencyMs?: number;
  details?: string;
}

export interface HealthCheckResponse {
  success: boolean;
  message: string;
  timestamp: string;
  services?: {
    database: ServiceHealth;
    redis: ServiceHealth;
  };
}

export interface PaginationMeta {
  [key: string]: unknown;
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
