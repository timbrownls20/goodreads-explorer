import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

const missingIds: string[] = JSON.parse(
  fs.readFileSync('/tmp/missing-from-all-shelf.json', 'utf-8')
);

async function checkWhichShelvesHaveMissingBooks() {
  const userId = '172435467';
  const shelves = ['to-read', 'currently-reading', 'read', 'did-not-finish', 'paused', 'reference', 'to-read-next', 'to-read-owned'];

  console.log('Checking which shelves contain the missing books...\n');

  for (const shelf of shelves) {
    const foundInShelf: string[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 100) { // Safety limit
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
          break;
        }

        rows.forEach(row => {
          const bookLink = $(row).find('.title a').attr('href');
          if (bookLink) {
            const match = bookLink.match(/\/show\/(\d+)/);
            if (match && missingIds.includes(match[1])) {
              foundInShelf.push(match[1]);
            }
          }
        });

        const nextLink = $('.next_page').attr('href');
        hasMore = !!nextLink && !$('.next_page').hasClass('disabled');

        page++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`Error on ${shelf} page ${page}:`, error.message);
        break;
      }
    }

    if (foundInShelf.length > 0) {
      console.log(`${shelf}: Found ${foundInShelf.length} missing books on page range checked`);
      console.log(`  IDs: ${foundInShelf.slice(0, 5).join(', ')}${foundInShelf.length > 5 ? '...' : ''}`);
    }
  }
}

checkWhichShelvesHaveMissingBooks();
