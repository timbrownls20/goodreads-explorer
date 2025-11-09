import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FileParserService } from './file-parser.service';
import { User } from '../models/user.model';
import { Library } from '../models/library.model';
import { Book } from '../models/book.model';
import { logger } from '../utils/logger';

export interface ImportResult {
  success: boolean;
  stats: {
    filesProcessed: number;
    filesSkipped: number;
    booksImported: number;
    booksUpdated: number;
    booksSkipped: number;
    durationMs: number;
  };
  errors: Array<{ file: string; error: string }>;
  libraryId: string;
}

@Injectable()
export class LibraryImportService {
  constructor(
    private readonly fileParserService: FileParserService,
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(Library)
    private libraryModel: typeof Library,
    @InjectModel(Book)
    private bookModel: typeof Book,
  ) {}

  /**
   * Import library data from JSON files
   * Shared logic used by both UI upload and CLI reload
   */
  async importLibrary(
    files: Express.Multer.File[],
    sessionId: string,
    folderPath?: string,
  ): Promise<ImportResult> {
    const startTime = Date.now();

    logger.info('Library import started', {
      fileCount: files.length,
      sessionId,
    });

    // Get or create user
    const user = await this.getOrCreateUser(sessionId);

    // Get or create library
    const library = await this.getOrCreateLibrary(user, folderPath);

    // Parse files
    const parseResults = await this.fileParserService.parseBookFiles(files);

    // Initialize statistics
    const stats = {
      filesProcessed: files.length,
      filesSkipped: 0,
      booksImported: 0,
      booksUpdated: 0,
      booksSkipped: 0,
      durationMs: 0,
    };

    const errors: Array<{ file: string; error: string }> = [];

    // Process successful parses
    const validBooks = parseResults
      .filter((r) => r.success && r.book)
      .map((r) => ({
        ...r.book!,
        libraryId: library.id,
      }));

    // Track parse failures
    parseResults
      .filter((r) => !r.success)
      .forEach((result, index) => {
        stats.filesSkipped++;
        errors.push({
          file: files[index]?.originalname || 'unknown',
          error: result.errors?.join('; ') || 'Unknown parse error',
        });
      });

    if (validBooks.length > 0) {
      try {
        // Use bulkCreate with updateOnDuplicate for efficient upserts
        // This handles both inserts and updates in a single operation
        const result = await this.bookModel.bulkCreate(validBooks, {
          updateOnDuplicate: [
            'title',
            'author',
            'status',
            'rating',
            'isbn',
            'publicationYear',
            'pages',
            'genres',
            'shelves',
            'dateAdded',
            'dateStarted',
            'dateFinished',
            'review',
            'reviewDate',
            'sourceFile',
          ],
          // Sequelize doesn't return which records were inserted vs updated
          // So we'll count all as imported for simplicity
        });

        stats.booksImported = result.length;

        logger.info('Books imported to database', {
          libraryId: library.id,
          count: result.length,
        });
      } catch (error) {
        logger.error('Bulk import failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        errors.push({
          file: 'bulk_import',
          error: error instanceof Error ? error.message : 'Database save failed',
        });
        stats.booksSkipped = validBooks.length;
      }
    }

    // Update library metadata
    library.lastUploadedAt = new Date();
    if (folderPath) {
      library.folderPath = folderPath;
    }
    await library.save();

    stats.durationMs = Date.now() - startTime;

    logger.info('Library import complete', {
      libraryId: library.id,
      stats,
      errorCount: errors.length,
    });

    return {
      success: true,
      stats,
      errors,
      libraryId: library.id,
    };
  }

  /**
   * Get or create user from session ID
   */
  private async getOrCreateUser(sessionId: string): Promise<User> {
    let user = await this.userModel.findOne({ where: { sessionId } });

    if (!user) {
      user = await this.userModel.create({
        sessionId,
        username: `User ${sessionId.substring(0, 8)}`,
      });
      logger.info('Created new user', { userId: user.id, sessionId });
    }

    return user;
  }

  /**
   * Get or create library for user
   */
  private async getOrCreateLibrary(
    user: User,
    folderPath?: string,
  ): Promise<Library> {
    let library = await this.libraryModel.findOne({
      where: { userId: user.id },
    });

    if (!library) {
      library = await this.libraryModel.create({
        userId: user.id,
        name: 'My Library',
        folderPath,
      });
      logger.info('Created new library', { libraryId: library.id });
    }

    return library;
  }
}
