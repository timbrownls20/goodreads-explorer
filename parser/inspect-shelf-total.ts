import axios from 'axios';
import * as cheerio from 'cheerio';

async function inspectShelfTotal() {
  const url = 'https://www.goodreads.com/review/list/172435467?shelf=read&per_page=100&page=1';

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Look for text containing book count
    const possibleSelectors = [
      '.listWithDividers__item',
      '.h2Container',
      '.smallText',
      '.greyText',
      'div:contains("books")',
      'span:contains("books")',
      'p:contains("books")',
      '.showing'
    ];

    console.log('=== Searching for shelf total ===\n');

    for (const selector of possibleSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`\nSelector: ${selector} (${elements.length} matches)`);
        elements.each((i, el) => {
          const text = $(el).text().trim();
          if (text.length < 200 && (text.includes('book') || text.includes('show'))) {
            console.log(`  [${i}] ${text}`);
          }
        });
      }
    }

    // Look for specific patterns
    console.log('\n=== Looking for count patterns ===\n');
    const bodyText = $('body').text();
    const patterns = [
      /showing\s+\d+.*?of\s+(\d+)/i,
      /\d+.*?of\s+(\d+)\s+book/i,
      /(\d+)\s+books\s+total/i
    ];

    for (const pattern of patterns) {
      const match = bodyText.match(pattern);
      if (match) {
        console.log(`Pattern ${pattern}: ${match[0]}`);
        console.log(`  Extracted total: ${match[1]}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

inspectShelfTotal();
