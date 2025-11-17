import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsDateString,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookDto {
  // Required fields
  @ApiProperty({ description: 'Book title', example: 'The Great Gatsby' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Book author', example: 'F. Scott Fitzgerald' })
  @IsString()
  @IsNotEmpty()
  author: string;

  @ApiProperty({
    description: 'Reading status',
    enum: ['read', 'currently-reading', 'to-read'],
    example: 'read',
  })
  @IsIn(['read', 'currently-reading', 'to-read'])
  status: 'read' | 'currently-reading' | 'to-read';

  // Optional core metadata
  @ApiPropertyOptional({
    description: 'Book rating (1-5 stars)',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;

  @ApiPropertyOptional({ description: 'ISBN', example: '978-0-7432-7356-5' })
  @IsOptional()
  @IsString()
  isbn?: string | null;

  @ApiPropertyOptional({
    description: 'Publication year',
    minimum: 1000,
    maximum: 9999,
    example: 1925,
  })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(9999)
  publicationYear?: number | null;

  @ApiPropertyOptional({
    description: 'Number of pages',
    minimum: 1,
    example: 218,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  pages?: number | null;

  @ApiPropertyOptional({
    description: 'Publisher',
    example: 'Penguin Books',
  })
  @IsOptional()
  @IsString()
  publisher?: string | null;

  @ApiPropertyOptional({
    description: 'Publication date (full date from Goodreads)',
    example: 'January 1, 1930',
  })
  @IsOptional()
  @IsString()
  publicationDate?: string | null;

  @ApiPropertyOptional({
    description: 'Book setting/locations (multiple locations possible)',
    type: [String],
    example: ['England', 'London, England', 'Oxford, Oxfordshire, England'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  setting?: string[];

  @ApiPropertyOptional({
    description: 'Literary awards',
    type: [String],
    example: ['Hugo Award (1963)', 'Nebula Award (1965)'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  literaryAwards?: string[];

  @ApiPropertyOptional({
    description: 'Cover image URL',
    example: 'https://images.gr-assets.com/books/1234567890/12345.jpg',
  })
  @IsOptional()
  @IsString()
  coverImageUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Goodreads URL',
    example: 'https://www.goodreads.com/book/show/12345',
  })
  @IsOptional()
  @IsString()
  goodreadsUrl?: string | null;

  // Categories
  @ApiPropertyOptional({
    description: 'Book genres',
    type: [String],
    example: ['Fiction', 'Classics'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genres?: string[];

  @ApiPropertyOptional({
    description: 'Goodreads shelves',
    type: [String],
    example: ['favorites', 'classics'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  shelves?: string[];

  // Dates
  @ApiPropertyOptional({
    description: 'Date added to library',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDateString()
  dateAdded?: string | null;

  @ApiPropertyOptional({
    description: 'Array of read records (multiple readings of the same book)',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        dateStarted: { type: 'string', format: 'date', nullable: true },
        dateFinished: { type: 'string', format: 'date', nullable: true },
      },
    },
    example: [
      { dateStarted: '2024-01-01', dateFinished: '2024-01-15' },
      { dateStarted: '2024-06-01', dateFinished: null },
    ],
  })
  @IsOptional()
  @IsArray()
  readRecords?: Array<{ dateStarted: string | null; dateFinished: string | null }>;

  // User content
  @ApiPropertyOptional({
    description: 'User review text',
    example: 'A masterpiece of American literature.',
  })
  @IsOptional()
  @IsString()
  review?: string | null;

  @ApiPropertyOptional({
    description: 'Date review was written',
    example: '2024-02-16',
  })
  @IsOptional()
  @IsDateString()
  reviewDate?: string | null;

  // Source tracking
  @ApiPropertyOptional({
    description: 'Original source file name',
    example: 'book_001.json',
  })
  @IsOptional()
  @IsString()
  sourceFile?: string | null;

  @ApiPropertyOptional({
    description: 'Original JSON from source file (for auditing and re-processing)',
    example: { book: { title: 'Example', author: 'Author' } },
  })
  @IsOptional()
  originalJson?: any | null;
}
