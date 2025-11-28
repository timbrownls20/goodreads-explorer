import { DataValidator } from '../validators/data-validator';

describe('DataValidator', () => {
  describe('validateRating', () => {
    it('should accept valid ratings', () => {
      expect(DataValidator.validateRating(1)).toBe(true);
      expect(DataValidator.validateRating(3)).toBe(true);
      expect(DataValidator.validateRating(5)).toBe(true);
    });

    it('should accept null ratings', () => {
      expect(DataValidator.validateRating(null)).toBe(true);
      expect(DataValidator.validateRating(undefined)).toBe(true);
    });

    it('should reject invalid ratings', () => {
      expect(DataValidator.validateRating(0)).toBe(false);
      expect(DataValidator.validateRating(6)).toBe(false);
      expect(DataValidator.validateRating(-1)).toBe(false);
    });
  });

  describe('sanitizeText', () => {
    it('should trim whitespace', () => {
      expect(DataValidator.sanitizeText('  hello  ')).toBe('hello');
    });

    it('should return null for empty strings', () => {
      expect(DataValidator.sanitizeText('   ')).toBeNull();
      expect(DataValidator.sanitizeText('')).toBeNull();
    });

    it('should return null for null input', () => {
      expect(DataValidator.sanitizeText(null)).toBeNull();
    });
  });

  describe('validateIsbn', () => {
    it('should accept valid ISBN-10', () => {
      expect(DataValidator.validateIsbn('0123456789')).toBe(true);
      expect(DataValidator.validateIsbn('012345678X')).toBe(true);
    });

    it('should accept valid ISBN-13', () => {
      expect(DataValidator.validateIsbn('9780123456789')).toBe(true);
    });

    it('should accept ISBN with hyphens', () => {
      expect(DataValidator.validateIsbn('978-0-123-45678-9')).toBe(true);
    });

    it('should accept null ISBN', () => {
      expect(DataValidator.validateIsbn(null)).toBe(true);
    });

    it('should reject invalid ISBN', () => {
      expect(DataValidator.validateIsbn('123')).toBe(false);
      expect(DataValidator.validateIsbn('abcdefghij')).toBe(false);
    });
  });

  describe('validatePageCount', () => {
    it('should accept positive page counts', () => {
      expect(DataValidator.validatePageCount(100)).toBe(true);
      expect(DataValidator.validatePageCount(1)).toBe(true);
    });

    it('should accept null page counts', () => {
      expect(DataValidator.validatePageCount(null)).toBe(true);
    });

    it('should reject negative or zero page counts', () => {
      expect(DataValidator.validatePageCount(0)).toBe(false);
      expect(DataValidator.validatePageCount(-10)).toBe(false);
    });

    it('should reject non-integer page counts', () => {
      expect(DataValidator.validatePageCount(10.5)).toBe(false);
    });
  });

  describe('normalizeGenres', () => {
    it('should lowercase genres', () => {
      const result = DataValidator.normalizeGenres(['Fiction', 'MYSTERY']);
      expect(result).toEqual(['fiction', 'mystery']);
    });

    it('should deduplicate genres', () => {
      const result = DataValidator.normalizeGenres(['fiction', 'Fiction', 'FICTION']);
      expect(result).toEqual(['fiction']);
    });

    it('should remove empty genres', () => {
      const result = DataValidator.normalizeGenres(['fiction', '', '  ', 'mystery']);
      expect(result).toEqual(['fiction', 'mystery']);
    });

    it('should limit to 50 genres', () => {
      const genres = Array.from({ length: 100 }, (_, i) => `genre-${i}`);
      const result = DataValidator.normalizeGenres(genres);
      expect(result.length).toBe(50);
    });
  });

  describe('validateDateOrdering', () => {
    it('should accept valid date ordering', () => {
      expect(DataValidator.validateDateOrdering('2023-01-01', '2023-12-31')).toBe(true);
      expect(DataValidator.validateDateOrdering('2023-01-01', '2023-01-01')).toBe(true);
    });

    it('should reject invalid date ordering', () => {
      expect(DataValidator.validateDateOrdering('2023-12-31', '2023-01-01')).toBe(false);
    });

    it('should accept null dates', () => {
      expect(DataValidator.validateDateOrdering(null, '2023-01-01')).toBe(true);
      expect(DataValidator.validateDateOrdering('2023-01-01', null)).toBe(true);
      expect(DataValidator.validateDateOrdering(null, null)).toBe(true);
    });
  });
});
