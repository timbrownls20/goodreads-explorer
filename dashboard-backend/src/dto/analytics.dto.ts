import {
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsArray,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FilterRequestDto {
  // Date range filter
  @ApiPropertyOptional({
    description: 'Filter start date (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  dateStart?: string;

  @ApiPropertyOptional({
    description: 'Filter end date (ISO 8601)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  dateEnd?: string;

  // Rating filter
  @ApiPropertyOptional({
    description: 'Minimum rating (1-5)',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  ratingMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum rating (1-5)',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  ratingMax?: number;

  // Status filter
  @ApiPropertyOptional({
    description: 'Reading status',
    enum: ['read', 'currently-reading', 'to-read'],
    example: 'read',
  })
  @IsOptional()
  @IsEnum(['read', 'currently-reading', 'to-read'])
  status?: string;

  // Shelf filter (array)
  @ApiPropertyOptional({
    description: 'Filter by shelves (multi-select)',
    type: [String],
    example: ['favorites', 'classics'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  shelves?: string[];

  // Genre filter (array)
  @ApiPropertyOptional({
    description: 'Filter by genres (multi-select)',
    type: [String],
    example: ['Fiction', 'Science Fiction'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  genres?: string[];
}

class DateRangeDto {
  @ApiPropertyOptional({
    description: 'Earliest date in library',
    example: '2020-01-15',
  })
  earliest: string | null;

  @ApiPropertyOptional({
    description: 'Latest date in library',
    example: '2024-11-02',
  })
  latest: string | null;
}

export class AnalyticsSummaryDto {
  @ApiProperty({ description: 'Total number of books', example: 347 })
  totalBooks: number;

  @ApiProperty({ description: 'Total books with status "read"', example: 298 })
  totalRead: number;

  @ApiProperty({
    description: 'Total books with status "currently-reading"',
    example: 3,
  })
  totalReading: number;

  @ApiProperty({ description: 'Total books with status "to-read"', example: 46 })
  totalToRead: number;

  @ApiProperty({ description: 'Total rated books', example: 285 })
  totalRated: number;

  @ApiProperty({ description: 'Average rating (0-5)', example: 4.2 })
  averageRating: number;

  @ApiProperty({
    description: 'Rating distribution (rating -> count)',
    example: { 1: 5, 2: 12, 3: 45, 4: 123, 5: 100 },
  })
  ratingDistribution: { [rating: number]: number };

  @ApiPropertyOptional({
    description: 'Most common rating',
    example: 5,
  })
  mostCommonRating: number | null;

  @ApiProperty({
    description: 'Average books read per month',
    example: 4.8,
  })
  averageBooksPerMonth: number;

  @ApiProperty({
    description: 'Reading streak in months (consecutive months with at least one book)',
    example: 18,
  })
  readingStreak: number;

  @ApiProperty({
    description: 'Books finished in current year',
    example: 52,
  })
  currentYearTotal: number;

  @ApiProperty({
    description: 'Books finished in previous year',
    example: 48,
  })
  previousYearTotal: number;

  @ApiProperty({
    description: 'Year-over-year change percentage',
    example: 8.33,
  })
  yearOverYearChange: number;

  @ApiProperty({ description: 'Date range of library', type: DateRangeDto })
  dateRange: DateRangeDto;

  @ApiProperty({
    description: 'Number of books after applying filters',
    example: 45,
  })
  filteredCount: number;

  @ApiProperty({
    description: 'Total number of books without filters',
    example: 347,
  })
  unfilteredCount: number;
}
