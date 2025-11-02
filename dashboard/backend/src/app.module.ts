import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { HealthController } from './controllers/health.controller';
import { LibraryController } from './controllers/library.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { FileParserService } from './services/file-parser.service';
import { AnalyticsEngineService } from './services/analytics-engine.service';
import { User } from './entities/user.entity';
import { Library } from './entities/library.entity';
import { Book } from './entities/book.entity';

@Module({
  imports: [
    // Configuration module (loads .env)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // TypeORM module (PostgreSQL connection)
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),

    // Register entities for dependency injection
    TypeOrmModule.forFeature([User, Library, Book]),
  ],
  controllers: [HealthController, LibraryController, AnalyticsController],
  providers: [FileParserService, AnalyticsEngineService],
})
export class AppModule {}
