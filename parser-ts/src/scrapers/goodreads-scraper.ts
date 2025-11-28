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

/**
 * Clean scraped text by removing extra whitespace and common placeholder text
 */
function cleanScrapedText(text: string | undefined | null): string | null {
  if (!text) return null;

  // Trim and normalize whitespace
  let cleaned = text
    .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
    .trim();

  // Return null for common empty/placeholder values
  if (!cleaned ||
      cleaned.toLowerCase() === 'none' ||
      cleaned.toLowerCase() === 'null' ||
      cleaned.toLowerCase() === 'n/a' ||
      cleaned === '-') {
    return null;
  }

  return cleaned;
}

/**
 * Clean date text by removing common prefixes
 */
function cleanDateText(text: string | undefined | null, prefix: string): string | null {
  if (!text) return null;

  const cleaned = text
    .replace(new RegExp(`^${prefix}\\s*`, 'i'), '')  // Remove prefix (case insensitive)
    .replace(/\s+/g, ' ')                             // Replace multiple whitespace
    .trim();

  // Return null for common empty/placeholder values
  if (!cleaned ||
      cleaned.toLowerCase() === 'none' ||
      cleaned.toLowerCase() === 'null' ||
      cleaned.toLowerCase() === 'n/a' ||
      cleaned.toLowerCase() === 'not set' ||
      cleaned === '-') {
    return null;
  }

  return cleaned;
}

/**
 * Parse Goodreads date string to ISO 8601 format
 * Handles formats like "Oct 07, 2025", "October 7, 2025", etc.
 */
