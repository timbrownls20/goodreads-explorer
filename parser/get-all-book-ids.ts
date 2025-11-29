import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getAllBookIds() {
  const userId = '172435467';
  const shelves = ['to-read', 'currently-reading', 'read', 'did-not-finish', 'paused', 'reference', 'to-read-next', 'to-read-owned'];

  const allBookIds = new Set<string>();

  for (const shelf of shelves) {
    console.log(`Fetching ${shelf}...`);
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
          const bookId = $(row).attr('id')?.replace('review_', '');
          if (bookId) {
            // Extract the actual Goodreads book ID from the book link
            const bookLink = $(row).find('.title a').attr('href');
            if (bookLink) {
              const match = bookLink.match(/\/show\/(\d+)/);
              if (match) {
                allBookIds.add(match[1]);
              }
            }
          }
        });

        console.log(`  Page ${page}: ${rows.length} books (total so far: ${allBookIds.size})`);

        // Check if there's a next page
        const nextLink = $('.next_page').attr('href');
        hasMore = !!nextLink && !$('.next_page').hasClass('disabled');

        page++;
        await delay(1000); // Rate limiting
      } catch (error) {
        console.error(`Error fetching ${shelf} page ${page}:`, error);
        hasMore = false;
      }
    }
  }

  return Array.from(allBookIds).sort();
}

async function compareWithExisting(allBookIds: string[]) {
  const outputDir = '/Users/timbrown/Development/goodreads-explorer/parser/output/172435467-tim-brown';
  const existingFiles = fs.readdirSync(outputDir);

  const existingIds = new Set<string>();
  existingFiles.forEach(file => {
    if (file.endsWith('.json')) {
      // Extract book ID from filename (first part before first dot or hyphen)
      const match = file.match(/^(\d+)/);
      if (match) {
        existingIds.add(match[1]);
      }
    }
  });

  console.log(`\n=== Summary ===`);
  console.log(`Total books on Goodreads: ${allBookIds.length}`);
  console.log(`Total files in output: ${existingIds.size}`);

  const missing = allBookIds.filter(id => !existingIds.has(id));
  console.log(`Missing books: ${missing.length}`);

  if (missing.length > 0) {
    console.log(`\nMissing book IDs:`);
    missing.forEach(id => console.log(id));

    // Save to file
    fs.writeFileSync('/tmp/missing-books.txt', missing.join('\n'));
    console.log(`\nMissing IDs saved to /tmp/missing-books.txt`);
  }
}

(async () => {
  const allIds = await getAllBookIds();
  await compareWithExisting(allIds);
})();
