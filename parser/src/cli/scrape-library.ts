#!/usr/bin/env node

import 'reflect-metadata';
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
  .option('--limit <count>', 'Maximum number of books to scrape per shelf')
  .option('--shelf <name>', 'Scrape only a specific exclusive shelf (e.g., read, to-read, currently-reading)')
  .option('--title <search>', 'Filter books by title (case-insensitive substring match)')
  .option('--sort-by <field>', 'Sort order (date-read, date-added, title, author, rating)')
  .option('--resume', 'Resume scraping by skipping books that already have output files')
  .option('--no-progress', 'Disable progress reporting')
  .action(async (url: string, options: any) => {
    try {
      const rateLimitDelay = parseInt(options.rateLimit, 10);
      const maxRetries = parseInt(options.maxRetries, 10);
      const timeout = parseInt(options.timeout, 10);
      const limit = options.limit ? parseInt(options.limit, 10) : undefined;
      const shelfFilter = options.shelf || undefined;
      const titleFilter = options.title || undefined;

      logger.info('Starting scrape', {
        url,
        outputDir: options.outputDir,
        rateLimitDelay,
        maxRetries,
        timeout,
        limit,
        shelfFilter,
        titleFilter,
        resume: options.resume || false,
      });

      let bookCount = 0;
      const library = await scrapeLibrary(url, {
        outputDir: path.resolve(options.outputDir),
        rateLimitDelay,
        maxRetries,
        timeout,
        limit,
        shelfFilter,
        titleFilter,
        sort: options.sortBy || null,
        resume: options.resume || false,
        progressCallback: options.progress
          ? (scraped: number, totalProcessed: number) => {
              bookCount = scraped;
              if (totalProcessed % 10 === 0 || scraped % 10 === 0) {
                const skipped = totalProcessed - scraped;
                if (options.resume && skipped > 0) {
                  logger.info(`Progress: ${scraped} books scraped, ${skipped} skipped (${totalProcessed} total processed)`);
                } else {
                  logger.info(`Progress: ${scraped} books scraped`);
                }
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

      // Exit cleanly to prevent hanging due to axios keep-alive connections
      process.exit(0);
    } catch (error) {
      logger.error('Scrape failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.error('\nError:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();
