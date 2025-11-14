import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString, Min, Max, validate } from 'class-validator';
import { Type } from 'class-transformer';
import { Book } from './book.model';
import { Shelf, ReadingStatus } from './shelf.model';

export class Review {
  @IsString()
  reviewText: string;

  @IsOptional()
  @IsDateString()
  reviewDate?: string | null;

  @IsOptional()
  @IsNumber()
  likesCount?: number | null;

  constructor(data: { reviewText: string; reviewDate?: string | null; likesCount?: number | null }) {
    this.reviewText = data.reviewText;
    this.reviewDate = data.reviewDate;
    this.likesCount = data.likesCount;
  }
}

export class ReadRecord {
  @IsOptional()
  @IsDateString()
  dateStarted?: string | null;

  @IsOptional()
  @IsDateString()
  dateFinished?: string | null;

  constructor(data: { dateStarted?: string | null; dateFinished?: string | null }) {
    this.dateStarted = data.dateStarted;
    this.dateFinished = data.dateFinished;

    // Validate date ordering
    if (this.dateStarted && this.dateFinished) {
      const start = new Date(this.dateStarted);
      const end = new Date(this.dateFinished);
      if (start > end) {
        throw new Error('dateStarted must be before or equal to dateFinished');
      }
    }
  }
}

export class UserBookRelation {
  @ValidateNested()
  @Type(() => Book)
  book: Book;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  userRating?: number | null;

  @IsString()
  readingStatus: ReadingStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Shelf)
  shelves: Shelf[];

  @IsOptional()
  @ValidateNested()
  @Type(() => Review)
  review?: Review | null;

  @IsOptional()
  @IsDateString()
  dateAdded?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReadRecord)
  readRecords: ReadRecord[];

  constructor(data: Partial<UserBookRelation>) {
    Object.assign(this, data);
  }
}
