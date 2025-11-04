import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UploadStatsDto {
  @ApiProperty({ description: 'Number of files processed', example: 350 })
  filesProcessed: number;

  @ApiProperty({ description: 'Number of files skipped', example: 3 })
  filesSkipped: number;

  @ApiProperty({ description: 'Number of books imported', example: 347 })
  booksImported: number;

  @ApiProperty({ description: 'Number of books skipped', example: 0 })
  booksSkipped: number;

  @ApiProperty({
    description: 'Upload duration in milliseconds',
    example: 2340,
  })
  durationMs: number;
}

class UploadErrorDto {
  @ApiProperty({ description: 'File name that caused error', example: 'book_123.json' })
  file: string;

  @ApiProperty({ description: 'Error message', example: 'Invalid JSON format' })
  error: string;
}

export class UploadResponseDto {
  @ApiProperty({ description: 'Upload success status', example: true })
  success: boolean;

  @ApiProperty({
    description: 'Upload result message',
    example: 'Successfully imported 347 books from 350 files',
  })
  message: string;

  @ApiProperty({ description: 'Upload statistics', type: UploadStatsDto })
  stats: UploadStatsDto;

  @ApiPropertyOptional({
    description: 'List of errors encountered',
    type: [UploadErrorDto],
  })
  errors?: UploadErrorDto[];

  @ApiProperty({
    description: 'UUID of created/updated library',
    example: 'a7f3e8c2-9d4a-4b1e-8f6d-2c9e5a7b1c3d',
  })
  libraryId: string;
}
