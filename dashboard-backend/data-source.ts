import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'analytics_user',
  password: process.env.POSTGRES_PASSWORD || '',
  database: process.env.POSTGRES_DB || 'analytics',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/**/*.ts'],
  synchronize: false, // Never use synchronize with migrations
  logging: ['error', 'warn'],
});
