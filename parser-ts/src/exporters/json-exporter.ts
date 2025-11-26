import * as fs from 'fs';
import * as path from 'path';
import { Library } from '../models/library.model';
import { UserBookRelation } from '../models/user-book.model';

export class JsonExporter {
  /**
   * Export library to JSON file
   */
  static exportToJson(library: Library, outputPath: string): void {
    const jsonString = this.libraryToJsonString(library, 2);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, jsonString, 'utf-8');
  }

  /**
   * Convert library to JSON-serializable object
   */
  static libraryToJsonDict(library: Library): any {
    return {
      user_id: library.userId,
      username: library.username,
      profile_url: library.profileUrl,
      scraped_at: library.scrapedAt,
      schema_version: library.schemaVersion,
      total_books: library.totalBooks,
      user_books: library.userBooks.map(ub => this.userBookToDict(ub)),
    };
  }

  /**
   * Convert library to JSON string
   */
  static libraryToJsonString(library: Library, indent?: number): string {
    const dict = this.libraryToJsonDict(library);
    return JSON.stringify(dict, null, indent);
  }

  /**
   * Export individual book to file
   */
  static exportBookToFile(userBook: UserBookRelation, outputPath: string): void {
    const data = this.userBookToDict(userBook);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Convert user-book relation to dictionary
   */
  private static userBookToDict(userBook: UserBookRelation): any {
    return {
      book: {
        goodreads_id: userBook.book.goodreadsId,
        title: userBook.book.title,
        author: userBook.book.author,
        additional_authors: userBook.book.additionalAuthors || [],
        isbn: userBook.book.isbn,
        isbn13: userBook.book.isbn13,
        publication_date: userBook.book.publicationDate,
        publisher: userBook.book.publisher,
        page_count: userBook.book.pageCount,
        language: userBook.book.language,
        setting: userBook.book.setting,
        literary_awards: userBook.book.literaryAwards || [],
        genres: userBook.book.genres || [],
        average_rating: userBook.book.averageRating,
        ratings_count: userBook.book.ratingsCount,
        cover_image_url: userBook.book.coverImageUrl,
        goodreads_url: userBook.book.goodreadsUrl,
      },
      user_rating: userBook.userRating,
      reading_status: userBook.readingStatus,
      shelves: userBook.shelves,
      date_added: userBook.dateAdded,
      read_records: userBook.readRecords.map(rr => ({
        date_started: rr.dateStarted,
        date_finished: rr.dateFinished,
      })),
    };
  }
}
