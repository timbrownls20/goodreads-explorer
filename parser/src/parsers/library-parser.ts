import * as cheerio from 'cheerio';
import { ScrapingError } from '../exceptions/parser-exceptions';
import { Shelf } from '../models/shelf.model';
import { logger } from '../utils/logger';

export interface LibraryPageResult {
  userId: string | null;
  username: string | null;
  books: any[]; // Will be filled by the scraper
  hasNextPage: boolean;
  nextPageUrl: string | null;
}

export class LibraryParser {
  /**
   * Parse a Goodreads library page
   */
  static parseLibraryPage(html: string, baseUrl: string): LibraryPageResult {
    const $ = cheerio.load(html);

    const userId = this.extractUserId($);
    const username = this.extractUsername($);
    const hasNextPage = this.detectNextPage($);
    const nextPageUrl = hasNextPage ? this.getNextPageUrl($, baseUrl) : null;

    return {
      userId,
      username,
      books: [], // Books will be extracted by the scraper
      hasNextPage,
      nextPageUrl,
    };
  }

  /**
   * Extract user ID from profile page
   */
  static extractUserId($: cheerio.CheerioAPI): string | null {
    // Try multiple selectors
    const selectors = [
      'a[href*="/user/show/"]',
      '[data-resource-id]',
      'div.leftContainer a[href*="/user/show/"]',
    ];

    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        const href = element.attr('href');
        if (href) {
          const match = href.match(/\/user\/show\/(\d+)/);
          if (match && match[1]) {
            return match[1];
          }
        }

        const resourceId = element.attr('data-resource-id');
        if (resourceId) {
          return resourceId;
        }
      }
    }

    return null;
  }

  /**
   * Extract username from profile page
   */
  static extractUsername($: cheerio.CheerioAPI): string | null {
    // Try multiple selectors
    const selectors = [
      '.headerPersonalNav .dropdown__menu--profileMenu .dropdown__trigger .avatar__name',
      'h1.userProfileName',
      '.leftContainer .userProfileName',
      'meta[property="profile:username"]',
    ];

    for (const selector of selectors) {
      let text: string | undefined;

      if (selector.startsWith('meta')) {
        text = $(selector).attr('content');
      } else {
        text = $(selector).first().text();
      }

      if (text) {
        return text.trim();
      }
    }

    return null;
  }

  /**
   * Detect if there's a next page
   */
  static detectNextPage($: cheerio.CheerioAPI): boolean {
    // Check for "next" link
    const nextLink = $('a.next_page').length > 0;

    // Check for pagination with "Next" text
    const nextButton = $('a:contains("Next »")').length > 0 || $('a:contains("next")').length > 0;

    return nextLink || nextButton;
  }

  /**
   * Get next page URL
   */
  static getNextPageUrl($: cheerio.CheerioAPI, baseUrl: string): string | null {
    const nextLink = $('a.next_page').first();
    const href = nextLink.attr('href');

    if (!href) return null;

    // If href is relative, combine with base URL
    if (href.startsWith('http')) {
      return href;
    } else if (href.startsWith('/')) {
      const url = new URL(baseUrl);
      return `${url.origin}${href}`;
    } else {
      return `${baseUrl}${href}`;
    }
  }

  /**
   * Parse exclusive reading status shelves from HTML sidebar
   * Extracts shelves that appear BEFORE the horizontal divider
   * (matching Python parser logic)
   *
   * Exclusive shelves are reading-status shelves where a book can only be on ONE at a time.
   * These appear before the horizontalGreyDivider in the paginatedShelfList.
   */
  static parseReadingStatusShelves(html: string): Array<{ slug: string; count: number }> {
    const $ = cheerio.load(html);
    const shelves: Array<{ slug: string; count: number }> = [];

    // Find the paginatedShelfList div
    const shelfListContainer = $('#paginatedShelfList');

    if (shelfListContainer.length === 0) {
      const errorMsg = 'Could not find paginatedShelfList div in review list page HTML';
      logger.error(errorMsg);
      throw new ScrapingError(errorMsg);
    }

    // Iterate through direct children, stopping at horizontal divider
    shelfListContainer.children().each((_, elem) => {
      const $elem = $(elem);

      // Stop at horizontal divider (this separates exclusive from non-exclusive shelves)
      if ($elem.hasClass('horizontalGreyDivider')) {
        logger.debug('Found horizontal divider, stopping exclusive shelf extraction');
        return false; // Break out of .each()
      }

      // Look for shelf links within this element (should be in userShelf divs)
      const $link = $elem.find('a.actionLinkLite[href*="shelf="]').first();
      if ($link.length === 0) {
        return; // No link in this element, continue to next
      }

      const href = $link.attr('href');
      if (!href) return;

      // Extract shelf slug from URL (e.g., ?shelf=read)
      const match = href.match(/[?&]shelf=([^&]+)/);
      if (!match || !match[1]) return;

      const slug = match[1];

      // Extract count - look for number in parentheses in the link text
      const linkText = $link.text();
      const countMatch = linkText.match(/\((\d+)\)/);
      const count = countMatch ? parseInt(countMatch[1], 10) : 0;

      shelves.push({ slug, count });
      logger.debug(`Found exclusive shelf: ${slug} (${count} books)`);
    });

    // If we didn't find any exclusive shelves, throw an error
    if (shelves.length === 0) {
      const errorMsg = 'No exclusive reading status shelves found before horizontal divider';
      logger.error(errorMsg);
      throw new ScrapingError(errorMsg);
    }

    logger.info(`Found ${shelves.length} exclusive shelves`, {
      shelves: shelves.map(s => s.slug)
    });
    return shelves;
  }

  /**
   * Parse custom shelves from review page
   */
  static parseReviewPageShelves(html: string): Shelf[] {
    const $ = cheerio.load(html);
    const shelves: Shelf[] = [];
    const seenShelves = new Set<string>();

    // Find all links with shelf parameter in the href
    $('a[href*="shelf="]').each((_, element) => {
      const href = $(element).attr('href') || '';
      const text = $(element).text().trim();

      // Extract shelf name from URL parameter
      const match = href.match(/[?&]shelf=([^&]+)/);
      if (match) {
        const shelfName = match[1];

        // Only include if:
        // 1. Link text matches the shelf name (filters out navigation links)
        // 2. Haven't seen this shelf before (deduplicate)
        if (text === shelfName && !seenShelves.has(shelfName)) {
          seenShelves.add(shelfName);
          shelves.push(
            new Shelf({
              name: shelfName,
              isBuiltin: ['read', 'currently-reading', 'to-read'].includes(shelfName.toLowerCase()),
              bookCount: null,
            })
          );
        }
      }
    });

    return shelves;
  }
}
