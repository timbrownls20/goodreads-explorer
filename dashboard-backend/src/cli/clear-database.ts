#!/usr/bin/env node
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Book } from '../models/book.model';
import { Genre } from '../models/genre.model';
import { BookGenre } from '../models/book-genre.model';
import { Shelf } from '../models/shelf.model';
import { BookShelf } from '../models/book-shelf.model';
import { Library } from '../models/library.model';

async function bootstrap() {
  console.log('🗑️  Starting database clear...');
  console.log('');

  // Bootstrap NestJS app (without HTTP server)
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    // Get model repositories
    const bookGenreModel = app.get<typeof BookGenre>('BookGenreRepository');
    const bookShelfModel = app.get<typeof BookShelf>('BookShelfRepository');
    const bookModel = app.get<typeof Book>('BookRepository');
    const genreModel = app.get<typeof Genre>('GenreRepository');
    const shelfModel = app.get<typeof Shelf>('ShelfRepository');
    const libraryModel = app.get<typeof Library>('LibraryRepository');

    // Delete in order to avoid foreign key constraint violations
    console.log('🗑️  Deleting book-genre relationships...');
    const bookGenresDeleted = await bookGenreModel.destroy({ where: {} });
    console.log(`   ✓ Deleted ${bookGenresDeleted} book-genre relationships`);

    console.log('🗑️  Deleting book-shelf relationships...');
    const bookShelvesDeleted = await bookShelfModel.destroy({ where: {} });
    console.log(`   ✓ Deleted ${bookShelvesDeleted} book-shelf relationships`);

    console.log('🗑️  Deleting books...');
    const booksDeleted = await bookModel.destroy({ where: {} });
    console.log(`   ✓ Deleted ${booksDeleted} books`);

    console.log('🗑️  Deleting genres...');
    const genresDeleted = await genreModel.destroy({ where: {} });
    console.log(`   ✓ Deleted ${genresDeleted} genres`);

    console.log('🗑️  Deleting shelves...');
    const shelvesDeleted = await shelfModel.destroy({ where: {} });
    console.log(`   ✓ Deleted ${shelvesDeleted} shelves`);

    console.log('🗑️  Deleting libraries...');
    const librariesDeleted = await libraryModel.destroy({ where: {} });
    console.log(`   ✓ Deleted ${librariesDeleted} libraries`);

    console.log('');
    console.log('✨ Database cleared successfully!');
    console.log('');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
