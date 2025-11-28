import { GoodreadsScraper, ScraperOptions } from './scrapers/goodreads-scraper';
import { Library } from './models/library.model';

export interface ScrapeOptions extends ScraperOptions {
  // Inherited from ScraperOptions
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
 * Scrape library - individual book files are saved automatically during scraping
 * @deprecated Use scrapeLibrary() instead - this function is kept for backwards compatibility
 */
export async function scrapeAndExport(
  profileUrl: string,
  options: ScrapeOptions = {}
): Promise<Library> {
  const library = await scrapeLibrary(profileUrl, options);
  return library;
}

// Re-export models and utilities for convenience
export { Library } from './models/library.model';
export { Book, LiteraryAward } from './models/book.model';
export { UserBookRelation, Review, ReadRecord } from './models/user-book.model';
export { Shelf, ReadingStatus } from './models/shelf.model';
export { GoodreadsScraper } from './scrapers/goodreads-scraper';
export { JsonExporter } from './exporters/json-exporter';
export * from './exceptions/parser-exceptions';
