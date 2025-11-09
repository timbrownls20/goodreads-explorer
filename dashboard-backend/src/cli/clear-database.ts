#!/usr/bin/env node
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Book } from '../models/book.model';
import { Genre } from '../models/genre.model';
import { BookGenre } from '../models/book-genre.model';
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
    const bookModel = app.get<typeof Book>('BookRepository');
    const genreModel = app.get<typeof Genre>('GenreRepository');
    const libraryModel = app.get<typeof Library>('LibraryRepository');

    // Delete in order to avoid foreign key constraint violations
    console.log('🗑️  Deleting book-genre relationships...');
    const bookGenresDeleted = await bookGenreModel.destroy({ where: {} });
    console.log(`   ✓ Deleted ${bookGenresDeleted} book-genre relationships`);

    console.log('🗑️  Deleting books...');
    const booksDeleted = await bookModel.destroy({ where: {} });
    console.log(`   ✓ Deleted ${booksDeleted} books`);

    console.log('🗑️  Deleting genres...');
    const genresDeleted = await genreModel.destroy({ where: {} });
    console.log(`   ✓ Deleted ${genresDeleted} genres`);

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
