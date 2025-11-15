import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { Library } from '../models/library.model';
import { UserBookRelation } from '../models/user-book.model';
import { Book } from '../models/book.model';
import { Shelf, ReadingStatus } from '../models/shelf.model';
import { Review, ReadRecord } from '../models/user-book.model';
import { UrlValidator } from '../validators/url-validator';
import { LibraryParser } from '../parsers/library-parser';
import { BookParser } from '../parsers/book-parser';
import { PaginationHelper } from './pagination';
import {
  InvalidURLError,
  PrivateProfileError,
  NetworkError,
  ScrapingError,
} from '../exceptions/parser-exceptions';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface ScraperOptions {
  rateLimitDelay?: number; // ms between requests (default 1000)
  maxRetries?: number; // max retry attempts (default 3)
  timeout?: number; // request timeout in ms (default 30000)
  limit?: number; // max books to scrape (default null = all)
  sort?: string | null; // sort order (default null)
  outputDir?: string; // output directory for individual books
  progressCallback?: (current: number, total: number) => void;
}

export class GoodreadsScraper {
  private client: AxiosInstance;
  private options: Required<ScraperOptions>;

  constructor(options: ScraperOptions = {}) {
    this.options = {
      rateLimitDelay: options.rateLimitDelay ?? 1000,
      maxRetries: options.maxRetries ?? 3,
      timeout: options.timeout ?? 30000,
      limit: options.limit ?? 0,
      sort: options.sort ?? null,
      outputDir: options.outputDir ?? './output',
      progressCallback: options.progressCallback ?? (() => {}),
    };

    this.client = axios.create({
      timeout: this.options.timeout,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
  }

  /**
   * Main entry point: scrape a Goodreads library
   */
  async scrapeLibrary(profileUrl: string): Promise<Library> {
    // Validate URL
    const validation = UrlValidator.validateGoodreadsProfileUrl(profileUrl);
    if (!validation.isValid || !validation.normalizedUrl || !validation.userId) {
      throw new InvalidURLError(validation.error || 'Invalid profile URL');
    }

    const { normalizedUrl, userId } = validation;

    logger.info('Starting library scrape', { userId, profileUrl: normalizedUrl });

    // Fetch initial page to get username and check if profile is private
    const initialHtml = await this.fetchWithRetry(normalizedUrl);
    const isPrivate = this.isPrivateProfile(initialHtml);

    if (isPrivate) {
      throw new PrivateProfileError();
    }

    const libraryResult = LibraryParser.parseLibraryPage(initialHtml, normalizedUrl);
    const username = libraryResult.username || `user-${userId}`;

    logger.info('Profile validated', { userId, username });

    // Scrape all reading status shelves
    const userBooks: UserBookRelation[] = [];
    const readingStatuses: ReadingStatus[] = [
      ReadingStatus.READ,
      ReadingStatus.CURRENTLY_READING,
      ReadingStatus.TO_READ,
    ];

    for (const status of readingStatuses) {
      const booksForStatus = await this.scrapeBooksForShelf(
        normalizedUrl,
        userId,
        status,
        username
      );
      userBooks.push(...booksForStatus);

      if (this.options.limit && userBooks.length >= this.options.limit) {
        break;
      }
    }

    // Trim to limit if specified
    const finalUserBooks = this.options.limit
      ? userBooks.slice(0, this.options.limit)
      : userBooks;

    const library = new Library({
      userId,
      username,
      profileUrl: normalizedUrl,
      userBooks: finalUserBooks,
      scrapedAt: new Date().toISOString(),
      schemaVersion: '1.0.0',
    });

    logger.info('Library scrape complete', {
      userId,
      username,
      totalBooks: library.totalBooks,
    });

    return library;
  }

  /**
   * Scrape books for a specific shelf/status
   */
  private async scrapeBooksForShelf(
    profileUrl: string,
    userId: string,
    status: ReadingStatus,
    username: string
  ): Promise<UserBookRelation[]> {
    const userBooks: UserBookRelation[] = [];
    let page = 1;
    let hasNextPage = true;

    logger.info(`Scraping shelf: ${status}`);

    while (hasNextPage) {
      const shelfUrl = PaginationHelper.buildLibraryUrl(
        profileUrl,
        page,
        status,
        this.options.sort
      );

      logger.debug(`Fetching page ${page}`, { shelfUrl });

      const html = await this.fetchWithRetry(shelfUrl);
      const $ = cheerio.load(html);

      // Parse books from table
      const books = await this.extractBooksFromPage($, status, username);
      userBooks.push(...books);

      this.options.progressCallback(userBooks.length, 0);

      // Check for next page
      hasNextPage = PaginationHelper.detectPagination(html);

      if (this.options.limit && userBooks.length >= this.options.limit) {
        hasNextPage = false;
      }

      page++;
      await this.sleep(this.options.rateLimitDelay);
    }

    logger.info(`Shelf scrape complete: ${status}`, { bookCount: userBooks.length });

    return userBooks;
  }

  /**
   * Extract books from a library page
   */
  private async extractBooksFromPage(
    $: cheerio.CheerioAPI,
    status: ReadingStatus,
    username: string
  ): Promise<UserBookRelation[]> {
    const userBooks: UserBookRelation[] = [];

    // Find all book rows in the table
    const bookRows = $('#booksBody tr, table#books tr').toArray();

    for (const row of bookRows) {
      try {
        const userBook = await this.parseBookRow($, $(row), status, username);
        if (userBook) {
          userBooks.push(userBook);
        }
      } catch (error) {
        logger.error('Failed to parse book row', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return userBooks;
  }

  /**
   * Parse a single book row from the library table
   */
  private async parseBookRow(
    $: cheerio.CheerioAPI,
    $row: cheerio.Cheerio<any>,
    status: ReadingStatus,
    username: string
  ): Promise<UserBookRelation | null> {
    // Extract basic info from table row
    const titleElement = $row.find('.title a, .field.title a').first();
    const title = titleElement.text().trim();
    const bookUrl = titleElement.attr('href');

    if (!title || !bookUrl) {
      return null;
    }

    const fullBookUrl = bookUrl.startsWith('http')
      ? bookUrl
      : `https://www.goodreads.com${bookUrl}`;

    // Extract author
    const author = $row.find('.author a, .field.author a').first().text().trim();

    // Extract rating
    const ratingText = $row.find('.rating .staticStars, .field.rating .staticStars').first().attr('title');
    const ratingMatch = ratingText?.match(/(\d+) of 5 stars/);
    const userRating = ratingMatch ? parseInt(ratingMatch[1], 10) : null;

    // Extract shelves
    const shelfElements = $row.find('.shelf a, .field.shelf a');
    const shelves: Shelf[] = [];
    shelfElements.each((_, el) => {
      const shelfName = $(el).text().trim();
      if (shelfName) {
        shelves.push(
          new Shelf({
            name: shelfName,
            isBuiltin: ['read', 'currently-reading', 'to-read'].includes(shelfName.toLowerCase()),
            bookCount: null,
          })
        );
      }
    });

    // Extract date added
    const dateAddedText = $row.find('.date_added, .field.date_added').first().text().trim();
    const dateAdded = dateAddedText || null;

    // Extract review (if any)
    let review: Review | null = null;
    const reviewElement = $row.find('.review_text, .field.review');
    if (reviewElement.length > 0) {
      const reviewText = reviewElement.text().trim();
      if (reviewText) {
        review = new Review({
          reviewText,
          reviewDate: null,
          likesCount: null,
        });
      }
    }

    // Extract read dates
    const readRecords: ReadRecord[] = [];
    const dateReadText = $row.find('.date_read, .field.date_read').first().text().trim();

    if (dateReadText) {
      readRecords.push(
        new ReadRecord({
          dateStarted: null,
          dateFinished: dateReadText || null,
        })
      );
    } else if (status === ReadingStatus.READ) {
      // Even if no dates, create a read record for read books
      readRecords.push(
        new ReadRecord({
          dateStarted: null,
          dateFinished: null,
        })
      );
    }

    // Create basic book object
    const book = new Book({
      goodreadsId: fullBookUrl.match(/\/book\/show\/([^/?]+)/)?.[1] || '',
      title,
      author,
      goodreadsUrl: fullBookUrl,
    });

    // Save individual book file
    await this.saveIndividualBook(book, {
      userRating,
      readingStatus: status,
      shelves,
      review,
      dateAdded,
      readRecords,
    }, username);

    // Create user-book relation
    const userBook = new UserBookRelation({
      book,
      userRating,
      readingStatus: status,
      shelves,
      review,
      dateAdded,
      readRecords,
    });

    return userBook;
  }

  /**
   * Save individual book JSON file
   */
  private async saveIndividualBook(
    book: Book,
    userData: {
      userRating: number | null;
      readingStatus: ReadingStatus;
      shelves: Shelf[];
      review: Review | null;
      dateAdded: string | null;
      readRecords: ReadRecord[];
    },
    username: string
  ): Promise<void> {
    const outputDir = path.join(this.options.outputDir, `${username}_library`);

    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate filename using goodreads ID
    const filename = `${book.goodreadsId}.json`;
    const filepath = path.join(outputDir, filename);

    const data = {
      book: {
        ...book,
      },
      review: userData.review,
      shelves: userData.shelves,
      _metadata: {
        username,
        exportedAt: null,
      },
      dateAdded: userData.dateAdded,
      scrapedAt: new Date().toISOString(),
      userRating: userData.userRating,
      readRecords: userData.readRecords,
      readingStatus: userData.readingStatus,
    };

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Fetch URL with retry logic
   */
  private async fetchWithRetry(url: string, retries: number = 0): Promise<string> {
    try {
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      if (retries < this.options.maxRetries) {
        const delay = Math.pow(2, retries) * 1000; // Exponential backoff
        logger.warn(`Request failed, retrying in ${delay}ms`, { url, retries });
        await this.sleep(delay);
        return this.fetchWithRetry(url, retries + 1);
      } else {
        throw new NetworkError(
          `Failed to fetch ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }

  /**
   * Check if profile is private
   */
  private isPrivateProfile(html: string): boolean {
    const $ = cheerio.load(html);
    const privateText = $('body').text();
    return (
      privateText.includes('This profile is private') ||
      privateText.includes('profile is set to private')
    );
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
