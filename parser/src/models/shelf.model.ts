import { IsString, IsBoolean, IsOptional, IsNumber } from 'class-validator';

export enum ReadingStatus {
  READ = 'read',
  CURRENTLY_READING = 'currently-reading',
  TO_READ = 'to-read',
}

export class Shelf {
  @IsString()
  name: string;

  @IsBoolean()
  isBuiltin: boolean;

  @IsOptional()
  @IsNumber()
  bookCount?: number | null;

  constructor(data: { name: string; isBuiltin: boolean; bookCount?: number | null }) {
    this.name = data.name;
    this.isBuiltin = data.isBuiltin;
    this.bookCount = data.bookCount;
  }
}
