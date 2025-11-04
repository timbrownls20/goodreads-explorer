import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { MetricCard } from './MetricCard';
import { UploadManager } from './UploadManager';
import {
  formatNumber,
  formatDecimal,
  formatPercentage,
  formatDate,
} from '@/utils/dateFormat';
import './Dashboard.css';

export const Dashboard = () => {
  const [hasLibrary, setHasLibrary] = useState(false);
  const { summary, isLoading, error, refetch } = useAnalytics(
    undefined,
    hasLibrary,
  );

  const handleUploadSuccess = () => {
    setHasLibrary(true);
    refetch();
  };

  // Empty state - no library uploaded yet
  if (!hasLibrary && !summary) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <h1>Analytics Dashboard</h1>
          <p>Goodreads Library Visualization</p>
        </header>
        <div className="empty-state">
          <h2>No library data found</h2>
          <p>Upload your Goodreads library to get started with analytics</p>
          <UploadManager onUploadSuccess={handleUploadSuccess} />
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading && !summary) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <h1>Analytics Dashboard</h1>
        </header>
        <div className="loading-state">
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !summary) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <h1>Analytics Dashboard</h1>
        </header>
        <div className="error-state">
          <h2>Error loading analytics</h2>
          <p>{error}</p>
          <button onClick={() => refetch()}>Retry</button>
        </div>
      </div>
    );
  }

  // Main dashboard with data
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Analytics Dashboard</h1>
        <p>
          {summary?.unfilteredCount
            ? `${formatNumber(summary.unfilteredCount)} books in library`
            : 'No books'}
        </p>
        <UploadManager onUploadSuccess={handleUploadSuccess} />
      </header>

      {summary && (
        <>
          <section className="metrics-section">
            <h2>Summary Statistics</h2>
            <div className="metrics-grid">
              <MetricCard
                icon="📚"
                title="Total Books"
                value={formatNumber(summary.totalBooks)}
                subtitle={`Read: ${summary.totalRead} | Reading: ${summary.totalReading} | To-Read: ${summary.totalToRead}`}
              />
              <MetricCard
                icon="⭐"
                title="Average Rating"
                value={formatDecimal(summary.averageRating, 1)}
                subtitle={`${summary.totalRated} rated | Most common: ${summary.mostCommonRating || 'N/A'} ⭐`}
              />
              <MetricCard
                icon="📖"
                title="Books Per Month"
                value={formatDecimal(summary.averageBooksPerMonth, 1)}
                subtitle={`Reading streak: ${summary.readingStreak} months`}
              />
              <MetricCard
                icon="📈"
                title={`${new Date().getFullYear()} Total`}
                value={formatNumber(summary.currentYearTotal)}
                subtitle={`Previous year: ${summary.previousYearTotal}`}
                trend={formatPercentage(summary.yearOverYearChange, 1)}
              />
            </div>
          </section>

          <section className="metrics-section">
            <h2>Rating Distribution</h2>
            <div className="rating-distribution">
              {Object.entries(summary.ratingDistribution)
                .reverse()
                .map(([rating, count]) => (
                  <div key={rating} className="rating-bar">
                    <span className="rating-label">{rating} ⭐</span>
                    <div className="rating-bar-container">
                      <div
                        className="rating-bar-fill"
                        style={{
                          width: `${(count / summary.totalRated) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="rating-count">{count}</span>
                  </div>
                ))}
            </div>
          </section>

          <section className="metrics-section">
            <h2>Date Range</h2>
            <p className="date-range-text">
              {summary.dateRange.earliest && summary.dateRange.latest
                ? `${formatDate(summary.dateRange.earliest)} — ${formatDate(summary.dateRange.latest)}`
                : 'No date information available'}
            </p>
          </section>
        </>
      )}
    </div>
  );
};
