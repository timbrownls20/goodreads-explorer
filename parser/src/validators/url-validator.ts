export interface ValidationResult {
  isValid: boolean;
  normalizedUrl?: string;
  userId?: string;
  username?: string;
  error?: string;
}

export class UrlValidator {
  /**
   * Validate and normalize Goodreads profile URL
   */
  static validateGoodreadsProfileUrl(url: string): ValidationResult {
    try {
      // Extract user ID from URL
      const userId = this.extractUserIdFromUrl(url);

      if (!userId) {
        return {
          isValid: false,
          error: 'Invalid Goodreads profile URL - could not extract user ID',
        };
      }

      // Extract username from URL (if present)
      const username = this.extractUsernameFromUrl(url);

      // Normalize URL
      const normalizedUrl = this.normalizeProfileUrl(url);

      return {
        isValid: true,
        normalizedUrl,
        userId,
        username: username || undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract user ID from Goodreads profile URL
   */
  static extractUserIdFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);

      if (!urlObj.hostname.includes('goodreads.com')) {
        return null;
      }

      // Pattern: /user/show/12345-username or /user/show/12345
      const match = urlObj.pathname.match(/\/user\/show\/(\d+)/);

      if (match && match[1]) {
        return match[1];
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extract username from Goodreads profile URL
   * Pattern: /user/show/12345-username -> "username"
   */
  static extractUsernameFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);

      if (!urlObj.hostname.includes('goodreads.com')) {
        return null;
      }

      // Pattern: /user/show/12345-username
      const match = urlObj.pathname.match(/\/user\/show\/\d+-(.+)/);

      if (match && match[1]) {
        return match[1];
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Normalize profile URL to standard format
   */
  static normalizeProfileUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // Ensure HTTPS
      urlObj.protocol = 'https:';

      // Ensure www subdomain
      if (!urlObj.hostname.startsWith('www.')) {
        urlObj.hostname = `www.${urlObj.hostname}`;
      }

      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Check if URL is a Goodreads book page
   */
  static isGoodreadsBookUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return (
        urlObj.hostname.includes('goodreads.com') &&
        urlObj.pathname.includes('/book/show/')
      );
    } catch {
      return false;
    }
  }
}
