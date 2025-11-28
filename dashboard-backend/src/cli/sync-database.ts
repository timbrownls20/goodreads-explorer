#!/usr/bin/env ts-node
import * as dotenv from 'dotenv';
import { Sequelize } from 'sequelize-typescript';
import { Book } from '../models/book.model';
import { Library } from '../models/library.model';
import { Genre } from '../models/genre.model';
import { BookGenre } from '../models/book-genre.model';
import { Shelf } from '../models/shelf.model';
import { BookShelf } from '../models/book-shelf.model';
import { LiteraryAward } from '../models/literary-award.model';
import { BookLiteraryAward } from '../models/book-literary-award.model';

// Load environment variables from .env file
dotenv.config({ path: '../.env' });

async function syncDatabase() {
  console.log('🔄 Syncing database schema...');

  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    username: process.env.POSTGRES_USER || 'analytics_user',
    password: process.env.POSTGRES_PASSWORD || 'analytics_password',
    database: process.env.POSTGRES_DB || 'analytics',
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
    logging: false,
  });

  try {
    // Sync with alter: true to add new columns without dropping tables
    await sequelize.sync({ alter: true });

    console.log('✅ Database schema synced successfully!');
    console.log('');
    console.log('New column added:');
    console.log('  - books.original_json (JSONB) - stores raw JSON from import files');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing database:', error);
    await sequelize.close();
    process.exit(1);
  }
}

syncDatabase();
