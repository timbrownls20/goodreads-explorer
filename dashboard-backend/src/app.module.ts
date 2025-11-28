import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { databaseConfig } from './config/database.config';
import { HealthController } from './controllers/health.controller';
import { LibraryController } from './controllers/library.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { FileParserService } from './services/file-parser.service';
import { AnalyticsEngineService } from './services/analytics-engine.service';
import { LibraryImportService } from './services/library-import.service';
import { Library } from './models/library.model';
import { Book } from './models/book.model';
import { BookRead } from './models/book-read.model';
import { Genre } from './models/genre.model';
import { BookGenre } from './models/book-genre.model';
import { Shelf } from './models/shelf.model';
import { BookShelf } from './models/book-shelf.model';
import { LiteraryAward } from './models/literary-award.model';
import { BookLiteraryAward } from './models/book-literary-award.model';

@Module({
  imports: [
    // Configuration module (loads .env)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Sequelize module (PostgreSQL connection)
    SequelizeModule.forRootAsync({
      useFactory: databaseConfig,
    }),

    // Register models for dependency injection
    // Note: Junction tables must come before their related models
    SequelizeModule.forFeature([
      Library,
      BookGenre,
      BookShelf,
      BookLiteraryAward,
      Book,
      BookRead,
      Genre,
      Shelf,
      LiteraryAward,
    ]),
  ],
  controllers: [HealthController, LibraryController, AnalyticsController],
  providers: [FileParserService, AnalyticsEngineService, LibraryImportService],
})
export class AppModule {}
