import { Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateBookDto } from '../dto/book.dto';
import { logger } from '../utils/logger';

export interface ParseResult {
  success: boolean;
  book?: CreateBookDto;
  originalJson?: any; // Raw JSON from source file
  errors?: string[];
}

@Injectable()
export class FileParserService {
  /**
   * Parse and validate a single JSON file containing book data
   * @param fileBuffer - Raw file buffer
   * @param filename - Original filename for error reporting
   * @returns ParseResult with validated book DTO or errors
   */
  async parseBookFile(
    fileBuffer: Buffer,
    filename: string,
  ): Promise<ParseResult> {
    try {
      // Parse JSON
      const rawData = JSON.parse(fileBuffer.toString('utf-8'));

      // Transform scraper format to backend DTO format
      const transformedData = this.transformScraperFormat(rawData);

      if (!transformedData) {
        logger.warn('Unable to extract book data from file', { filename });
        return {
          success: false,
          errors: ['Invalid file format: no book data found'],
          originalJson: rawData, // Store even on failure for debugging
        };
      }

      // Transform to DTO instance
      const bookDto = plainToInstance(CreateBookDto, transformedData);

      // Validate DTO
      const validationErrors = await validate(bookDto);

      if (validationErrors.length > 0) {
        const errorMessages = validationErrors.map((err) => {
          return Object.values(err.constraints || {}).join(', ');
        });

        logger.warn('Validation failed for file', {
          filename,
          errors: errorMessages,
        });

        return {
          success: false,
          errors: errorMessages,
          originalJson: rawData, // Store even on failure for debugging
        };
      }

      // Add source file tracking
      bookDto.sourceFile = filename;

      return {
        success: true,
        book: bookDto,
        originalJson: rawData, // Store original JSON for auditing and re-processing
      };
    } catch (error) {
      // JSON parse error or other unexpected errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error('Failed to parse book file', {
        filename,
        error: errorMessage,
      });

      return {
        success: false,
        errors: [`Invalid JSON format: ${errorMessage}`],
        // Cannot store originalJson here since JSON parsing failed
      };
    }
  }

  /**
   * Transform scraper JSON format to backend DTO format
   * Handles both individual book files and user_books array format
   */
  private transformScraperFormat(rawData: any): any | null {
    // Check if this is a user_books format from scraper
    if (rawData.user_books && Array.isArray(rawData.user_books) && rawData.user_books.length > 0) {
      // Take the first book from the user_books array
      const userBook = rawData.user_books[0];
      return this.mapUserBookToDto(userBook);
    }

    // Check if this is a single user_book object
    if (rawData.book && rawData.reading_status) {
      return this.mapUserBookToDto(rawData);
    }

    // Check if this is already in the correct format
    if (rawData.title && rawData.author) {
      return rawData;
    }

    return null;
  }

  /**
   * Map scraper's user_book format to backend DTO format
   */
  private mapUserBookToDto(userBook: any): any {
    const book = userBook.book || {};

    // Extract shelf names from shelves array
    const shelfNames = (userBook.shelves || [])
      .map((shelf: any) => shelf.name)
      .filter((name: string) => name && typeof name === 'string');

    // Parse publication year from publication_date
    let publicationYear: number | null = null;
    let publicationDate: string | null = null;
    if (book.publication_date) {
      publicationDate = book.publication_date;
      const yearMatch = book.publication_date.match(/\d{4}/);
      if (yearMatch) {
        publicationYear = parseInt(yearMatch[0], 10);
      }
    }

    // Extract and format literary awards
    const literaryAwards: string[] = [];
    if (book.literary_awards && Array.isArray(book.literary_awards)) {
      book.literary_awards.forEach((award: any) => {
        if (award.name) {
          // Format as "Award Name (Year)" or just "Award Name" if no year
          const awardStr = award.year ? `${award.name} (${award.year})` : award.name;
          literaryAwards.push(awardStr);
        }
      });
    }

    // Extract date_started and date_finished from read_records
    // Take the most recent record (last in array) if multiple exist
    let dateStarted: string | null = null;
    let dateFinished: string | null = null;

    if (userBook.read_records && Array.isArray(userBook.read_records) && userBook.read_records.length > 0) {
      const mostRecentRecord = userBook.read_records[userBook.read_records.length - 1];
      dateStarted = mostRecentRecord.date_started || null;
      dateFinished = mostRecentRecord.date_finished || null;
    }

    // Normalize reading_status to match backend enum
    // Goodreads has many status values, map them to our three-status model
    let status = userBook.reading_status;

    // Map Goodreads statuses to our enum: 'read', 'currently-reading', 'to-read'
    const statusMap: Record<string, string> = {
      'read': 'read',
      'currently-reading': 'currently-reading',
      'to-read': 'to-read',
      'to-read-owned': 'to-read',
      'to-read-next': 'to-read',
      'did-not-finish': 'read', // Attempted reading, count as read
      'paused': 'currently-reading', // Paused mid-read
      'reference': 'to-read', // Reference books go to to-read
    };

    status = statusMap[status] || 'to-read'; // Default to 'to-read' if unknown

    return {
      title: book.title,
      author: book.author,
      status, // 'read', 'currently-reading', 'to-read'
      rating: userBook.user_rating,
      isbn: book.isbn || book.isbn13 || null,
      publicationYear,
      publicationDate,
      pages: book.page_count || null,
      publisher: book.publisher || null,
      setting: book.setting || null,
      literaryAwards,
      coverImageUrl: book.cover_image_url || null,
      goodreadsUrl: book.goodreads_url || null,
      genres: book.genres || [],
      shelves: shelfNames,
      dateAdded: userBook.date_added || null,
      dateStarted,
      dateFinished,
      review: userBook.review || null,
      reviewDate: userBook.review_date || null,
    };
  }

  /**
   * Parse multiple JSON files in batch
   * @param files - Array of uploaded files
   * @returns Array of parse results
   */
  async parseBookFiles(
    files: Express.Multer.File[],
  ): Promise<ParseResult[]> {
    logger.info('Starting batch file parsing', { fileCount: files.length });

    const results = await Promise.all(
      files.map((file) =>
        this.parseBookFile(file.buffer, file.originalname),
      ),
    );

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    logger.info('Batch file parsing complete', {
      total: files.length,
      successful: successCount,
      failed: failureCount,
    });

    return results;
  }

  /**
   * Extract unique genres from all successfully parsed books
   */
  extractUniqueGenres(parseResults: ParseResult[]): string[] {
    const genreSet = new Set<string>();

    parseResults.forEach((result) => {
      if (result.success && result.book?.genres) {
        result.book.genres.forEach((genre) => genreSet.add(genre));
      }
    });

    return Array.from(genreSet).sort();
  }

  /**
   * Extract unique shelves from all successfully parsed books
   */
  extractUniqueShelves(parseResults: ParseResult[]): string[] {
    const shelfSet = new Set<string>();

    parseResults.forEach((result) => {
      if (result.success && result.book?.shelves) {
        result.book.shelves.forEach((shelf) => shelfSet.add(shelf));
      }
    });

    return Array.from(shelfSet).sort();
  }
}
