export interface AnalyticsSummary {
  totalBooks: number;
  totalRead: number;
  totalReading: number;
  totalToRead: number;
  totalRated: number;
  averageRating: number;
  ratingDistribution: { [rating: number]: number };
  mostCommonRating: number | null;
  averageBooksPerMonth: number;
  readingStreak: number;
  currentYearTotal: number;
  previousYearTotal: number;
  yearOverYearChange: number;
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
  filteredCount: number;
  unfilteredCount: number;
}

export interface TrendDataPoint {
  label: string; // Date label (e.g., "2024-01", "2024-Q1", "2024")
  value: number; // Count or average
}

export interface TrendData {
  readingVolume: TrendDataPoint[];
  ratingTrend: TrendDataPoint[];
  granularity: 'monthly' | 'quarterly' | 'yearly';
}

export interface CategoryBreakdown {
  name: string;
  count: number;
  percentage: number;
  averageRating: number | null;
}

export interface CategoryData {
  genres: CategoryBreakdown[];
  authors: CategoryBreakdown[];
  decades: CategoryBreakdown[];
  pageRanges: CategoryBreakdown[];
}

export interface UploadResponse {
  success: boolean;
  message: string;
  stats: {
    filesProcessed: number;
    filesSkipped: number;
    booksImported: number;
    booksSkipped: number;
    durationMs: number;
  };
  errors?: Array<{
    file: string;
    error: string;
  }>;
  libraryId: string;
}
