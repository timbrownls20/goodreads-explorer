import * as cheerio from 'cheerio';

export class PaginationHelper {
  /**
   * Detect if there's more content on the next page
   */
  static detectPagination(html: string): boolean {
    const $ = cheerio.load(html);

    // Check for "next" link
    const nextLink = $('a.next_page').length > 0;
    const nextButton = $('a:contains("Next »")').length > 0 || $('a:contains("next")').length > 0;

    return nextLink || nextButton;
  }

  /**
   * Get the URL for the next page
   */
  static getNextPageUrl(html: string, baseUrl: string): string | null {
    const $ = cheerio.load(html);

    const nextLink = $('a.next_page').first();
    const href = nextLink.attr('href');

    if (!href) return null;

    // If href is absolute, return it
    if (href.startsWith('http')) {
      return href;
    }

    // If href is relative, combine with base URL
    const url = new URL(baseUrl);
    if (href.startsWith('/')) {
      return `${url.origin}${href}`;
    } else {
      return `${baseUrl}${href}`;
    }
  }

  /**
   * Extract page number from URL
   */
  static extractPageNumber(url: string): number {
    try {
      const urlObj = new URL(url);
      const page = urlObj.searchParams.get('page');
      return page ? parseInt(page, 10) : 1;
    } catch {
      return 1;
    }
  }

  /**
   * Build library URL with query parameters
   */
  static buildLibraryUrl(
    profileUrl: string,
    page: number = 1,
    shelf: string = 'all',
    sort: string | null = null
  ): string {
    try {
      const url = new URL(profileUrl);

      // Modify path to library view
      if (!url.pathname.includes('/review/list')) {
        const userId = url.pathname.match(/\/user\/show\/(\d+)/)?.[1];
        if (userId) {
          url.pathname = `/review/list/${userId}`;
        }
      }

      // Add query parameters
      if (page > 1) {
        url.searchParams.set('page', page.toString());
      }

      if (shelf && shelf !== 'all') {
        url.searchParams.set('shelf', shelf);
      }

      if (sort) {
        url.searchParams.set('sort', sort);
      }

      // Default parameters
      url.searchParams.set('per_page', '100'); // Max per page

      return url.toString();
    } catch {
      return profileUrl;
    }
  }
}
