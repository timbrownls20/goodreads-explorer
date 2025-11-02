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

      // Transform to DTO instance
      const bookDto = plainToInstance(CreateBookDto, rawData);

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
