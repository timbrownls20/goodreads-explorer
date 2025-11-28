import 'reflect-metadata';
import { Book, LiteraryAward } from '../models/book.model';
import { Shelf, ReadingStatus } from '../models/shelf.model';
import { ReadRecord, Review, UserBookRelation } from '../models/user-book.model';
import { Library } from '../models/library.model';

describe('Parser Models', () => {
  describe('Book', () => {
    it('should create a book with valid data', () => {
      const book = new Book({
        goodreadsId: '123456',
        title: '  Test Book  ',
        author: '  Test Author  ',
        goodreadsUrl: 'https://www.goodreads.com/book/show/123456',
      });

      expect(book.title).toBe('Test Book');
      expect(book.author).toBe('Test Author');
      expect(book.goodreadsId).toBe('123456');
    });

    it('should normalize genres', () => {
      const book = new Book({
        goodreadsId: '123456',
        title: 'Test Book',
        author: 'Test Author',
        goodreadsUrl: 'https://www.goodreads.com/book/show/123456',
        genres: ['Fiction', 'MYSTERY', 'fiction', 'Mystery'],
      });

      expect(book.genres).toEqual(['fiction', 'mystery']);
    });
  });

  describe('ReadRecord', () => {
    it('should create a read record with both dates null', () => {
      const record = new ReadRecord({
        dateStarted: null,
        dateFinished: null,
      });

      expect(record.dateStarted).toBeNull();
      expect(record.dateFinished).toBeNull();
    });

    it('should accept valid date ordering', () => {
      const record = new ReadRecord({
        dateStarted: '2023-01-01',
        dateFinished: '2023-12-31',
      });

      expect(record.dateStarted).toBe('2023-01-01');
      expect(record.dateFinished).toBe('2023-12-31');
    });

    it('should throw error for invalid date ordering', () => {
      expect(() => {
        new ReadRecord({
          dateStarted: '2023-12-31',
          dateFinished: '2023-01-01',
        });
      }).toThrow();
    });
  });

  describe('Library', () => {
    it('should create a library with user books', () => {
      const book = new Book({
        goodreadsId: '123456',
        title: 'Test Book',
        author: 'Test Author',
        goodreadsUrl: 'https://www.goodreads.com/book/show/123456',
      });

      const userBook = new UserBookRelation({
        book,
        userRating: 5,
        readingStatus: ReadingStatus.READ,
        shelves: ['read'],
        readRecords: [new ReadRecord({ dateStarted: null, dateFinished: null })],
      });

      const library = new Library({
        userId: '12345',
        username: 'testuser',
        profileUrl: 'https://www.goodreads.com/user/show/12345',
        userBooks: [userBook],
        scrapedAt: new Date().toISOString(),
      });

      expect(library.totalBooks).toBe(1);
      expect(library.userId).toBe('12345');
    });

    it('should filter books by status', () => {
      const book1 = new Book({
        goodreadsId: '123456',
        title: 'Book 1',
        author: 'Author 1',
        goodreadsUrl: 'https://www.goodreads.com/book/show/123456',
      });

      const book2 = new Book({
        goodreadsId: '789012',
        title: 'Book 2',
        author: 'Author 2',
        goodreadsUrl: 'https://www.goodreads.com/book/show/789012',
      });

      const userBook1 = new UserBookRelation({
        book: book1,
        readingStatus: ReadingStatus.READ,
        shelves: [],
        readRecords: [],
      });

      const userBook2 = new UserBookRelation({
        book: book2,
        readingStatus: ReadingStatus.TO_READ,
        shelves: [],
        readRecords: [],
      });

      const library = new Library({
        userId: '12345',
        username: 'testuser',
        profileUrl: 'https://www.goodreads.com/user/show/12345',
        userBooks: [userBook1, userBook2],
        scrapedAt: new Date().toISOString(),
      });

      const readBooks = library.getBooksByStatus(ReadingStatus.READ);
      expect(readBooks.length).toBe(1);
      expect(readBooks[0].book.title).toBe('Book 1');
    });
  });
});
