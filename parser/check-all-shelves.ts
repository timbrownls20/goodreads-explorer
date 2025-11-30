import axios from 'axios';
import * as cheerio from 'cheerio';

async function checkAllShelves() {
  const url = 'https://www.goodreads.com/review/list/172435467?shelf=all&per_page=100&page=1';

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    console.log('=== All Shelves (including custom) ===\n');

    // Find all shelf links
    const shelfList = $('#paginatedShelfList');
    shelfList.find('a').each((i: number, el: any) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && href.includes('shelf=')) {
        console.log(text);
      }
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkAllShelves();
