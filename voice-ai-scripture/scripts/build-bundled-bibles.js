const fs = require('fs');
const path = require('path');
const https = require('https');

const CANON_66 = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA',
  '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
  'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO',
  'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH',
  'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS',
  '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'
];

const WEB_FILES = {
  'GEN': 'genesis.json', 'EXO': 'exodus.json', 'LEV': 'leviticus.json', 'NUM': 'numbers.json', 'DEU': 'deuteronomy.json',
  'JOS': 'joshua.json', 'JDG': 'judges.json', 'RUT': 'ruth.json', '1SA': '1samuel.json', '2SA': '2samuel.json',
  '1KI': '1kings.json', '2KI': '2kings.json', '1CH': '1chronicles.json', '2CH': '2chronicles.json', 'EZR': 'ezra.json',
  'NEH': 'nehemiah.json', 'EST': 'esther.json', 'JOB': 'job.json', 'PSA': 'psalms.json', 'PRO': 'proverbs.json',
  'ECC': 'ecclesiastes.json', 'SNG': 'songofsolomon.json', 'ISA': 'isaiah.json', 'JER': 'jeremiah.json', 'LAM': 'lamentations.json',
  'EZK': 'ezekiel.json', 'DAN': 'daniel.json', 'HOS': 'hosea.json', 'JOL': 'joel.json', 'AMO': 'amos.json',
  'OBA': 'obadiah.json', 'JON': 'jonah.json', 'MIC': 'micah.json', 'NAM': 'nahum.json', 'HAB': 'habakkuk.json',
  'ZEP': 'zephaniah.json', 'HAG': 'haggai.json', 'ZEC': 'zechariah.json', 'MAL': 'malachi.json',
  'MAT': 'matthew.json', 'MRK': 'mark.json', 'LUK': 'luke.json', 'JHN': 'john.json', 'ACT': 'acts.json',
  'ROM': 'romans.json', '1CO': '1corinthians.json', '2CO': '2corinthians.json', 'GAL': 'galatians.json', 'EPH': 'ephesians.json',
  'PHP': 'philippians.json', 'COL': 'colossians.json', '1TH': '1thessalonians.json', '2TH': '2thessalonians.json',
  '1TI': '1timothy.json', '2TI': '2timothy.json', 'TIT': 'titus.json', 'PHM': 'philemon.json', 'HEB': 'hebrews.json',
  'JAS': 'james.json', '1PE': '1peter.json', '2PE': '2peter.json', '1JN': '1john.json', '2JN': '2john.json',
  '3JN': '3john.json', 'JUD': 'jude.json', 'REV': 'revelation.json'
};

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`Failed to fetch ${url}, status: ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (data.charCodeAt(0) === 0xFEFF) {
          data = data.slice(1);
        }
        resolve(data);
      });
    }).on('error', reject);
  });
}

async function buildAlmeida() {
  console.log('Downloading Almeida (pt_aa.json)...');
  const raw = await fetchUrl('https://raw.githubusercontent.com/thiagobodruk/bible/master/json/pt_aa.json');
  const booksArray = JSON.parse(raw);
  
  const books = {};
  booksArray.forEach((b, idx) => {
    const bookId = CANON_66[idx];
    books[bookId] = {};
    b.chapters.forEach((ch, chIdx) => {
      const chNum = String(chIdx + 1);
      books[bookId][chNum] = {};
      ch.forEach((verseText, vIdx) => {
        books[bookId][chNum][String(vIdx + 1)] = verseText.trim();
      });
    });
  });

  const dataset = {
    translation: 'ALMEIDA',
    name: 'João Ferreira de Almeida',
    language: 'pt',
    books
  };

  const targetPath = path.join(__dirname, '..', 'src', 'data', 'bibles', 'almeida.json');
  fs.writeFileSync(targetPath, JSON.stringify(dataset), 'utf-8');
  console.log(`Saved Almeida to ${targetPath}`);
}

async function buildKjv() {
  console.log('Downloading KJV (en_kjv.json)...');
  const raw = await fetchUrl('https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json');
  const booksArray = JSON.parse(raw);
  
  const books = {};
  booksArray.forEach((b, idx) => {
    const bookId = CANON_66[idx];
    books[bookId] = {};
    b.chapters.forEach((ch, chIdx) => {
      const chNum = String(chIdx + 1);
      books[bookId][chNum] = {};
      ch.forEach((verseText, vIdx) => {
        books[bookId][chNum][String(vIdx + 1)] = verseText.trim();
      });
    });
  });

  const dataset = {
    translation: 'KJV',
    name: 'King James Version',
    language: 'en',
    books
  };

  const targetPath = path.join(__dirname, '..', 'src', 'data', 'bibles', 'kjv.json');
  fs.writeFileSync(targetPath, JSON.stringify(dataset), 'utf-8');
  console.log(`Saved KJV to ${targetPath}`);
}

async function buildWeb() {
  console.log('Downloading WEB (66 books from TehShrike/world-english-bible)...');
  const books = {};
  
  const entries = Object.entries(WEB_FILES);
  const chunkSize = 10;
  for (let i = 0; i < entries.length; i += chunkSize) {
    const batch = entries.slice(i, i + chunkSize);
    await Promise.all(batch.map(async ([bookId, fileName]) => {
      const url = `https://raw.githubusercontent.com/TehShrike/world-english-bible/master/json/${fileName}`;
      const raw = await fetchUrl(url);
      const items = JSON.parse(raw);
      
      books[bookId] = {};
      
      for (const item of items) {
        if (item.chapterNumber && item.verseNumber && item.value) {
          const ch = String(item.chapterNumber);
          const v = String(item.verseNumber);
          if (!books[bookId][ch]) {
            books[bookId][ch] = {};
          }
          if (!books[bookId][ch][v]) {
            books[bookId][ch][v] = item.value.trim();
          } else {
            books[bookId][ch][v] += ' ' + item.value.trim();
          }
        }
      }
      
      for (const ch of Object.keys(books[bookId])) {
        for (const v of Object.keys(books[bookId][ch])) {
          books[bookId][ch][v] = books[bookId][ch][v].replace(/\s+/g, ' ').trim();
        }
      }
    }));
    console.log(`Downloaded ${Math.min(i + chunkSize, entries.length)}/${entries.length} WEB books...`);
  }

  const dataset = {
    translation: 'WEB',
    name: 'World English Bible',
    language: 'en',
    books
  };

  const targetPath = path.join(__dirname, '..', 'src', 'data', 'bibles', 'web.json');
  fs.writeFileSync(targetPath, JSON.stringify(dataset), 'utf-8');
  console.log(`Saved WEB to ${targetPath}`);
}

async function main() {
  try {
    await buildAlmeida();
    await buildKjv();
    await buildWeb();
    console.log('All offline Bible datasets built successfully!');
  } catch (err) {
    console.error('Error building bibles:', err);
    process.exit(1);
  }
}

main();
