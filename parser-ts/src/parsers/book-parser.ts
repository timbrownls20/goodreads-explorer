import * as cheerio from 'cheerio';
import { Book, LiteraryAward } from '../models/book.model';
import { DataValidator } from '../validators/data-validator';

export class BookParser {
  /**
   * Parse a Goodreads book detail page
   * Uses __NEXT_DATA__ as primary source (like Python implementation), with HTML fallbacks
   */
  static parseBookPage(html: string, goodreadsUrl: string): Partial<Book> {
    const $ = cheerio.load(html);

    // Extract from __NEXT_DATA__ first (most reliable source)
    const nextData = this.extractFromNextData($);

    const goodreadsId = this.extractGoodreadsId(goodreadsUrl);
    const title = nextData.title || this.extractTitle($);
    const author = nextData.author || this.extractAuthor($);
    const additionalAuthors = this.extractAdditionalAuthors($);
    const isbn = nextData.isbn || this.extractIsbn($);
    const isbn13 = nextData.isbn13 || this.extractIsbn13($);
    const publicationDate = nextData.publicationDate || this.extractPublicationDate($);
    const publisher = nextData.publisher || this.extractPublisher($);
    const pageCount = nextData.pageCount || this.extractPageCount($);
    const language = nextData.language || this.extractLanguage($);
    const setting = nextData.setting || this.extractSetting($);
    const literaryAwards = nextData.literaryAwards.length > 0 ? nextData.literaryAwards : this.extractLiteraryAwards($);
    const genres = this.extractGenres($);
    const averageRating = nextData.averageRating || this.extractAverageRating($);
    const ratingsCount = nextData.ratingsCount || this.extractRatingsCount($);
    const coverImageUrl = nextData.coverImageUrl || this.extractCoverImageUrl($);

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

  /**
   * Extract book metadata from __NEXT_DATA__ Apollo state
   * This is the primary data source - matches Python implementation
   */
  private static extractFromNextData($: cheerio.CheerioAPI): {
    title: string | null;
    author: string | null;
    isbn: string | null;
    isbn13: string | null;
    publicationDate: string | null;
    publisher: string | null;
    pageCount: number | null;
    language: string | null;
    setting: string | null;
    literaryAwards: LiteraryAward[];
    averageRating: number | null;
    ratingsCount: number | null;
    coverImageUrl: string | null;
  } {
    const result: any = {
      title: null,
      author: null,
      isbn: null,
      isbn13: null,
      publicationDate: null,
      publisher: null,
      pageCount: null,
      language: null,
      setting: null,
      literaryAwards: [],
      averageRating: null,
      ratingsCount: null,
      coverImageUrl: null,
    };

    try {
      const scriptTag = $('script#__NEXT_DATA__').first();
      if (!scriptTag.length) return result;

      const jsonText = scriptTag.html();
      if (!jsonText) return result;

      const data = JSON.parse(jsonText);
      const apolloState = data?.props?.pageProps?.apolloState;
      if (!apolloState) return result;

      // Find Book object (key starts with "Book:")
      for (const [key, value] of Object.entries(apolloState)) {
        if (key.startsWith('Book:') && typeof value === 'object' && value !== null) {
          const bookData = value as any;
          const details = bookData.details;

          if (details) {
            // Extract ISBN and ISBN-13
            if (details.isbn) {
              const isbnStr = String(details.isbn);
              if (isbnStr.length === 10) {
                result.isbn = isbnStr;
              }
            }
            if (details.isbn13) {
              const isbn13Str = String(details.isbn13);
              if (isbn13Str.length === 13) {
                result.isbn13 = isbn13Str;
              }
            }

            // Publisher
            if (details.publisher) {
              result.publisher = String(details.publisher).trim().substring(0, 200);
            }

            // Page count
            if (details.numPages) {
              result.pageCount = parseInt(details.numPages, 10);
            }

            // Language
            if (details.language?.name) {
              result.language = String(details.language.name).trim();
            }

            // Publication date from publicationTime (milliseconds timestamp)
            if (details.publicationTime) {
              try {
                const timestamp = parseInt(details.publicationTime, 10);
                const date = new Date(timestamp);
                result.publicationDate = date.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                });
              } catch (e) {
                // Ignore date parsing errors
              }
            }
          }

          // Title
          if (bookData.title) {
            result.title = String(bookData.title).trim();
          }

          // Primary author
          if (bookData.primaryContributorEdge?.node?.name) {
            result.author = String(bookData.primaryContributorEdge.node.name).trim();
          }

          break; // Only process first Book object
        }
      }

      // Find Work object (key starts with "Work:") for setting and awards
      for (const [key, value] of Object.entries(apolloState)) {
        if (key.startsWith('Work:') && typeof value === 'object' && value !== null) {
          const workData = value as any;
          const details = workData.details;

          if (details) {
            // Setting - extract from places array
            if (details.places?.length > 0 && details.places[0]?.name) {
              result.setting = String(details.places[0].name).trim().substring(0, 200);
            }

            // Literary Awards - extract from awardsWon array
            if (details.awardsWon && Array.isArray(details.awardsWon)) {
              for (const award of details.awardsWon) {
                if (award?.name) {
                  const awardObj: any = {
                    name: String(award.name).trim().substring(0, 200),
                  };

                  // Category
                  if (award.category) {
                    awardObj.category = String(award.category).trim().substring(0, 200);
                  }

                  // Year from awardedAt timestamp
                  if (award.awardedAt) {
                    try {
                      const timestamp = parseInt(award.awardedAt, 10);
                      const date = new Date(timestamp);
                      awardObj.year = date.getFullYear();
                    } catch (e) {
                      // Ignore year parsing errors
                    }
                  }

                  result.literaryAwards.push(new LiteraryAward(awardObj));
                }
              }
            }
          }

          break; // Only process first Work object
        }
      }
    } catch (e) {
      // If JSON parsing fails, return what we have (empty result)
    }

    return result;
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
