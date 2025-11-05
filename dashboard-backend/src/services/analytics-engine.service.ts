import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Book } from '../models/book.model';
import {
  AnalyticsSummaryDto,
  FilterRequestDto,
} from '../dto/analytics.dto';
import { logger } from '../utils/logger';

@Injectable()
export class AnalyticsEngineService {
  constructor(
    @InjectModel(Book)
    private bookModel: typeof Book,
  ) {}

  /**
   * Calculate summary statistics for a library with optional filters
   */
  async getSummary(
    libraryId: string,
    filters?: FilterRequestDto,
  ): Promise<AnalyticsSummaryDto> {
    const startTime = Date.now();

    // Get filtered books
    const filteredBooks = await this.getFilteredBooks(libraryId, filters);
    const unfilteredBooks = await this.bookModel.findAll({
      where: { libraryId },
    });

    // Calculate summary statistics
    const summary: AnalyticsSummaryDto = {
      // Total counts by status
      totalBooks: filteredBooks.length,
      totalRead: filteredBooks.filter((b) => b.status === 'read').length,
      totalReading: filteredBooks.filter(
        (b) => b.status === 'currently-reading',
      ).length,
      totalToRead: filteredBooks.filter((b) => b.status === 'to-read').length,

      // Rating statistics
      totalRated: filteredBooks.filter((b) => b.rating !== null).length,
      averageRating: this.calculateAverageRating(filteredBooks),
      ratingDistribution: this.calculateRatingDistribution(filteredBooks),
      mostCommonRating: this.calculateMostCommonRating(filteredBooks),

      // Reading pace statistics
      averageBooksPerMonth: this.calculateBooksPerMonth(filteredBooks),
      readingStreak: this.calculateReadingStreak(filteredBooks),

      // Year-over-year comparison
      currentYearTotal: this.countBooksInYear(filteredBooks, new Date().getFullYear()),
      previousYearTotal: this.countBooksInYear(filteredBooks, new Date().getFullYear() - 1),
      yearOverYearChange: 0, // Will calculate after counts

      // Date range
      dateRange: this.calculateDateRange(filteredBooks),

      // Filter counts
      filteredCount: filteredBooks.length,
      unfilteredCount: unfilteredBooks.length,
    };

    // Calculate year-over-year change
    summary.yearOverYearChange =
      summary.previousYearTotal > 0
        ? ((summary.currentYearTotal - summary.previousYearTotal) /
            summary.previousYearTotal) *
          100
        : 0;

    const duration = Date.now() - startTime;
    logger.info('Summary statistics calculated', {
      libraryId,
      duration,
      filteredCount: summary.filteredCount,
      unfilteredCount: summary.unfilteredCount,
    });

    return summary;
  }

  /**
   * Get books with filters applied
   */
  private async getFilteredBooks(
    libraryId: string,
    filters?: FilterRequestDto,
  ): Promise<Book[]> {
    const where: any = { libraryId };

    if (filters) {
      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.ratingMin !== undefined || filters.ratingMax !== undefined) {
        where.rating = {};
        if (filters.ratingMin !== undefined) {
          where.rating[Op.gte] = filters.ratingMin;
        }
        if (filters.ratingMax !== undefined) {
          where.rating[Op.lte] = filters.ratingMax;
        }
      }

      if (filters.dateStart || filters.dateEnd) {
        where.dateFinished = {};
        if (filters.dateStart) {
          where.dateFinished[Op.gte] = filters.dateStart;
        }
        if (filters.dateEnd) {
          where.dateFinished[Op.lte] = filters.dateEnd;
        }
      }

      // PostgreSQL JSONB array contains - checks if any array element matches
      if (filters.genres && filters.genres.length > 0) {
        where.genres = {
          [Op.overlap]: filters.genres, // Sequelize operator for JSONB array overlap
        };
      }

      if (filters.shelves && filters.shelves.length > 0) {
        where.shelves = {
          [Op.overlap]: filters.shelves,
        };
      }
    }

