import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FileParserService } from './file-parser.service';
import { Library } from '../models/library.model';
import { Book } from '../models/book.model';
import { Genre } from '../models/genre.model';
import { BookGenre } from '../models/book-genre.model';
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
    @InjectModel(Library)
    private libraryModel: typeof Library,
    @InjectModel(Book)
    private bookModel: typeof Book,
    @InjectModel(Genre)
    private genreModel: typeof Genre,
    @InjectModel(BookGenre)
    private bookGenreModel: typeof BookGenre,
  ) {}

  /**
   * Import library data from JSON files
   * Shared logic used by both UI upload and CLI reload
   */
  async importLibrary(
    files: Express.Multer.File[],
    libraryName: string,
    folderPath?: string,
  ): Promise<ImportResult> {
    const startTime = Date.now();

    logger.info('Library import started', {
      fileCount: files.length,
      libraryName,
    });

    // Get or create library by name
    const library = await this.getOrCreateLibrary(libraryName, folderPath);

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
        // Step 1: Extract and create genres
        const genreMap = await this.createGenresFromBooks(validBooks);

        // Step 2: Remove genres from book data before saving
        // (genres are now handled via many-to-many relationship)
        const booksWithoutGenres = validBooks.map(({ genres, ...book }) => book);

        // Step 3: Save books (upsert based on libraryId + sourceFile)
        const result = await this.bookModel.bulkCreate(booksWithoutGenres, {
          updateOnDuplicate: [
            'title',
            'author',
            'status',
            'rating',
            'isbn',
            'publicationYear',
            'publicationDate',
            'pages',
            'publisher',
            'setting',
            'literaryAwards',
            'coverImageUrl',
            'goodreadsUrl',
            'shelves',
            'dateAdded',
            'dateStarted',
            'dateFinished',
            'review',
            'reviewDate',
            'sourceFile',
          ],
          conflictAttributes: ['libraryId', 'sourceFile'], // Use compound unique key for conflict detection
        });

        // Step 4: Create book-genre relationships
        await this.linkBooksToGenres(validBooks, result, genreMap);

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
   * Get or create library by name
   * If library with this name exists, it's an update; otherwise create new
   */
  private async getOrCreateLibrary(
    name: string,
    folderPath?: string,
  ): Promise<Library> {
    let library = await this.libraryModel.findOne({
      where: { name },
    });

    if (!library) {
      library = await this.libraryModel.create({
        name,
        folderPath,
      });
      logger.info('Created new library', { libraryId: library.id, name });
    } else {
      logger.info('Using existing library', { libraryId: library.id, name });
    }

    return library;
  }

  /**
   * Extract unique genres from books and create Genre records
   * Returns a map of genre name (original case) to genre ID
   */
  private async createGenresFromBooks(
    books: any[],
  ): Promise<Map<string, string>> {
    // Extract all unique genre names
    const uniqueGenreNames = new Set<string>();
    books.forEach((book) => {
      if (book.genres && Array.isArray(book.genres)) {
        book.genres.forEach((genre: string) => {
          if (genre && typeof genre === 'string') {
            uniqueGenreNames.add(genre);
          }
        });
      }
    });

    const genreMap = new Map<string, string>();

    if (uniqueGenreNames.size === 0) {
      return genreMap;
    }

    // Create genre records (or find existing)
    for (const genreName of uniqueGenreNames) {
      const slug = this.createSlug(genreName);

      // Try to find existing genre by slug
      let genre = await this.genreModel.findOne({ where: { slug } });

      if (!genre) {
        // Create new genre
        genre = await this.genreModel.create({
          name: genreName,
          slug,
        });
        logger.debug('Created new genre', { name: genreName, slug });
      }

      genreMap.set(genreName, genre.id);
    }

    logger.info('Genres processed', { count: genreMap.size });

    return genreMap;
  }

  /**
   * Create BookGenre junction records to link books to their genres
   */
  private async linkBooksToGenres(
    originalBooks: any[],
    savedBooks: Book[],
    genreMap: Map<string, string>,
  ): Promise<void> {
    const bookGenreRecords: Array<{ bookId: string; genreId: string }> = [];

    // Create junction records
    savedBooks.forEach((savedBook, index) => {
      const originalBook = originalBooks[index];
      if (originalBook.genres && Array.isArray(originalBook.genres)) {
        originalBook.genres.forEach((genreName: string) => {
          const genreId = genreMap.get(genreName);
          if (genreId) {
            bookGenreRecords.push({
              bookId: savedBook.id,
              genreId,
            });
          }
        });
      }
    });

    if (bookGenreRecords.length > 0) {
      // Delete existing relationships for these books (in case of updates)
      const bookIds = savedBooks.map((book) => book.id);
      await this.bookGenreModel.destroy({
        where: { bookId: bookIds },
      });

      // Create new relationships
      await this.bookGenreModel.bulkCreate(bookGenreRecords);

      logger.info('Book-genre relationships created', {
        count: bookGenreRecords.length,
      });
    }
  }

  /**
   * Create a normalized slug from a genre name
   */
  private createSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
  }
}
