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
import { LibraryImportService } from '../services/library-import.service';
import { UploadResponseDto } from '../dto/upload.dto';

@ApiTags('library')
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryImportService: LibraryImportService) {}

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
    // Validate request
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    if (files.length > 2000) {
      throw new BadRequestException('Maximum 2000 files allowed per upload');
    }

    // Use shared import service
    const result = await this.libraryImportService.importLibrary(
      files,
      session.id,
    );

    return {
      success: result.success,
      message: `Successfully imported ${result.stats.booksImported} books from ${result.stats.filesProcessed} files`,
      stats: result.stats,
      errors: result.errors.length > 0 ? result.errors : undefined,
      libraryId: result.libraryId,
    };
  }
}
