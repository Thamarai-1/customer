import { BackendHealthResponse } from '../types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export async function fetchHealth(): Promise<BackendHealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Health check failed with status: ${response.status}`);
  }

  return response.json();
}

export async function fetchReadiness(): Promise<BackendHealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health/readiness`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  return response.json();
}
