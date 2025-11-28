import { scrapeLibrary } from '../src/api';
import {
  PrivateProfileError,
  InvalidURLError,
  NetworkError,
  RateLimitError,
  ScrapingError,
} from '../src/exceptions/parser-exceptions';

async function handleErrors() {
  const testUrl = 'https://www.goodreads.com/user/show/12345-username';

  try {
    const library = await scrapeLibrary(testUrl, {
      limit: 10,
      rateLimitDelay: 1000,
      maxRetries: 3,
      timeout: 30000,
    });

    console.log(`Successfully scraped ${library.totalBooks} books`);
  } catch (error) {
    // Handle specific error types
    if (error instanceof PrivateProfileError) {
      console.error('❌ This profile is private and cannot be scraped.');
      console.error('   Ask the user to make their profile public in Goodreads settings.');
    } else if (error instanceof InvalidURLError) {
      console.error('❌ Invalid Goodreads URL provided.');
      console.error('   Expected format: https://www.goodreads.com/user/show/USER_ID');
    } else if (error instanceof RateLimitError) {
      console.error('❌ Rate limit exceeded.');
      console.error('   Try increasing the --rate-limit delay.');
    } else if (error instanceof NetworkError) {
      console.error('❌ Network error occurred:', error.message);
      console.error('   Check your internet connection and try again.');
    } else if (error instanceof ScrapingError) {
      console.error('❌ Failed to parse HTML:', error.message);
      console.error('   Goodreads may have changed their page structure.');
    } else {
      console.error('❌ Unexpected error:', error);
    }

    // Exit with error code
    process.exit(1);
  }
}

// Example with retry logic
async function retryExample() {
  const maxAttempts = 3;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      attempt++;
      console.log(`Attempt ${attempt}/${maxAttempts}...`);

      const library = await scrapeLibrary(
        'https://www.goodreads.com/user/show/12345-username',
        {
          limit: 10,
          rateLimitDelay: 2000, // Slower to avoid issues
        }
      );

      console.log('✓ Success!');
      return library;
    } catch (error) {
      console.error(`✗ Attempt ${attempt} failed:`, error.message);

      if (attempt >= maxAttempts) {
        console.error('Max attempts reached. Giving up.');
        throw error;
      }

      // Wait before retrying
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Example with graceful degradation
async function gracefulExample() {
  try {
    // Try with default settings
    const library = await scrapeLibrary(
      'https://www.goodreads.com/user/show/12345-username',
      { limit: 100 }
    );
    console.log('✓ Scraped all books');
    return library;
  } catch (error) {
    if (error instanceof RateLimitError) {
      console.warn('⚠ Hit rate limit. Retrying with slower speed...');

      // Retry with slower rate limit
      const library = await scrapeLibrary(
        'https://www.goodreads.com/user/show/12345-username',
        {
          limit: 100,
          rateLimitDelay: 3000, // Much slower
        }
      );
      console.log('✓ Scraped with slower rate limit');
      return library;
    }
    throw error; // Re-throw if not rate limit error
  }
}

// Run example
// handleErrors();
// retryExample();
// gracefulExample();
