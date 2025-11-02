import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  Session,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileParserService } from '../services/file-parser.service';
import { UploadResponseDto } from '../dto/upload.dto';
import { User } from '../entities/user.entity';
import { Library } from '../entities/library.entity';
import { Book } from '../entities/book.entity';
import { logger } from '../utils/logger';

@ApiTags('library')
@Controller('library')
export class LibraryController {
  constructor(
    private readonly fileParserService: FileParserService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Library)
    private libraryRepository: Repository<Library>,
    @InjectRepository(Book)
    private bookRepository: Repository<Book>,
  ) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Upload library data from multiple JSON files',
    description:
      'Upload book data exported from the scraper. Accepts multiple JSON files containing book metadata.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Library uploaded successfully',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request (no files, too many files, etc.)',
  })
  @UseInterceptors(FilesInterceptor('files', 2000)) // Max 2000 files
  async uploadLibrary(
    @UploadedFiles() files: Express.Multer.File[],
    @Session() session: Record<string, any>,
  ): Promise<UploadResponseDto> {
    const startTime = Date.now();

    // Validate request
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    if (files.length > 2000) {
      throw new BadRequestException('Maximum 2000 files allowed per upload');
    }

    logger.info('Library upload started', {
      fileCount: files.length,
      sessionId: session.id,
    });

    // Get or create user from session
    const user = await this.getOrCreateUser(session);

    // Get or create library for user
    const library = await this.getOrCreateLibrary(user);

    // Parse files
    const parseResults = await this.fileParserService.parseBookFiles(files);

    // Collect statistics
    const stats = {
      filesProcessed: files.length,
      filesSkipped: 0,
      booksImported: 0,
      booksSkipped: 0,
      durationMs: 0,
    };

    const errors: Array<{ file: string; error: string }> = [];

    // Import books to database
    for (const result of parseResults) {
      if (!result.success) {
        stats.filesSkipped++;
        errors.push({
          file: result.book?.sourceFile || 'unknown',
          error: result.errors?.join('; ') || 'Unknown error',
        });
        continue;
      }

      try {
        // Check for duplicate (same title + author in library)
        const existing = await this.bookRepository.findOne({
          where: {
            libraryId: library.id,
            title: result.book!.title,
            author: result.book!.author,
          },
        });

        if (existing) {
          logger.debug('Skipping duplicate book', {
            title: result.book!.title,
            author: result.book!.author,
          });
          stats.booksSkipped++;
          continue;
        }

        // Create book entity
        const book = this.bookRepository.create({
          ...result.book,
          libraryId: library.id,
        });

        await this.bookRepository.save(book);
        stats.booksImported++;
      } catch (error) {
        logger.error('Failed to save book to database', {
          book: result.book,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        stats.booksSkipped++;
        errors.push({
          file: result.book?.sourceFile || 'unknown',
          error: error instanceof Error ? error.message : 'Database save failed',
        });
      }
    }

    // Update library metadata
    library.lastUploadedAt = new Date();
    await this.libraryRepository.save(library);

    stats.durationMs = Date.now() - startTime;

    logger.info('Library upload complete', {
      libraryId: library.id,
      stats,
      errorCount: errors.length,
    });

    return {
      success: true,
      message: `Successfully imported ${stats.booksImported} books from ${stats.filesProcessed} files`,
      stats,
      errors: errors.length > 0 ? errors : undefined,
      libraryId: library.id,
    };
  }

  /**
   * Get or create user from session
   */
  private async getOrCreateUser(
    session: Record<string, any>,
  ): Promise<User> {
    const sessionId = session.id;

    let user = await this.userRepository.findOne({ where: { sessionId } });

    if (!user) {
      user = this.userRepository.create({ sessionId });
      await this.userRepository.save(user);
      logger.info('Created new user', { userId: user.id, sessionId });
    }

    return user;
  }

  /**
   * Get or create library for user
   */
  private async getOrCreateLibrary(user: User): Promise<Library> {
    let library = await this.libraryRepository.findOne({
      where: { userId: user.id, name: 'My Library' },
    });

    if (!library) {
      library = this.libraryRepository.create({
        userId: user.id,
        name: 'My Library',
      });
      await this.libraryRepository.save(library);
      logger.info('Created new library', { libraryId: library.id });
    }

    return library;
  }
}
