#!/usr/bin/env node

import { Command } from 'commander';
import { scrapeLibrary } from '../api';
import { logger } from '../utils/logger';
import * as path from 'path';

const program = new Command();

program
  .name('goodreads-scraper')
  .description('Scrape Goodreads user libraries and save individual book JSON files')
  .version('1.0.0');

program
  .command('scrape')
  .description('Scrape a Goodreads library')
  .argument('<url>', 'Goodreads profile URL')
  .option('-d, --output-dir <dir>', 'Output directory for book files', './output')
  .option('--rate-limit <ms>', 'Delay between requests in milliseconds', '1000')
  .option('--max-retries <count>', 'Maximum retry attempts', '3')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '30000')
  .option('--limit <count>', 'Maximum number of books to scrape')
  .option('--sort-by <field>', 'Sort order (date-read, date-added, title, author, rating)')
  .option('--no-progress', 'Disable progress reporting')
  .action(async (url: string, options: any) => {
    try {
      const rateLimitDelay = parseInt(options.rateLimit, 10);
      const maxRetries = parseInt(options.maxRetries, 10);
      const timeout = parseInt(options.timeout, 10);
      const limit = options.limit ? parseInt(options.limit, 10) : undefined;

      logger.info('Starting scrape', {
        url,
        outputDir: options.outputDir,
        rateLimitDelay,
        maxRetries,
        timeout,
        limit,
      });

      let bookCount = 0;
      const library = await scrapeLibrary(url, {
        outputDir: path.resolve(options.outputDir),
        rateLimitDelay,
        maxRetries,
        timeout,
        limit,
        sort: options.sortBy || null,
        progressCallback: options.progress
          ? (current: number) => {
              bookCount = current;
              if (current % 10 === 0) {
                logger.info(`Progress: ${current} books scraped`);
              }
            }
          : undefined,
      });

      logger.info('Scrape complete!', {
        totalBooks: library.totalBooks,
        username: library.username,
        outputDir: path.resolve(options.outputDir, `${library.username}_library`),
      });

      console.log(`\nSuccessfully scraped ${library.totalBooks} books from ${library.username}`);
      console.log(`Files saved to: ${path.resolve(options.outputDir, `${library.username}_library`)}/`);
    } catch (error) {
      logger.error('Scrape failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.error('\nError:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();
