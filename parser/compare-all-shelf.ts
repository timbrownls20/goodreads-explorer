import * as fs from 'fs';
import * as path from 'path';

// Load all book IDs from the "All" shelf JSON
const allShelfIds: string[] = JSON.parse(
  fs.readFileSync('/tmp/all-shelf-book-ids.json', 'utf-8')
);

// Get all scraped file names
const outputDir = '/Users/timbrown/Development/goodreads-explorer/parser/output/172435467-tim-brown';
const scrapedFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.json'));

// Extract book IDs from filenames
const scrapedIds = new Set<string>();
scrapedFiles.forEach(file => {
  const match = file.match(/^(\d+)/);
  if (match) {
    scrapedIds.add(match[1]);
  }
});

// Find missing books
const missingIds = allShelfIds.filter(id => !scrapedIds.has(id));

console.log(`Total book IDs from "All" shelf: ${allShelfIds.length}`);
console.log(`Total scraped files: ${scrapedIds.size}`);
console.log(`Missing books: ${missingIds.length}`);

if (missingIds.length > 0) {
  console.log(`\nMissing book IDs:`);
  missingIds.forEach(id => console.log(id));
  
  // Save missing IDs
  fs.writeFileSync('/tmp/missing-from-all-shelf.json', JSON.stringify(missingIds, null, 2));
  console.log(`\nMissing IDs saved to /tmp/missing-from-all-shelf.json`);
}
