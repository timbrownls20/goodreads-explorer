import { useState, useEffect } from 'react';
import { getSummary } from '@/services/analytics';
import { AnalyticsSummary } from '@/types/Analytics';
import { FilterState } from '@/types/Filter';

interface UseAnalyticsReturn {
  summary: AnalyticsSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching and managing analytics summary data
 * @param filters - Optional filter state
 * @param autoFetch - Whether to automatically fetch on mount (default: true)
 */
export const useAnalytics = (
  filters?: FilterState,
  autoFetch: boolean = true,
): UseAnalyticsReturn => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getSummary(filters);
      setSummary(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to load analytics data';
      setError(errorMessage);
      console.error('Analytics fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch on mount and when filters change
  useEffect(() => {
    if (autoFetch) {
      fetchSummary();
    }
  }, [JSON.stringify(filters), autoFetch]);

  return {
    summary,
    isLoading,
    error,
    refetch: fetchSummary,
  };
};
