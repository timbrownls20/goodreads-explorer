export class DataValidator {
  /**
   * Validate rating is between 1-5
   */
  static validateRating(rating: number | null | undefined): boolean {
    if (rating === null || rating === undefined) {
      return true; // null ratings are valid
    }
    return rating >= 1 && rating <= 5;
  }

  /**
   * Sanitize text by trimming whitespace
   */
  static sanitizeText(text: string | null | undefined): string | null {
    if (!text) return null;
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  /**
   * Validate ISBN-10 or ISBN-13
   */
  static validateIsbn(isbn: string | null | undefined): boolean {
    if (!isbn) return true; // null ISBNs are valid

    // Remove hyphens and spaces
    const cleaned = isbn.replace(/[-\s]/g, '');

    // Check length
    if (cleaned.length !== 10 && cleaned.length !== 13) {
      return false;
    }

    // Check if all characters are digits (except last char in ISBN-10 can be X)
    if (cleaned.length === 10) {
      return /^\d{9}[\dX]$/i.test(cleaned);
    } else {
      return /^\d{13}$/.test(cleaned);
    }
  }

  /**
   * Validate publication year is reasonable
   */
  static validatePublicationYear(year: number | null | undefined): boolean {
    if (year === null || year === undefined) return true;
    const currentYear = new Date().getFullYear();
    return year >= 1000 && year <= currentYear + 5; // Allow a few years ahead for pre-orders
  }

  /**
   * Validate page count is positive
   */
  static validatePageCount(count: number | null | undefined): boolean {
    if (count === null || count === undefined) return true;
    return count > 0 && Number.isInteger(count);
  }

  /**
   * Normalize genres (lowercase, deduplicate, trim)
   */
  static normalizeGenres(genres: string[]): string[] {
    if (!genres || !Array.isArray(genres)) return [];

    return genres
      .map(g => g.toLowerCase().trim())
      .filter((g, index, arr) => g.length > 0 && arr.indexOf(g) === index) // deduplicate
      .slice(0, 50); // Limit to 50 genres
  }

  /**
   * Parse ISO date string
   */
  static parseIsoDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;

    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  /**
   * Validate date ordering (start <= end)
   */
  static validateDateOrdering(
    startDate: string | null | undefined,
    endDate: string | null | undefined
  ): boolean {
    if (!startDate || !endDate) return true;

    const start = this.parseIsoDate(startDate);
    const end = this.parseIsoDate(endDate);

    if (!start || !end) return true;

    return start <= end;
  }
}
