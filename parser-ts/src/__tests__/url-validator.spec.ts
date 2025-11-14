import { UrlValidator } from '../validators/url-validator';

describe('UrlValidator', () => {
  describe('validateGoodreadsProfileUrl', () => {
    it('should validate valid Goodreads profile URL', () => {
      const result = UrlValidator.validateGoodreadsProfileUrl(
        'https://www.goodreads.com/user/show/12345-username'
      );

      expect(result.isValid).toBe(true);
      expect(result.userId).toBe('12345');
      expect(result.normalizedUrl).toBe('https://www.goodreads.com/user/show/12345-username');
    });

    it('should normalize URLs without www', () => {
      const result = UrlValidator.validateGoodreadsProfileUrl(
        'https://goodreads.com/user/show/12345'
      );

      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toBe('https://www.goodreads.com/user/show/12345');
    });

    it('should normalize HTTP to HTTPS', () => {
      const result = UrlValidator.validateGoodreadsProfileUrl(
        'http://www.goodreads.com/user/show/12345'
      );

      expect(result.isValid).toBe(true);
      expect(result.normalizedUrl).toContain('https://');
    });

    it('should reject invalid URLs', () => {
      const result = UrlValidator.validateGoodreadsProfileUrl('not-a-url');

      expect(result.isValid).toBe(false);
    });

    it('should reject non-Goodreads URLs', () => {
      const result = UrlValidator.validateGoodreadsProfileUrl('https://www.example.com/user/12345');

      expect(result.isValid).toBe(false);
    });
  });

  describe('extractUserIdFromUrl', () => {
    it('should extract user ID from profile URL', () => {
      const userId = UrlValidator.extractUserIdFromUrl(
        'https://www.goodreads.com/user/show/12345-username'
      );

      expect(userId).toBe('12345');
    });

    it('should extract user ID without username', () => {
      const userId = UrlValidator.extractUserIdFromUrl(
        'https://www.goodreads.com/user/show/12345'
      );

      expect(userId).toBe('12345');
    });

    it('should return null for invalid URL', () => {
      const userId = UrlValidator.extractUserIdFromUrl('https://www.example.com/user');

      expect(userId).toBeNull();
    });
  });

  describe('isGoodreadsBookUrl', () => {
    it('should identify Goodreads book URLs', () => {
      const result = UrlValidator.isGoodreadsBookUrl(
        'https://www.goodreads.com/book/show/123456.Book_Title'
      );

      expect(result).toBe(true);
    });

    it('should reject non-book URLs', () => {
      const result = UrlValidator.isGoodreadsBookUrl(
        'https://www.goodreads.com/user/show/12345'
      );

      expect(result).toBe(false);
    });
  });
});
