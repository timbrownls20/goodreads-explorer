import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { Library } from '../models/library.model';
import { Book } from '../models/book.model';
import { Genre } from '../models/genre.model';
import { BookGenre } from '../models/book-genre.model';
import { Shelf } from '../models/shelf.model';
import { BookShelf } from '../models/book-shelf.model';
import { LiteraryAward } from '../models/literary-award.model';
import { BookLiteraryAward } from '../models/book-literary-award.model';

export const databaseConfig = (): SequelizeModuleOptions => ({
  dialect: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'analytics_user',
  password: process.env.POSTGRES_PASSWORD || '',
  database: process.env.POSTGRES_DB || 'analytics',
  // Junction tables (BookGenre, BookShelf, BookLiteraryAward) must come before Book, Genre, Shelf, and LiteraryAward
  models: [
    Library,
    BookGenre,
    BookShelf,
    BookLiteraryAward,
    Book,
    Genre,
    Shelf,
    LiteraryAward,
  ],
  autoLoadModels: true,
  synchronize: process.env.NODE_ENV === 'development', // Auto-sync in dev only
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions:
    process.env.NODE_ENV === 'production'
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
});
