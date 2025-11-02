import api from './api';
import { AnalyticsSummary } from '@/types/Analytics';
import { FilterState } from '@/types/Filter';

/**
 * Get summary statistics for library with optional filters
 * @param filters - Optional filter parameters
 * @returns Summary statistics object
 */
export const getSummary = async (
  filters?: FilterState,
): Promise<AnalyticsSummary> => {
  const response = await api.get<AnalyticsSummary>('/analytics/summary', {
    params: filters,
  });

  return response.data;
};

/**
 * Health check for API
 */
export const healthCheck = async (): Promise<{
  status: string;
  timestamp: string;
  database: string;
}> => {
  const response = await api.get('/health');
  return response.data;
};
