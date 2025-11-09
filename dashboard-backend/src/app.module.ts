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
import { Genre } from './models/genre.model';
import { BookGenre } from './models/book-genre.model';

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
    // Note: BookGenre must come before Book and Genre since they reference it
    SequelizeModule.forFeature([Library, BookGenre, Book, Genre]),
  ],
  controllers: [HealthController, LibraryController, AnalyticsController],
  providers: [FileParserService, AnalyticsEngineService, LibraryImportService],
})
export class AppModule {}
