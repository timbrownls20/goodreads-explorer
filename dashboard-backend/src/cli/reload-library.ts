#!/usr/bin/env node
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { LibraryImportService } from '../services/library-import.service';
import { Book } from '../models/book.model';
import * as fs from 'fs';
import * as path from 'path';

interface CliOptions {
  folder: string;
  libraryName: string;
  clear?: boolean;
}

async function parseArguments(): Promise<CliOptions> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run cli:reload -- <folder> [options]

Arguments:
  folder              Path to folder containing JSON library files

Options:
  --library-name <name>  Override library name (defaults to folder name)
  --clear                Clear existing library data before reload
  --help, -h             Show this help message

Examples:
  npm run cli:reload -- /path/to/library/folder
  npm run cli:reload -- /path/to/tim-brown_library
  npm run cli:reload -- /path/to/library/folder --library-name my-library
  npm run cli:reload -- /path/to/library/folder --clear
`);
    process.exit(0);
  }

  const folder = args[0];

  if (!folder) {
    console.error('❌ Error: Folder path is required');
    process.exit(1);
  }

  if (!fs.existsSync(folder)) {
    console.error(`❌ Error: Folder does not exist: ${folder}`);
    process.exit(1);
  }

  if (!fs.statSync(folder).isDirectory()) {
    console.error(`❌ Error: Path is not a directory: ${folder}`);
    process.exit(1);
  }

  // Extract library name from folder path (e.g., "tim-brown_library" from "/path/to/tim-brown_library")
  const defaultLibraryName = path.basename(folder);
  const libraryName = args.includes('--library-name')
    ? args[args.indexOf('--library-name') + 1]
    : defaultLibraryName;

  const clear = args.includes('--clear');

  return { folder, libraryName, clear };
}

async function getJsonFiles(folderPath: string): Promise<string[]> {
  const files = fs.readdirSync(folderPath);
  return files
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(folderPath, file));
}

async function bootstrap() {
  const options = await parseArguments();

  console.log('🚀 Starting library reload...');
  console.log(`📁 Folder: ${options.folder}`);
  console.log(`📚 Library Name: ${options.libraryName}`);
  console.log(`🗑️  Clear existing: ${options.clear ? 'Yes' : 'No'}`);
  console.log('');

  // Bootstrap NestJS app (without HTTP server)
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    // Get services
    const libraryImportService = app.get(LibraryImportService);
    const bookModel = app.get<typeof Book>('BookRepository');

    // Get JSON files
    const jsonFiles = await getJsonFiles(options.folder);
    console.log(`📄 Found ${jsonFiles.length} JSON files`);
    console.log('');

    if (jsonFiles.length === 0) {
      console.log('⚠️  No JSON files found in folder');
      await app.close();
      process.exit(0);
    }

    // Clear existing library data if requested
    if (options.clear) {
      console.log('🗑️  Clearing existing library data...');
      // TODO: Implement library data clearing if needed
    }

    // Convert file paths to Multer.File objects
    console.log('📖 Loading and importing files...');
    const files = jsonFiles.map(filePath => ({
      buffer: fs.readFileSync(filePath),
      originalname: path.basename(filePath),
      fieldname: 'files',
      encoding: '7bit',
      mimetype: 'application/json',
      size: fs.statSync(filePath).size,
    } as Express.Multer.File));

    // Use shared import service
    const result = await libraryImportService.importLibrary(
      files,
      options.libraryName,
      options.folder,
    );

    // Display results
    console.log(`✅ Successfully imported: ${result.stats.booksImported}/${result.stats.filesProcessed}`);
    if (result.stats.filesSkipped > 0) {
      console.log(`❌ Failed to parse: ${result.stats.filesSkipped}`);
      if (result.errors.length > 0) {
        console.log('');
        console.log('Failed files:');
        result.errors.forEach(error => {
          console.log(`  - ${error.file}`);
          console.log(`    Errors: ${error.error}`);
        });
        console.log('');
      }
    }

    // Get final counts
    const totalBooks = await bookModel.count({
      where: { libraryId: result.libraryId },
    });

    console.log('');
    console.log('✨ Library reload complete!');
    console.log(`📊 Total books in library: ${totalBooks}`);
    console.log(`📚 Library Name: ${options.libraryName}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error reloading library:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
