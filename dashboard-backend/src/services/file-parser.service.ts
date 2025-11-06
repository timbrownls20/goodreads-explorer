import { Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateBookDto } from '../dto/book.dto';
import { logger } from '../utils/logger';

export interface ParseResult {
  success: boolean;
  book?: CreateBookDto;
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
        };
      }

      // Add source file tracking
      bookDto.sourceFile = filename;

      return {
        success: true,
        book: bookDto,
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
    if (book.publication_date) {
      const yearMatch = book.publication_date.match(/\d{4}/);
      if (yearMatch) {
        publicationYear = parseInt(yearMatch[0], 10);
      }
    }

    return {
      title: book.title,
      author: book.author,
      status: userBook.reading_status, // 'read', 'currently-reading', 'to-read'
      rating: userBook.user_rating,
      isbn: book.isbn || book.isbn13 || null,
      publicationYear,
      pages: book.page_count || null,
      genres: book.genres || [],
      shelves: shelfNames,
      dateAdded: userBook.date_added || null,
      dateStarted: userBook.date_started || null,
      dateFinished: userBook.date_finished || null,
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