    return this.bookModel.findAll({ where });
  }

  /**
   * Calculate average rating from books
   */
  private calculateAverageRating(books: Book[]): number {
    const ratedBooks = books.filter((b) => b.rating !== null);
    if (ratedBooks.length === 0) return 0;

    const sum = ratedBooks.reduce((acc, b) => acc + (b.rating || 0), 0);
    return Math.round((sum / ratedBooks.length) * 100) / 100; // Round to 2 decimals
  }

  /**
   * Calculate rating distribution
   */
  private calculateRatingDistribution(
    books: Book[],
  ): { [rating: number]: number } {
    const distribution: { [rating: number]: number } = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    books.forEach((book) => {
      if (book.rating !== null && book.rating >= 1 && book.rating <= 5) {
        distribution[book.rating]++;
      }
    });

    return distribution;
  }

  /**
   * Find most common rating
   */
  private calculateMostCommonRating(books: Book[]): number | null {
    const distribution = this.calculateRatingDistribution(books);
    let maxCount = 0;
    let mostCommon: number | null = null;

    Object.entries(distribution).forEach(([rating, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = parseInt(rating, 10);
      }
    });

    return mostCommon;
  }

  /**
   * Calculate average books per month
   */
  private calculateBooksPerMonth(books: Book[]): number {
    const finishedBooks = books.filter(
      (b) => b.status === 'read' && b.dateFinished,
    );

    if (finishedBooks.length === 0) return 0;

    // Find date range
    const dates = finishedBooks
      .map((b) => new Date(b.dateFinished!).getTime())
      .sort((a, b) => a - b);

    const earliestDate = new Date(dates[0]);
    const latestDate = new Date(dates[dates.length - 1]);

    // Calculate months between dates
    const monthsDiff =
      (latestDate.getFullYear() - earliestDate.getFullYear()) * 12 +
      (latestDate.getMonth() - earliestDate.getMonth()) +
      1;

    const booksPerMonth = finishedBooks.length / monthsDiff;
    return Math.round(booksPerMonth * 100) / 100; // Round to 2 decimals
  }

  /**
   * Calculate reading streak (consecutive months with at least one book)
   */
  private calculateReadingStreak(books: Book[]): number {
    const finishedBooks = books
      .filter((b) => b.status === 'read' && b.dateFinished)
      .map((b) => ({
        year: new Date(b.dateFinished!).getFullYear(),
        month: new Date(b.dateFinished!).getMonth(),
      }));

    if (finishedBooks.length === 0) return 0;

    // Group by year-month
    const monthsWithBooks = new Set(
      finishedBooks.map((d) => `${d.year}-${d.month}`),
    );

    // Find longest streak ending at current month
    const now = new Date();
    let streak = 0;
    let checkDate = new Date(now.getFullYear(), now.getMonth(), 1);

    while (
      monthsWithBooks.has(`${checkDate.getFullYear()}-${checkDate.getMonth()}`)
    ) {
      streak++;
      checkDate = new Date(checkDate.getFullYear(), checkDate.getMonth() - 1, 1);
    }

    return streak;
  }

  /**
   * Count books finished in a specific year
   */
  private countBooksInYear(books: Book[], year: number): number {
    return books.filter((b) => {
      if (!b.dateFinished) return false;
      const finishedYear = new Date(b.dateFinished).getFullYear();
      return finishedYear === year;
    }).length;
  }

  /**
   * Calculate date range of library
   */
  private calculateDateRange(books: Book[]): {
    earliest: string | null;
    latest: string | null;
  } {
    const finishedBooks = books.filter((b) => b.dateFinished);

    if (finishedBooks.length === 0) {
      return { earliest: null, latest: null };
    }

    const dates = finishedBooks
      .map((b) => new Date(b.dateFinished!).getTime())
      .sort((a, b) => a - b);

    return {
      earliest: new Date(dates[0]).toISOString().split('T')[0],
      latest: new Date(dates[dates.length - 1]).toISOString().split('T')[0],
    };
  }
}
