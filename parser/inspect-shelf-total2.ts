import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function inspectShelfTotal() {
  const url = 'https://www.goodreads.com/review/list/172435467?shelf=read&per_page=100&page=1';

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    // Save full HTML for manual inspection
    fs.writeFileSync('/tmp/shelf-page.html', response.data);
    console.log('Saved HTML to /tmp/shelf-page.html');

    const $ = cheerio.load(response.data);

    // Look for specific text patterns in the body
    const bodyText = $('body').text();

    // Extract lines containing numbers and "book"
    const lines = bodyText.split('\n');
    const relevantLines = lines
      .map(l => l.trim())
      .filter(l => l.length > 0 && l.length < 200)
      .filter(l => l.match(/\d/) && l.toLowerCase().includes('book'));

    console.log('\n=== Lines containing numbers and "book" ===\n');
    relevantLines.forEach((line, i) => {
      console.log(`[${i}] ${line}`);
    });

    // Try specific selectors I know from library pages
    console.log('\n=== Specific selectors ===\n');

    const h1 = $('h1').first().text().trim();
    console.log(`h1: ${h1}`);

    const headerText = $('.leftContainer .h2Container').text().trim();
    console.log(`header: ${headerText}`);

    // Table header
    const tableHeader = $('#booksBody').prev().text().trim();
    console.log(`table header area: ${tableHeader.substring(0, 200)}`);

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

inspectShelfTotal();
