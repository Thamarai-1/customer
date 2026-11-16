import { useQuery } from '@tanstack/react-query';
import { fetchHealth, fetchReadiness } from '../services/api';
import { BackendHealthResponse } from '../types';

export function useApiHealth() {
  return useQuery<BackendHealthResponse, Error>({
    queryKey: ['apiHealth'],
    queryFn: fetchHealth,
    refetchInterval: 15000,
    retry: 2,
    staleTime: 5000
  });
}

export function useApiReadiness() {
  return useQuery<BackendHealthResponse, Error>({
    queryKey: ['apiReadiness'],
    queryFn: fetchReadiness,
    refetchInterval: 15000,
    retry: 2,
    staleTime: 5000
  });
}
