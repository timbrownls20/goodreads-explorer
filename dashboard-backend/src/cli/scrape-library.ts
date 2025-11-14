#!/usr/bin/env node

import { Command } from 'commander';
import { scrapeAndExport } from '../parser/api';
import { logger } from '../utils/logger';
import * as path from 'path';

const program = new Command();

program
  .name('goodreads-scraper')
  .description('Scrape Goodreads library data')
  .version('1.0.0');

program
  .command('scrape')
  .description('Scrape a Goodreads user library')
  .argument('<profile-url>', 'Goodreads profile URL')
  .option('-f, --format <format>', 'Output format (json or csv)', 'json')
  .option('-o, --output <path>', 'Output file path')
  .option('-d, --output-dir <dir>', 'Output directory for individual book files')
  .option('--rate-limit <ms>', 'Delay between requests in milliseconds', '1000')
  .option('--max-retries <count>', 'Maximum retry attempts', '3')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '30000')
  .option('--limit <count>', 'Maximum number of books to scrape')
  .option('--sort-by <field>', 'Sort books by field (date-read, date-added, title, author, rating)')
  .option('--per-book-files', 'Save individual JSON file per book')
  .option('--no-progress', 'Disable progress reporting')
  .action(async (profileUrl: string, options: any) => {
    try {
      logger.info('Starting Goodreads library scrape', { profileUrl });

      const format = options.format as 'json' | 'csv';
      const outputPath = options.output || `library.${format}`;

      let progressCallback: ((current: number, total: number) => void) | undefined;
      if (options.progress) {
        progressCallback = (current: number, total: number) => {
          const totalText = total > 0 ? `/${total}` : '';
          logger.info(`Progress: ${current}${totalText} books scraped`);
        };
      }

      const library = await scrapeAndExport(profileUrl, {
        outputFormat: format,
        outputPath,
        rateLimitDelay: parseInt(options.rateLimit, 10),
        maxRetries: parseInt(options.maxRetries, 10),
        timeout: parseInt(options.timeout, 10),
        limit: options.limit ? parseInt(options.limit, 10) : 0,
        sort: options.sortBy || null,
        saveIndividualBooks: options.perBookFiles,
        outputDir: options.outputDir || './output',
        progressCallback,
      });

      logger.info('Scrape complete!', {
        totalBooks: library.totalBooks,
        outputPath,
      });

      console.log(`\n✓ Successfully scraped ${library.totalBooks} books`);
      console.log(`  Output saved to: ${path.resolve(outputPath)}`);

      if (options.perBookFiles) {
        console.log(`  Individual book files saved to: ${path.resolve(options.outputDir || './output')}`);
      }
    } catch (error) {
      logger.error('Scrape failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      console.error(`\n✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('help')
  .description('Show detailed usage information')
  .action(() => {
    console.log(`
Goodreads Library Scraper
=========================

Usage:
  goodreads-scraper scrape <profile-url> [options]

Options:
  -f, --format <format>       Output format: json or csv (default: json)
  -o, --output <path>         Output file path (default: library.[format])
  -d, --output-dir <dir>      Directory for individual book files (default: ./output)
  --rate-limit <ms>           Delay between requests in ms (default: 1000)
  --max-retries <count>       Maximum retry attempts (default: 3)
  --timeout <ms>              Request timeout in ms (default: 30000)
  --limit <count>             Maximum number of books to scrape
  --sort-by <field>           Sort by: date-read, date-added, title, author, rating
  --per-book-files            Save individual JSON file per book
  --no-progress               Disable progress reporting

Examples:
  # Scrape all books to JSON
  goodreads-scraper scrape https://www.goodreads.com/user/show/12345-username

  # Scrape to CSV with custom output path
  goodreads-scraper scrape https://www.goodreads.com/user/show/12345 -f csv -o my-library.csv

  # Scrape first 100 books with individual files
  goodreads-scraper scrape https://www.goodreads.com/user/show/12345 --limit 100 --per-book-files

  # Scrape with slower rate limit
  goodreads-scraper scrape https://www.goodreads.com/user/show/12345 --rate-limit 2000
    `);
  });

if (process.argv.length <= 2) {
  program.help();
} else {
  program.parse();
}
