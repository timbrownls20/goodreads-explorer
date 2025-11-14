import { IsString, IsArray, ValidateNested, IsUrl, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { UserBookRelation } from './user-book.model';
import { ReadingStatus } from './shelf.model';

export class Library {
  @IsString()
  userId: string;

  @IsString()
  username: string;

  @IsUrl()
  profileUrl: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserBookRelation)
  userBooks: UserBookRelation[];

  @IsDateString()
  scrapedAt: string;

  @IsString()
  schemaVersion: string = '1.0.0';

  constructor(data: Partial<Library>) {
    Object.assign(this, data);
  }

  get totalBooks(): number {
    return this.userBooks.length;
  }

  getBooksByStatus(status: ReadingStatus): UserBookRelation[] {
    return this.userBooks.filter(ub => ub.readingStatus === status);
  }

  getBooksByShelf(shelfName: string): UserBookRelation[] {
    return this.userBooks.filter(ub =>
      ub.shelves.some(shelf => shelf.name.toLowerCase() === shelfName.toLowerCase())
    );
  }

  getBooksWithRating(minRating?: number, maxRating?: number): UserBookRelation[] {
    return this.userBooks.filter(ub => {
      if (!ub.userRating) return false;
      if (minRating && ub.userRating < minRating) return false;
      if (maxRating && ub.userRating > maxRating) return false;
      return true;
    });
  }

  getBooksWithReviews(): UserBookRelation[] {
    return this.userBooks.filter(ub => ub.review !== null && ub.review !== undefined);
  }
}