function parseGoodreadsDate(dateStr: string | null): string | null {
  if (!dateStr) return null;

  try {
    // Month abbreviations to numbers
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04',
      may: '05', jun: '06', jul: '07', aug: '08',
      sep: '09', oct: '10', nov: '11', dec: '12',
      january: '01', february: '02', march: '03', april: '04',
      june: '06', july: '07', august: '08', september: '09',
      october: '10', november: '11', december: '12'
    };

    // Try to match "Oct 07, 2025" or "October 7, 2025" format
    const match = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (match) {
      const monthStr = match[1].toLowerCase();
      const day = match[2].padStart(2, '0');
      const year = match[3];
      const month = months[monthStr];

      if (month) {
        return `${year}-${month}-${day}T00:00:00`;
      }
    }

    // If no match, return null
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse reading timeline from review page HTML
 * Extracts multiple read records (started/finished dates) from the timeline
 *
 * Rules:
 * - A "Finished Reading" without a date or corresponding "Started Reading" = read with null start/end
 * - Match "Started Reading" with subsequent "Finished Reading" to form read records
 */
function parseReadingTimeline(html: string): ReadRecord[] {
  const $ = cheerio.load(html);
  const records: ReadRecord[] = [];

  // Extract all timeline rows
  const timelineRows = $('.readingTimeline__row').toArray();

  interface TimelineEvent {
    type: 'started' | 'finished';
    date: string | null;
  }

  const events: TimelineEvent[] = [];

  for (const row of timelineRows) {
    const text = $(row).find('.readingTimeline__text').text().trim();

    // Check for "Started Reading" or "Finished Reading"
    if (text.includes('Started Reading')) {
      // Extract date if present
      const dateMatch = text.match(/([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/);
      events.push({
        type: 'started',
        date: dateMatch ? parseGoodreadsDate(dateMatch[1]) : null
      });
    } else if (text.includes('Finished Reading')) {
      // Check if there's a date or "Add a date" link
      const hasAddDateLink = $(row).find('.add_date_link').length > 0;
      const dateMatch = text.match(/([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/);

      events.push({
        type: 'finished',
        date: hasAddDateLink || !dateMatch ? null : parseGoodreadsDate(dateMatch[1])
      });
    }
  }

  // Process events to create read records
  // Strategy: pair "started" events with subsequent "finished" events
  // A standalone "finished" without a matching "started" = read with null dates

  let currentStarted: string | null = null;

  for (const event of events) {
    if (event.type === 'started') {
      currentStarted = event.date;
    } else if (event.type === 'finished') {
      records.push(new ReadRecord({
        dateStarted: currentStarted,
        dateFinished: event.date
      }));
      currentStarted = null; // Reset after pairing
    }
  }

  return records;
}

export interface ScraperOptions {
  rateLimitDelay?: number; // ms between requests (default 1000)
  maxRetries?: number; // max retry attempts (default 3)
  timeout?: number; // request timeout in ms (default 30000)
  limit?: number; // max books to scrape per shelf (default null = all)
  shelfFilter?: string; // scrape only a specific exclusive shelf (e.g., read, to-read)
  titleFilter?: string; // filter books by title (case-insensitive substring match)
  sort?: string | null; // sort order (default null)
  outputDir?: string; // output directory for individual books
  resume?: boolean; // skip books that already have output files (default false)
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
      shelfFilter: options.shelfFilter ?? '',
      titleFilter: options.titleFilter ?? '',
      sort: options.sort ?? null,
      outputDir: options.outputDir ?? './output',
      resume: options.resume ?? false,
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

    // Always use the review list page as the primary page for parsing
    // This page has the proper shelf structure with horizontal divider
    const reviewListUrl = `https://www.goodreads.com/review/list/${userId}`;

    logger.info('Starting library scrape', {
      userId,
      profileUrl: normalizedUrl,
      reviewListUrl,
      shelfFilter: this.options.shelfFilter || 'all exclusive shelves',
      titleFilter: this.options.titleFilter || 'none'
    });

    // Fetch the review list page (My Books page) for parsing
    const reviewListHtml = await this.fetchWithRetry(reviewListUrl);
    const isPrivate = this.isPrivateProfile(reviewListHtml);

    if (isPrivate) {
      throw new PrivateProfileError();
    }

    const libraryResult = LibraryParser.parseLibraryPage(reviewListHtml, reviewListUrl);

    // Prefer username from URL, then from HTML parsing, then fallback to user-{userId}
    const username = validation.username || libraryResult.username || `user-${userId}`;

    logger.info('Profile validated', { userId, username });

    // Extract exclusive reading status shelves from sidebar
    const exclusiveShelves = LibraryParser.parseReadingStatusShelves(reviewListHtml);

    // Debug: Save HTML to file for inspection
    if (process.env.DEBUG_HTML) {
      const debugPath = '/tmp/goodreads-library-page.html';
      fs.writeFileSync(debugPath, reviewListHtml, 'utf-8');
      logger.debug(`Saved library page HTML to ${debugPath} for debugging`);
    }

    logger.info('Found exclusive shelves', {
      count: exclusiveShelves.length,
      shelves: exclusiveShelves.map(s => `${s.slug} (${s.count})`)
    });

    // Apply shelf filter if specified
    let shelvesToScrape = exclusiveShelves;
    if (this.options.shelfFilter && this.options.shelfFilter.trim() !== '') {
      const filterLower = this.options.shelfFilter.toLowerCase().trim();
      shelvesToScrape = exclusiveShelves.filter(s => s.slug.toLowerCase() === filterLower);

      if (shelvesToScrape.length === 0) {
        const availableShelves = exclusiveShelves.map(s => s.slug).join(', ');
        throw new ScrapingError(
          `Specified shelf "${this.options.shelfFilter}" not found in exclusive shelves. ` +
          `Available exclusive shelves: ${availableShelves}`
        );
      }

      logger.info(`Filtering to shelf: ${shelvesToScrape[0].slug} (${shelvesToScrape[0].count} books)`);
    }

    // Scrape the selected exclusive reading status shelf(s)
    const userBooks: UserBookRelation[] = [];

    for (const { slug, count } of shelvesToScrape) {
      const status = this.mapShelfSlugToReadingStatus(slug);

      const booksForStatus = await this.scrapeBooksForShelf(
        normalizedUrl,
        userId,
        status,
        username,
        slug
      );
      userBooks.push(...booksForStatus);
    }

    const finalUserBooks = userBooks;

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
   * Map shelf slug to ReadingStatus enum
   */
  private mapShelfSlugToReadingStatus(slug: string): ReadingStatus {
    // Normalize common variations
    const normalized = slug.toLowerCase().replace(/_/g, '-');

    switch (normalized) {
      case 'read':
        return ReadingStatus.READ;
      case 'currently-reading':
      case 'currentlyreading':
        return ReadingStatus.CURRENTLY_READING;
      case 'to-read':
      case 'toread':
        return ReadingStatus.TO_READ;
      default:
        // For any other exclusive shelf, default to READ
        // (user might have custom exclusive shelves)
        return ReadingStatus.READ;
    }
  }

  /**
   * Scrape books for a specific shelf/status
   */
  private async scrapeBooksForShelf(
    profileUrl: string,
    userId: string,
    status: ReadingStatus,
    username: string,
    shelfSlug?: string
  ): Promise<UserBookRelation[]> {
    const userBooks: UserBookRelation[] = [];
    let page = 1;
    let hasNextPage = true;
    let totalProcessed = 0; // Track total books processed (scraped + skipped)

    const effectiveShelf = shelfSlug || status;
    logger.info(`Scraping shelf: ${effectiveShelf}`);

    while (hasNextPage) {
      const shelfUrl = PaginationHelper.buildLibraryUrl(
        profileUrl,
        page,
        effectiveShelf,
        this.options.sort
      );

      logger.debug(`Fetching page ${page}`, { shelfUrl });

      const html = await this.fetchWithRetry(shelfUrl);
      const $ = cheerio.load(html);

      // Parse books from table
      const result = await this.extractBooksFromPage($, status, userId, username, effectiveShelf);

      // Track total processed (includes both scraped and skipped books)
      totalProcessed += result.totalRows;

      // Add scraped books
      userBooks.push(...result.books);

      // Apply limit based on total books processed (not just scraped)
      // This ensures --limit 10 processes 10 books total, regardless of resume skips
      if (this.options.limit && totalProcessed >= this.options.limit) {
        hasNextPage = false;
      }

      // In resume mode: stop if entire page was skipped (all books already exist)
      // This prevents unnecessary pagination through already-scraped content
      if (this.options.resume && result.totalRows > 0 && result.books.length === 0) {
        logger.info('Stopping pagination: entire page already scraped', {
          page,
          rowsOnPage: result.totalRows,
          shelf: effectiveShelf
        });
        hasNextPage = false;
      }

      this.options.progressCallback(userBooks.length, totalProcessed);

      // Check for next page
      if (hasNextPage) {
        hasNextPage = PaginationHelper.detectPagination(html);
      }

      page++;
      await this.sleep(this.options.rateLimitDelay);
    }

    logger.info(`Shelf scrape complete: ${effectiveShelf}`, {
      scraped: userBooks.length,
      totalProcessed,
      skipped: totalProcessed - userBooks.length
    });

    return userBooks;
  }

  /**
   * Extract books from a library page
   * Returns object with books array and totalRows count (for resume tracking)
   */
  private async extractBooksFromPage(
    $: cheerio.CheerioAPI,
    status: ReadingStatus,
    userId: string,
    username: string,
    shelfSlug: string
  ): Promise<{ books: UserBookRelation[]; totalRows: number }> {
    const userBooks: UserBookRelation[] = [];

    // Find all book rows in the table
    const bookRows = $('#booksBody tr, table#books tr').toArray();

    for (const row of bookRows) {
      try {
        const userBook = await this.parseBookRow($, $(row), status, userId, username, shelfSlug);
        if (userBook) {
          userBooks.push(userBook);
        }
      } catch (error) {
        logger.error('Failed to parse book row', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { books: userBooks, totalRows: bookRows.length };
  }

  /**
   * Parse a single book row from the library table
   */
  private async parseBookRow(
    $: cheerio.CheerioAPI,
    $row: cheerio.Cheerio<any>,
    status: ReadingStatus,
    userId: string,
    username: string,
    shelfSlug: string
  ): Promise<UserBookRelation | null> {
    // Extract basic info from table row
    const titleElement = $row.find('.title a, .field.title a').first();
    const title = cleanScrapedText(titleElement.text());
    const bookUrl = titleElement.attr('href');

    if (!title || !bookUrl) {
      return null;
    }

    // Extract review URL from "view" link or actions column
    let goodreadsViewUrl: string | null = null;
    const viewLink = $row.find('a[href*="/review/show/"]').first();
    if (viewLink.length) {
      const reviewHref = viewLink.attr('href');
      if (reviewHref) {
        goodreadsViewUrl = reviewHref.startsWith('http')
          ? reviewHref
          : `https://www.goodreads.com${reviewHref}`;
      }
    }

    // Apply title filter if specified
    if (this.options.titleFilter && this.options.titleFilter.trim() !== '') {
      const titleLower = title.toLowerCase();
      const filterLower = this.options.titleFilter.toLowerCase();
      if (!titleLower.includes(filterLower)) {
        logger.debug(`Skipping book (title filter): ${title}`);
        return null;
      }
      logger.debug(`Matched title filter: ${title}`);
    }

    const fullBookUrl = bookUrl.startsWith('http')
      ? bookUrl
      : `https://www.goodreads.com${bookUrl}`;

    // Check if file already exists (resume functionality)
    if (this.options.resume) {
      const goodreadsId = fullBookUrl.match(/\/book\/show\/([^/?]+)/)?.[1];
      if (goodreadsId) {
        const outputDir = path.join(this.options.outputDir, `${userId}-${username}`);
        const filepath = path.join(outputDir, `${goodreadsId}.json`);

        if (fs.existsSync(filepath)) {
          logger.info(`✓ Skipping (exists): ${goodreadsId}.json`);
          return null;
        } else {
          logger.info(`→ Will scrape: ${goodreadsId}.json (not found at: ${filepath})`);
        }
      }
    }

    // Extract author
    const author = cleanScrapedText($row.find('.author a, .field.author a').first().text()) || '';

    // Extract rating
    const ratingText = $row.find('.rating .staticStars, .field.rating .staticStars').first().attr('title');
    const ratingMatch = ratingText?.match(/(\d+) of 5 stars/);
    const userRating = ratingMatch ? parseInt(ratingMatch[1], 10) : null;

    // Extract shelves from table row (fallback)
    const shelfElements = $row.find('.shelf a, .field.shelf a');
    const tableRowShelves: Shelf[] = [];
    shelfElements.each((_, el) => {
      const shelfName = cleanScrapedText($(el).text());
      if (shelfName) {
        tableRowShelves.push(
          new Shelf({
            name: shelfName,
            isBuiltin: ['read', 'currently-reading', 'to-read'].includes(shelfName.toLowerCase()),
            bookCount: null,
          })
        );
      }
    });

    // Extract date added
    const dateAddedRaw = $row.find('.date_added, .field.date_added').first().text();
    const dateAddedCleaned = cleanDateText(dateAddedRaw, 'date added');
    const dateAdded = parseGoodreadsDate(dateAddedCleaned);

    // Extract review (if any)
    let review: Review | null = null;
    const reviewRaw = $row.find('.review_text, .field.review').first().text();
    const reviewText = cleanDateText(reviewRaw, 'review');  // Remove "review" prefix

    if (reviewText) {
      review = new Review({
        reviewText,
        reviewDate: null,
        likesCount: null,
      });
    }

    // Fetch book page to get complete metadata
    logger.debug('Fetching book page', { bookUrl: fullBookUrl });
    const bookHtml = await this.fetchWithRetry(fullBookUrl);
    const bookData = BookParser.parseBookPage(bookHtml, fullBookUrl);

    // Extract read dates and shelves - fetch review page if available
    let readRecords: ReadRecord[] = [];
    let reviewPageShelves: Shelf[] = [];

    if (goodreadsViewUrl) {
      // Fetch review page to parse reading timeline and shelves
      logger.debug('Fetching review page for timeline and shelves', { reviewUrl: goodreadsViewUrl });
      try {
        const reviewHtml = await this.fetchWithRetry(goodreadsViewUrl);
        readRecords = parseReadingTimeline(reviewHtml);
        reviewPageShelves = LibraryParser.parseReviewPageShelves(reviewHtml);
      } catch (error) {
        logger.warn('Failed to fetch review page, falling back to table data', {
          reviewUrl: goodreadsViewUrl,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Fallback: if no review URL or timeline parsing failed, use table row data
    if (readRecords.length === 0) {
      const dateReadRaw = $row.find('.date_read, .field.date_read').first().text();
      const dateReadCleaned = cleanDateText(dateReadRaw, 'date read');
      const dateReadText = parseGoodreadsDate(dateReadCleaned);

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
    }

    // Determine final shelves list:
    // - Use review page shelves if available (more complete)
    // - Otherwise use table row shelves (fallback)
    // - Filter out the exclusive shelf (which is the reading_status)
    // - Convert to array of shelf names (strings)
    let finalShelves: string[];
    if (reviewPageShelves.length > 0) {
      // Use review page shelves and filter out the exclusive shelf
      finalShelves = reviewPageShelves
        .filter(shelf => shelf.name.toLowerCase() !== shelfSlug.toLowerCase())
        .map(shelf => shelf.name);
    } else {
      // Fallback to table row shelves
      finalShelves = tableRowShelves
        .filter(shelf => shelf.name.toLowerCase() !== shelfSlug.toLowerCase())
        .map(shelf => shelf.name);
    }

    // Create complete book object with all metadata
    const book = new Book({
      goodreadsId: bookData.goodreadsId || fullBookUrl.match(/\/book\/show\/([^/?]+)/)?.[1] || '',
      title: bookData.title || title,
      author: bookData.author || author,
      additionalAuthors: bookData.additionalAuthors,
      isbn: bookData.isbn,
      isbn13: bookData.isbn13,
      publicationDate: bookData.publicationDate,
      publisher: bookData.publisher,
      pageCount: bookData.pageCount,
      language: bookData.language,
      setting: bookData.setting,
      literaryAwards: bookData.literaryAwards,
      genres: bookData.genres,
      averageRating: bookData.averageRating,
      ratingsCount: bookData.ratingsCount,
      coverImageUrl: bookData.coverImageUrl,
      goodreadsUrl: fullBookUrl,
    });

    // Rate limit between book page requests
    await this.sleep(this.options.rateLimitDelay);

    // Save individual book file
    await this.saveIndividualBook(book, {
      userRating,
      readingStatus: shelfSlug,
      shelves: finalShelves,
      review,
      dateAdded,
      readRecords,
      goodreadsViewUrl,
    }, userId, username);

    // Create user-book relation
    const userBook = new UserBookRelation({
      book,
      userRating,
      readingStatus: shelfSlug,
      shelves: finalShelves,
      review,
      dateAdded,
      readRecords,
      goodreadsViewUrl,
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
      readingStatus: string;
      shelves: string[];
      review: Review | null;
      dateAdded: string | null;
      readRecords: ReadRecord[];
      goodreadsViewUrl: string | null;
    },
    userId: string,
    username: string
  ): Promise<void> {
    const outputDir = path.join(this.options.outputDir, `${userId}-${username}`);

    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate filename using goodreads ID
    const filename = `${book.goodreadsId}.json`;
    const filepath = path.join(outputDir, filename);

    // Format data to match Python parser output (snake_case)
    const data = {
      book: {
        goodreads_id: book.goodreadsId,
        title: book.title,
        author: book.author,
        additional_authors: book.additionalAuthors || [],
        isbn: book.isbn,
        isbn13: book.isbn13,
        publication_date: book.publicationDate,
        publisher: book.publisher,
        page_count: book.pageCount,
        language: book.language,
        setting: book.setting,
        literary_awards: book.literaryAwards || [],
        genres: book.genres || [],
        average_rating: book.averageRating,
        ratings_count: book.ratingsCount,
        cover_image_url: book.coverImageUrl,
        goodreads_url: book.goodreadsUrl,
        goodreads_view_url: userData.goodreadsViewUrl,
      },
      user_rating: userData.userRating,
      reading_status: userData.readingStatus,
      shelves: userData.shelves,
      date_added: userData.dateAdded,
      read_records: userData.readRecords.map(rr => ({
        date_started: rr.dateStarted,
        date_finished: rr.dateFinished,
      })),
      scraped_at: new Date().toISOString(),
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
