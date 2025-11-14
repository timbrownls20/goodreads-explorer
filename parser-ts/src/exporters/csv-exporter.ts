import * as fs from 'fs';
import * as path from 'path';
import { Library } from '../models/library.model';

export class CsvExporter {
  /**
   * Export library to CSV file
   */
  static exportToCsv(library: Library, outputPath: string): void {
    const rows = this.libraryToCsvRows(library);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write CSV
    const csvContent = rows.join('\n');
    fs.writeFileSync(outputPath, csvContent, 'utf-8');
  }

  /**
   * Convert library to CSV rows
   */
  static libraryToCsvRows(library: Library): string[] {
    const rows: string[] = [];

    // Header row
    const headers = [
      'goodreads_id',
      'title',
      'author',
      'user_rating',
      'reading_status',
      'shelf',
      'date_added',
      'date_started',
      'date_finished',
      'isbn',
      'isbn13',
      'publication_date',
      'publisher',
      'page_count',
      'language',
      'genres',
      'average_rating',
      'ratings_count',
      'cover_image_url',
      'goodreads_url',
      'has_review',
    ];
    rows.push(this.escapeRow(headers));

    // Data rows (one row per book-shelf combination)
    for (const userBook of library.userBooks) {
      // If book has shelves, create one row per shelf
      if (userBook.shelves.length > 0) {
        for (const shelf of userBook.shelves) {
          const row = [
            userBook.book.goodreadsId,
            userBook.book.title,
            userBook.book.author,
            userBook.userRating?.toString() || '',
            userBook.readingStatus,
            shelf.name,
            userBook.dateAdded || '',
            userBook.readRecords[0]?.dateStarted || '',
            userBook.readRecords[0]?.dateFinished || '',
            userBook.book.isbn || '',
            userBook.book.isbn13 || '',
            userBook.book.publicationDate || '',
            userBook.book.publisher || '',
            userBook.book.pageCount?.toString() || '',
            userBook.book.language || '',
            (userBook.book.genres || []).join('; '),
            userBook.book.averageRating?.toString() || '',
            userBook.book.ratingsCount?.toString() || '',
            userBook.book.coverImageUrl || '',
            userBook.book.goodreadsUrl,
            userBook.review ? 'true' : 'false',
          ];
          rows.push(this.escapeRow(row));
        }
      } else {
        // No shelves, create single row
        const row = [
          userBook.book.goodreadsId,
          userBook.book.title,
          userBook.book.author,
          userBook.userRating?.toString() || '',
          userBook.readingStatus,
          '',
          userBook.dateAdded || '',
          userBook.readRecords[0]?.dateStarted || '',
          userBook.readRecords[0]?.dateFinished || '',
          userBook.book.isbn || '',
          userBook.book.isbn13 || '',
          userBook.book.publicationDate || '',
          userBook.book.publisher || '',
          userBook.book.pageCount?.toString() || '',
          userBook.book.language || '',
          (userBook.book.genres || []).join('; '),
          userBook.book.averageRating?.toString() || '',
          userBook.book.ratingsCount?.toString() || '',
          userBook.book.coverImageUrl || '',
          userBook.book.goodreadsUrl,
          userBook.review ? 'true' : 'false',
        ];
        rows.push(this.escapeRow(row));
      }
    }

    return rows;
  }

  /**
   * Escape and format a CSV row
   */
  private static escapeRow(values: string[]): string {
    return values
      .map(value => {
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',');
  }
}
