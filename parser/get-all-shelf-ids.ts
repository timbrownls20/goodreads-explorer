import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function getAllShelfBookIds() {
  const userId = '172435467';
  const shelf = '%23ALL%23'; // The "All" shelf
  const allBookIds = new Set<string>();

  console.log('Fetching All shelf...');

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `https://www.goodreads.com/review/list/${userId}?shelf=${shelf}&per_page=100&page=${page}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const rows = $('#booksBody .bookalike').toArray();

      if (rows.length === 0) {
        hasMore = false;
        break;
      }

      rows.forEach(row => {
        // Extract the actual Goodreads book ID from the book link
        const bookLink = $(row).find('.title a').attr('href');
        if (bookLink) {
          const match = bookLink.match(/\/show\/(\d+)/);
          if (match) {
            allBookIds.add(match[1]);
          }
        }
      });

      console.log(`  Page ${page}: ${rows.length} books (total so far: ${allBookIds.size})`);

      // Check if there's a next page
      const nextLink = $('.next_page').attr('href');
      hasMore = !!nextLink && !$('.next_page').hasClass('disabled');

      page++;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    } catch (error: any) {
      console.error(`Error fetching page ${page}:`, error.message);
      hasMore = false;
    }
  }

  const bookIdsArray = Array.from(allBookIds).sort((a, b) => parseInt(a) - parseInt(b));

  // Save to JSON file
  const outputPath = '/tmp/all-shelf-book-ids.json';
  fs.writeFileSync(outputPath, JSON.stringify(bookIdsArray, null, 2));

  console.log(`\n=== Summary ===`);
  console.log(`Total unique book IDs from "All" shelf: ${bookIdsArray.length}`);
  console.log(`Saved to: ${outputPath}`);

  return bookIdsArray;
}

getAllShelfBookIds();
