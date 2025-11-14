import { GoodreadsScraper, ScraperOptions } from './scrapers/goodreads-scraper';
import { Library } from './models/library.model';
import { JsonExporter } from './exporters/json-exporter';
import { CsvExporter } from './exporters/csv-exporter';

export interface ScrapeOptions extends ScraperOptions {
  // Inherited from ScraperOptions
}

export interface ExportOptions extends ScrapeOptions {
  outputFormat?: 'json' | 'csv';
  outputPath?: string;
}

/**
 * Main scraping function - public API
 */
export async function scrapeLibrary(
  profileUrl: string,
  options: ScrapeOptions = {}
): Promise<Library> {
  const scraper = new GoodreadsScraper(options);
  const library = await scraper.scrapeLibrary(profileUrl);
  return library;
}

/**
 * Scrape and export library - convenience wrapper
 */
export async function scrapeAndExport(
  profileUrl: string,
  options: ExportOptions = {}
): Promise<Library> {
  const library = await scrapeLibrary(profileUrl, options);

  if (options.outputPath) {
    const format = options.outputFormat || 'json';

    if (format === 'json') {
      JsonExporter.exportToJson(library, options.outputPath);
    } else if (format === 'csv') {
      CsvExporter.exportToCsv(library, options.outputPath);
    }
  }

  return library;
}

// Re-export models and utilities for convenience
export { Library } from './models/library.model';
export { Book, LiteraryAward } from './models/book.model';
export { UserBookRelation, Review, ReadRecord } from './models/user-book.model';
export { Shelf, ReadingStatus } from './models/shelf.model';
export { GoodreadsScraper } from './scrapers/goodreads-scraper';
export { JsonExporter } from './exporters/json-exporter';
export { CsvExporter } from './exporters/csv-exporter';
export * from './exceptions/parser-exceptions';
