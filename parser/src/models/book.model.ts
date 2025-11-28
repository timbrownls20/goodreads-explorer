import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsUrl, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class LiteraryAward {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  category?: string | null;

  @IsOptional()
  @IsNumber()
  year?: number | null;

  constructor(data: { name: string; category?: string | null; year?: number | null }) {
    this.name = data.name;
    this.category = data.category;
    this.year = data.year;
  }
}

export class Book {
  @IsString()
  goodreadsId: string;

  @IsString()
  title: string;

  @IsString()
  author: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalAuthors?: string[];

  @IsOptional()
  @IsString()
  isbn?: string | null;

  @IsOptional()
  @IsString()
  isbn13?: string | null;

  @IsOptional()
  @IsString()
  publicationDate?: string | null;

  @IsOptional()
  @IsString()
  publisher?: string | null;

  @IsOptional()
  @IsNumber()
  pageCount?: number | null;

  @IsOptional()
  @IsString()
  language?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  setting?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LiteraryAward)
  literaryAwards?: LiteraryAward[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genres?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  averageRating?: number | null;

  @IsOptional()
  @IsNumber()
  ratingsCount?: number | null;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string | null;

  @IsUrl()
  goodreadsUrl: string;

  constructor(data: Partial<Book>) {
    Object.assign(this, data);
    this.title = this.title?.trim();
    this.author = this.author?.trim();

    // Normalize genres
    if (this.genres) {
      this.genres = this.genres
        .map(g => g.toLowerCase().trim())
        .filter((g, i, arr) => arr.indexOf(g) === i); // deduplicate
    }
  }
}
