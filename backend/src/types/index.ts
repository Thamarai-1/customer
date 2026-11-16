export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
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
