import * as cheerio from 'cheerio';
import { Book, LiteraryAward } from '../models/book.model';
import { DataValidator } from '../validators/data-validator';

export class BookParser {
  /**
   * Parse a Goodreads book detail page
   */
  static parseBookPage(html: string, goodreadsUrl: string): Partial<Book> {
    const $ = cheerio.load(html);

    const goodreadsId = this.extractGoodreadsId(goodreadsUrl);
    const title = this.extractTitle($);
    const author = this.extractAuthor($);
    const additionalAuthors = this.extractAdditionalAuthors($);
    const isbn = this.extractIsbn($);
    const isbn13 = this.extractIsbn13($);
    const publicationDate = this.extractPublicationDate($);
    const publisher = this.extractPublisher($);
    const pageCount = this.extractPageCount($);
    const language = this.extractLanguage($);
    const setting = this.extractSetting($);
    const literaryAwards = this.extractLiteraryAwards($);
    const genres = this.extractGenres($);
    const averageRating = this.extractAverageRating($);
    const ratingsCount = this.extractRatingsCount($);
    const coverImageUrl = this.extractCoverImageUrl($);

    return {
      goodreadsId,
      title,
      author,
      additionalAuthors,
      isbn,
      isbn13,
      publicationDate,
      publisher,
      pageCount,
      language,
      setting,
      literaryAwards,
      genres: DataValidator.normalizeGenres(genres),
      averageRating,
      ratingsCount,
      coverImageUrl,
      goodreadsUrl,
    };
  }

  private static extractGoodreadsId(url: string): string {
    const match = url.match(/\/book\/show\/([^/?]+)/);
    return match ? match[1] : '';
  }

  private static extractTitle($: cheerio.CheerioAPI): string {
    const selectors = [
      'h1[data-testid="bookTitle"]',
      'h1.Text__title1',
      'h1#bookTitle',
      '.BookPageTitleSection h1',
    ];

    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      if (text) return text;
    }

    return '';
  }

  private static extractAuthor($: cheerio.CheerioAPI): string {
    const selectors = [
      '.ContributorLinksList .ContributorLink__name',
      'a[data-testid="name"]',
      '.authorName span[itemprop="name"]',
      '#bookAuthors .authorName',
    ];

    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      if (text) return text;
    }

    return '';
  }

  private static extractAdditionalAuthors($: cheerio.CheerioAPI): string[] {
    const authors: string[] = [];

    $('.ContributorLinksList .ContributorLink__name').each((index, element) => {
      if (index > 0) {
        // Skip first author (main author)
        const name = $(element).text().trim();
        if (name) authors.push(name);
      }
    });

    return authors;
  }

  private static extractIsbn($: cheerio.CheerioAPI): string | null {
    const text = $('span[itemprop="isbn"]').first().text().trim();
    return text || null;
  }

  private static extractIsbn13($: cheerio.CheerioAPI): string | null {
    const selectors = [
      '[data-testid="isbn13"]',
      'div:contains("ISBN13") + div',
    ];

    for (const selector of selectors) {
      let text = $(selector).first().text().trim();
      // Remove "ISBN13:" prefix if present
      text = text.replace(/^ISBN13:\s*/i, '');
      if (text) return text;
    }

    return null;
  }

  private static extractPublicationDate($: cheerio.CheerioAPI): string | null {
    const selectors = [
      '[data-testid="publicationInfo"]',
      'div[class*="FeaturedDetails"] p:contains("Published")',
      'div.row:contains("Published")',
    ];

    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      if (text) {
        // Extract date from text like "Published January 1st 2000"
        const dateMatch = text.match(/([A-Z][a-z]+ \d{1,2}(?:st|nd|rd|th)?,? \d{4})/);
        return dateMatch ? dateMatch[1] : text;
      }
    }

    return null;
  }

  private static extractPublisher($: cheerio.CheerioAPI): string | null {
    const text = $('[data-testid="publisher"]').first().text().trim();
    return text || null;
  }

  private static extractPageCount($: cheerio.CheerioAPI): number | null {
    const selectors = [
      '[data-testid="pagesFormat"]',
      'span[itemprop="numberOfPages"]',
      'div.row:contains("pages")',
    ];

    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      const match = text.match(/(\d+)\s*pages/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return null;
  }

  private static extractLanguage($: cheerio.CheerioAPI): string | null {
    const text = $('[itemprop="inLanguage"]').first().text().trim();
    return text || null;
  }

  private static extractSetting($: cheerio.CheerioAPI): string | null {
    // Settings are less standardized, try to find them
    const settingText = $('.infoBoxRowItem:contains("Setting")').next().text().trim();
    return settingText || null;
  }

  private static extractLiteraryAwards($: cheerio.CheerioAPI): LiteraryAward[] {
    const awards: LiteraryAward[] = [];

    $('.awardsAndBadges .LiteraryAward, .infoBoxRowItem a[href*="/award/"]').each((_, element) => {
      const name = $(element).text().trim();
      if (name) {
        awards.push(new LiteraryAward({ name }));
      }
    });

    return awards;
  }

  private static extractGenres($: cheerio.CheerioAPI): string[] {
    const genres: string[] = [];

    // New Goodreads layout
    $('[data-testid="genresList"] a, .BookPageMetadataSection__genres a').each((_, element) => {
      const genre = $(element).text().trim();
      if (genre) genres.push(genre);
    });

    // Old layout
    if (genres.length === 0) {
      $('.elementList .left .bookPageGenreLink').each((_, element) => {
        const genre = $(element).text().trim();
        if (genre) genres.push(genre);
      });
    }

    return genres;
  }

  private static extractAverageRating($: cheerio.CheerioAPI): number | null {
    const selectors = [
      '[data-testid="averageRating"]',
      '.RatingStatistics__rating',
      'span[itemprop="ratingValue"]',
    ];

    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      const rating = parseFloat(text);
      if (!isNaN(rating)) return rating;
    }

    return null;
  }

  private static extractRatingsCount($: cheerio.CheerioAPI): number | null {
    const selectors = [
      '[data-testid="ratingsCount"]',
      'span[itemprop="ratingCount"]',
      'span[data-testid="ratingsCount"]',
    ];

    for (const selector of selectors) {
      const text = $(selector).first().text().trim();
      // Extract number from text like "123,456 ratings"
      const match = text.match(/([\d,]+)\s*rating/);
      if (match) {
        return parseInt(match[1].replace(/,/g, ''), 10);
      }
    }

    return null;
  }

  private static extractCoverImageUrl($: cheerio.CheerioAPI): string | null {
    const selectors = [
      'img[data-testid="coverImage"]',
      '.BookCover__image img',
      'img[id="coverImage"]',
      'img[class*="ResponsiveImage"]',
    ];

    for (const selector of selectors) {
      const src = $(selector).first().attr('src');
      if (src) {
        // Use highest quality version
        return src.replace(/_SX\d+_/, '_SX1200_').replace(/_SY\d+_/, '_SY1200_');
      }
    }

    return null;
  }
}
