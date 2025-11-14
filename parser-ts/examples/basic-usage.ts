import { scrapeLibrary, scrapeAndExport } from '../src/api';

async function basicExample() {
  console.log('Example 1: Basic scraping');

  // Just scrape the library
  const library = await scrapeLibrary(
    'https://www.goodreads.com/user/show/12345-username',
    {
      limit: 10, // Just scrape first 10 books for demo
      rateLimitDelay: 1000,
    }
  );

  console.log(`Scraped ${library.totalBooks} books from ${library.username}`);
  console.log(`Read books: ${library.getBooksByStatus('read').length}`);
  console.log(`Currently reading: ${library.getBooksByStatus('currently-reading').length}`);
  console.log(`To read: ${library.getBooksByStatus('to-read').length}`);
}

async function exportExample() {
  console.log('\nExample 2: Scrape and export to JSON');

  const library = await scrapeAndExport(
    'https://www.goodreads.com/user/show/12345-username',
    {
      outputFormat: 'json',
      outputPath: './my-library.json',
      limit: 10,
      progressCallback: (current, total) => {
        console.log(`Progress: ${current} books scraped`);
      },
    }
  );

  console.log(`Library saved to my-library.json`);
}

async function csvExample() {
  console.log('\nExample 3: Export to CSV');

  await scrapeAndExport(
    'https://www.goodreads.com/user/show/12345-username',
    {
      outputFormat: 'csv',
      outputPath: './my-library.csv',
      limit: 10,
    }
  );

  console.log('Library saved to my-library.csv');
}

async function advancedExample() {
  console.log('\nExample 4: Advanced usage with filtering');

  const library = await scrapeLibrary(
    'https://www.goodreads.com/user/show/12345-username',
    {
      limit: 100,
      rateLimitDelay: 1500, // Slower rate limiting
      maxRetries: 5, // More retries
    }
  );

  // Get all 5-star books
  const fiveStarBooks = library.getBooksWithRating(5, 5);
  console.log(`\nFound ${fiveStarBooks.length} 5-star books:`);
  fiveStarBooks.slice(0, 5).forEach(ub => {
    console.log(`- ${ub.book.title} by ${ub.book.author}`);
  });

  // Get books on a specific shelf
  const fictionBooks = library.getBooksByShelf('fiction');
  console.log(`\nFound ${fictionBooks.length} fiction books`);

  // Get books with reviews
  const reviewedBooks = library.getBooksWithReviews();
  console.log(`\nFound ${reviewedBooks.length} books with reviews`);
}

// Run examples
async function main() {
  try {
    // Uncomment the example you want to run
    // await basicExample();
    // await exportExample();
    // await csvExample();
    // await advancedExample();

    console.log('\nAll examples completed!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Uncomment to run
// main();
