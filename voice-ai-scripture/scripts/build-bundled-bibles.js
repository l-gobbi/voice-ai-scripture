/**
 * Rebuilds the offline Bible datasets bundled in src/data/bibles/.
 *
 *   node scripts/build-bundled-bibles.js                    # every dataset
 *   node scripts/build-bundled-bibles.js blivre onbv bsb    # only the named ones
 *   node scripts/build-bundled-bibles.js --metadata-only web
 *       # rewrite only the metadata of an existing dataset, keeping its verses
 *
 * Every dataset has the shape
 *   { translation, name, fullName, language, license, notice, changes, sourceUrl,
 *     books: { BOOKID: { chapter: { verse: text } } } }
 * and the Scripture Catalog reads its metadata from there. The dataset integrity test
 * (src/services/ScriptureCatalog.integrity.test.ts) guards the output.
 *
 * Only open-licensed texts are bundled (ADR 0018): Bíblia Livre, ONBV, BSB and WEB. The AA
 * "ALMEIDA" and KJV datasets and their builders were removed in ticket 81.
 *
 * BLIVRE, ONBV and BSB come from eBible.org in verse-per-line (VPL) format.
 * eBible's VPL export already drops notes, footnotes, cross-references and section titles.
 * The build maps eBible book codes to the canon ids, removes `{…}`/`[…]` markers while
 * keeping the words, and normalizes whitespace. It never changes wording. ONBV (CC BY-SA) is
 * shipped verbatim: if its source ever contains markers, the build refuses to rewrite it and
 * fails loudly instead.
 *
 * Psalm titles (Ticket 85). The VPL export merges each Psalm's title (superscription, e.g.
 * "A Psalm of David.") into verse 1, but learners recite only the verse. eBible's USFM export
 * of the same text keeps the title apart, as a `\d` paragraph before `\v 1`. The build reads
 * only the Psalms file of the USFM export, takes each `\d` title as plain text, and cuts that
 * exact title off the start of the VPL verse 1. Verse 1 keeps the rest of its VPL text, so no
 * other wording changes. If a title is not exactly at the start of verse 1, or the USFM has a
 * `\d` anywhere unexpected, the build fails instead of guessing. Titles are not stored.
 *
 * Needs Node 18+ and the `unzip` command.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const BIBLES_DIR = path.join(__dirname, '..', 'src', 'data', 'bibles');

const CANON_66 = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA',
  '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
  'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO',
  'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
  'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH',
  'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS',
  '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'
];

/** eBible VPL book codes, in canon order. Eleven differ from the canon ids. */
const EBIBLE_VPL_BOOKS = [
  'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA',
  '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
  'ECC', 'SOL', 'ISA', 'JER', 'LAM', 'EZE', 'DAN', 'HOS', 'JOE', 'AMO',
  'OBA', 'JON', 'MIC', 'NAH', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
  'MAT', 'MAR', 'LUK', 'JOH', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH',
  'PHI', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAM',
  '1PE', '2PE', '1JO', '2JO', '3JO', 'JUD', 'REV'
];

const EBIBLE_TO_CANON = Object.fromEntries(EBIBLE_VPL_BOOKS.map((code, i) => [code, CANON_66[i]]));

/**
 * Per-translation metadata written into each dataset. `notice` is the attribution text the
 * licence requires (or, for public-domain texts, the courtesy credit and trademark note),
 * copied from the licensor. `changes` says what this build did to the text, as CC BY asks.
 */
const TRANSLATION_METADATA = {
  BLIVRE: {
    name: 'Bíblia Livre',
    fullName: 'Bíblia Livre (BLIVRE)',
    language: 'pt',
    license: 'Creative Commons Atribuição 4.0 Brasil (CC BY 4.0 BR)',
    // Suggested credit from https://ebible.org/find/details.php?id=porbr2018, which also
    // asks to always state the version date.
    notice:
      'Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio, e Marco Teles, ' +
      'http://sites.google.com/site/biblialivre/ - fevereiro de 2018. ' +
      'Licença Creative Commons Atribuição 4.0 Brasil (http://creativecommons.org/licenses/by/4.0/br/). ' +
      'Reprodução permitida desde que devidamente mencionados fonte e autores.',
    changes:
      'Os colchetes [ ] do texto-fonte foram removidos, mantendo as palavras entre eles, ' +
      'os títulos dos Salmos foram omitidos do texto dos versículos ' +
      'e os espaços foram normalizados. O texto não foi alterado de outra forma.',
    sourceUrl: 'https://ebible.org/find/details.php?id=porbr2018',
  },
  ONBV: {
    // The licence asks to keep the title as it is. Plain "Nova Bíblia Viva" (NBV) is a
    // different, copyrighted Biblica text.
    name: 'Open Nova Bíblia Viva',
    fullName: 'Biblica® Open Nova Bíblia Viva™',
    language: 'pt',
    license: 'Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)',
    // "Notice of copyright must appear on the title or copyright page of the work as
    // follows:" (https://ebible.org/find/details.php?id=poronbv), line for line.
    notice: [
      'Biblica® Open Nova Bíblia Viva™',
      'Copyright © 2007, 2010 by Biblica, Inc.',
      '“Biblica” é uma marca registrada na Oficina de Patentes e Marcas dos Estados Unidos por Biblica, Inc. Usado com permissão.',
      '“Biblica” is a trademark registered in the United States Patent and Trademark Office by Biblica, Inc. Used with permission.',
    ].join('\n'),
    changes:
      'Texto sem alterações, exceto que os títulos dos Salmos foram omitidos do texto dos ' +
      'versículos e os espaços foram normalizados.',
    sourceUrl: 'https://ebible.org/find/details.php?id=poronbv',
  },
  BSB: {
    name: 'Berean Standard Bible',
    fullName: 'The Holy Bible, Berean Standard Bible (BSB)',
    language: 'en',
    license: 'Public domain (dedicated to the public domain on April 30, 2023)',
    // Attribution notice "appreciated but not required" (https://berean.bible/terms.htm).
    notice:
      'The Holy Bible, Berean Standard Bible, BSB is produced in cooperation with Bible Hub, ' +
      'Discovery Bible, OpenBible.com, and the Berean Bible Translation Committee. ' +
      "This text of God's Word has been dedicated to the public domain.",
    changes:
      'Text unchanged, except that Psalm titles are omitted from verse text and whitespace ' +
      'is normalized.',
    sourceUrl: 'https://ebible.org/find/details.php?id=engbsb',
  },
  WEB: {
    name: 'World English Bible',
    fullName: 'World English Bible (WEB)',
    language: 'en',
    license: 'Public domain ("World English Bible" is a trademark of eBible.org)',
    // https://ebible.org/find/details.php?id=engwebp. The trademark condition: altered text
    // must not be called the World English Bible.
    notice:
      'The World English Bible is in the Public Domain. That means that it is not copyrighted. ' +
      'However, "World English Bible" is a Trademark of eBible.org.',
    changes: 'Text unchanged; formatting removed and whitespace normalized only.',
    sourceUrl: 'https://github.com/TehShrike/world-english-bible',
  },
};

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

function fetchBuffer(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
        res.resume();
        return resolve(fetchBuffer(new URL(res.headers.location, url).toString(), redirectsLeft - 1));
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error(`Failed to fetch ${url}, status: ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function fetchUrl(url) {
  let data = (await fetchBuffer(url)).toString('utf-8');
  if (data.charCodeAt(0) === 0xFEFF) {
    data = data.slice(1);
  }
  return data;
}

function datasetPath(code) {
  return path.join(BIBLES_DIR, `${code.toLowerCase()}.json`);
}

function writeDataset(code, books) {
  const meta = TRANSLATION_METADATA[code];
  const dataset = {
    translation: code,
    name: meta.name,
    fullName: meta.fullName,
    language: meta.language,
    license: meta.license,
    notice: meta.notice,
    changes: meta.changes,
    sourceUrl: meta.sourceUrl,
    books,
  };
  const targetPath = datasetPath(code);
  fs.writeFileSync(targetPath, JSON.stringify(dataset), 'utf-8');
  console.log(`Saved ${code} to ${targetPath} (${(fs.statSync(targetPath).size / 1e6).toFixed(2)} MB)`);
}

/* ------------------------------------------------------------------------------------------ */
/* eBible.org sources: VPL verse text, USFM Psalm titles                                     */
/* ------------------------------------------------------------------------------------------ */

const EBIBLE_SOURCES = {
  BLIVRE: { id: 'porbr2018', markers: 'strip' },
  ONBV: { id: 'poronbv', markers: 'refuse' },
  BSB: { id: 'engbsb', markers: 'strip' },
};

const MARKER_CHARS = /[{}[\]]/;

function readZipEntry(zipPath, entryName) {
  try {
    return execFileSync('unzip', ['-p', zipPath, entryName], { maxBuffer: 64 * 1024 * 1024 }).toString('utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('The `unzip` command is required to read eBible.org archives. Install it and retry.');
    }
    throw err;
  }
}

/**
 * Parses an eBible `_vpl.txt` file: one verse per line, `BOOK chapter:verse text`.
 * Fails on anything unexpected (unknown book, verse range, duplicate, missing book) rather
 * than dropping verses silently.
 */
function parseVpl(raw, sourceId) {
  const text = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  const books = {};
  const emptyVerses = [];
  const seen = new Set();

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const match = line.match(/^(\S+) (\d+):(\d+)(?: (.*))?$/);
    if (!match) {
      throw new Error(`${sourceId}: unexpected VPL line: ${line.slice(0, 120)}`);
    }
    const [, ebibleCode, chapter, verse, verseText = ''] = match;
    const bookId = EBIBLE_TO_CANON[ebibleCode];
    if (!bookId) {
      throw new Error(`${sourceId}: unknown eBible book code "${ebibleCode}"`);
    }
    const ref = `${bookId} ${chapter}:${verse}`;
    if (seen.has(ref)) {
      throw new Error(`${sourceId}: duplicate verse ${ref}`);
    }
    seen.add(ref);
    if (!verseText.trim()) {
      emptyVerses.push(ref);
      continue;
    }
    books[bookId] = books[bookId] || {};
    books[bookId][chapter] = books[bookId][chapter] || {};
    books[bookId][chapter][verse] = verseText;
  }

  const missingBooks = CANON_66.filter((id) => !books[id]);
  if (missingBooks.length > 0) {
    throw new Error(`${sourceId}: missing books ${missingBooks.join(', ')}`);
  }
  return { books, emptyVerses };
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Removes `{…}`/`[…]` markers and keeps the words inside. The source leaves a space between a
 * closing marker and the punctuation after it ("décimos [de efa] ."); that space goes with
 * the marker. Other text, spacing and punctuation are left as the source has them.
 */
function stripMarkers(text) {
  return text.replace(/([\]}])\s+(?=[,.;:!?])/g, '$1').replace(/[{}[\]]/g, '');
}

/* Psalm titles, read from eBible's USFM export (Ticket 85) --------------------------------- */

/**
 * Plain text of a piece of USFM. Footnotes (`\f … \f*`, `\fe … \fe*`) and cross-references
 * (`\x … \x*`) are dropped with their content, `\w word|strong="…"\w*` keeps only the word,
 * and every other marker (`\add`, `\nd`, `\wj`, `\it`, `\qs`, `\q1`, `\p`, …) is dropped while
 * the words it marks are kept.
 */
function usfmToPlainText(usfm) {
  return normalizeWhitespace(
    usfm
      .replace(/\\(f|fe|x)\s[\s\S]*?\\\1\*/g, '')
      .replace(/\\\+?w\s([^|\\]*)(?:\|[^\\]*)?\\\+?w\*/g, '$1')
      .replace(/\\\+?[a-z]+\d*\*/g, '') // a closing marker; the space after it is real text
      .replace(/\\\+?[a-z]+\d*\s?/g, '') // an opening marker and the one space that ends it
  );
}

/**
 * Reads eBible's USFM Psalms file and returns, for each Psalm, the plain text of its title
 * (the `\d` paragraph before `\v 1`, or '' when it has none) and of its verse 1.
 * A `\d` that cannot be placed with certainty fails the build: one after the first verse,
 * one with a verse inside it, an empty one, or a second one in the same Psalm.
 */
function parseUsfmPsalms(usfm, sourceId) {
  const psalms = {};
  let chapter = null;
  let psalm = null;
  let collecting = null; // 'title' or 'verse1': the part the current USFM lines belong to
  const fail = (problem) => {
    throw new Error(`${sourceId}: Psalm ${chapter} in the USFM has ${problem}`);
  };

  for (const line of usfm.split(/\r?\n/)) {
    const chapterMatch = line.match(/^\\c\s+(\d+)/);
    if (chapterMatch) {
      chapter = chapterMatch[1];
      psalm = psalms[chapter] = { title: [], verse1: [], hasTitle: false, verseSeen: false };
      collecting = null;
      continue;
    }
    if (!psalm) continue;
    const marker = (line.match(/^\\([a-z]+\d*)/) || [])[1];

    if (marker === 'd') {
      if (psalm.verseSeen) fail('a \\d title after its first verse');
      if (psalm.hasTitle) fail('more than one \\d title');
      if (/\\v\s/.test(line)) fail('a verse inside its \\d title');
      psalm.hasTitle = true;
      psalm.title.push(line.slice(2));
      collecting = 'title';
    } else if (marker === 'v') {
      if (collecting === 'title') fail('a verse inside its \\d title paragraph');
      if (psalm.verseSeen) {
        collecting = null;
      } else {
        if (!/^\\v 1\b/.test(line)) fail(`"${line.slice(0, 20)}" as its first verse`);
        psalm.verseSeen = true;
        psalm.verse1.push(line.replace(/^\\v 1\s?/, ''));
        collecting = 'verse1';
      }
    } else if (marker === undefined) {
      // A line without a leading marker continues the current paragraph.
      if (collecting) psalm[collecting].push(line);
    } else if (collecting === 'title') {
      collecting = null; // any other paragraph marker ends the title paragraph
    } else if (collecting === 'verse1') {
      psalm.verse1.push(line); // verse 1 continues over poetry lines (\q2, \p, …)
    }
  }

  const result = {};
  for (const [number, { title, verse1, hasTitle }] of Object.entries(psalms)) {
    chapter = number;
    const titleText = usfmToPlainText(title.join(' '));
    if (hasTitle && !titleText) fail('an empty \\d title');
    result[number] = { title: titleText, verse1: usfmToPlainText(verse1.join(' ').split(/\\v\s/)[0]) };
  }
  if (Object.keys(result).length !== 150) {
    throw new Error(`${sourceId}: the USFM Psalms file has ${Object.keys(result).length} Psalms, expected 150`);
  }
  return result;
}

/** The first words of a text, ignoring punctuation and `{…}`/`[…]` markers. */
function firstWords(text) {
  return (text.match(/[\p{L}\p{N}]+/gu) || []).slice(0, 4).join(' ');
}

/**
 * Cuts each Psalm's USFM title off the start of its verse 1, in place. `psalms` holds the
 * converted VPL chapters of the book (whitespace already normalized), so verse 1 keeps exactly
 * the rest of its VPL text. Fails unless the title is exactly at the start of verse 1 and what
 * is left starts with the same words as the USFM verse 1, which also catches a title the USFM
 * does not mark. Returns the numbers of the Psalms whose title was removed.
 */
function removePsalmTitles(psalms, usfmPsalms, code) {
  const vplCount = Object.keys(psalms).length;
  if (vplCount !== Object.keys(usfmPsalms).length) {
    throw new Error(`${code}: ${vplCount} Psalms in the VPL text, ${Object.keys(usfmPsalms).length} in the USFM`);
  }
  const removed = [];
  for (const [chapter, { title, verse1 }] of Object.entries(usfmPsalms)) {
    const ref = `PSA ${chapter}:1`;
    let text = psalms[chapter] && psalms[chapter]['1'];
    if (!text) {
      throw new Error(`${code}: ${ref} is missing from the VPL text`);
    }
    if (title) {
      if (!text.startsWith(`${title} `)) {
        throw new Error(
          `${code}: the title of Psalm ${chapter} is not at the start of ${ref}.\n` +
            `  title:   ${title}\n  verse 1: ${text.slice(0, title.length + 40)}`
        );
      }
      text = text.slice(title.length + 1);
      removed.push(Number(chapter));
    }
    if (!text || firstWords(text) !== firstWords(verse1)) {
      throw new Error(
        `${code}: ${ref} does not start like the USFM verse 1.\n` +
          `  VPL:  ${text.slice(0, 80)}\n  USFM: ${verse1.slice(0, 80)}`
      );
    }
    psalms[chapter]['1'] = text;
  }
  return removed;
}

async function buildEbible(code) {
  const { id, markers } = EBIBLE_SOURCES[code];
  const vplUrl = `https://ebible.org/Scriptures/${id}_vpl.zip`;
  const usfmUrl = `https://ebible.org/Scriptures/${id}_usfm.zip`;
  console.log(`Downloading ${code} from ${vplUrl} and ${usfmUrl}...`);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `ebible-${id}-`));
  let raw;
  let psalmsUsfm;
  try {
    const vplZip = path.join(tmpDir, `${id}_vpl.zip`);
    fs.writeFileSync(vplZip, await fetchBuffer(vplUrl));
    raw = readZipEntry(vplZip, `${id}_vpl.txt`);
    // Only the Psalms file is read. In these sources `\d` appears elsewhere only as an empty
    // marker (BSB Zechariah 12), never as a title.
    const usfmZip = path.join(tmpDir, `${id}_usfm.zip`);
    fs.writeFileSync(usfmZip, await fetchBuffer(usfmUrl));
    psalmsUsfm = readZipEntry(usfmZip, `20-PSA${id}.usfm`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const usfmPsalms = parseUsfmPsalms(psalmsUsfm, id);
  const { books, emptyVerses } = parseVpl(raw, id);
  const markedVerses = [];
  let verseCount = 0;

  for (const [bookId, chapters] of Object.entries(books)) {
    for (const [chapter, verses] of Object.entries(chapters)) {
      for (const [verse, text] of Object.entries(verses)) {
        verseCount++;
        if (MARKER_CHARS.test(text)) {
          markedVerses.push(`${bookId} ${chapter}:${verse}`);
        }
        const unmarked = markers === 'strip' ? stripMarkers(text) : text;
        verses[verse] = normalizeWhitespace(unmarked);
      }
    }
  }

  if (markedVerses.length > 0 && markers === 'refuse') {
    const banner = '!'.repeat(78);
    console.error(
      [
        banner,
        `${code} (${id}) CONTAINS {…}/[…] MARKERS IN ${markedVerses.length} VERSES.`,
        `${code} is CC BY-SA and must ship verbatim, so this build will NOT rewrite it.`,
        `${datasetPath(code)} was left untouched. Escalate the decision (spec-open-translations.md).`,
        `First affected verses: ${markedVerses.slice(0, 20).join(', ')}`,
        banner,
      ].join('\n')
    );
    throw new Error(`${code}: markers found in a verbatim-only source`);
  }

  const titledPsalms = removePsalmTitles(books.PSA, usfmPsalms, code);

  console.log(
    `${code}: ${verseCount} verses` +
      (markedVerses.length ? `, removed markers from ${markedVerses.length} verses (words kept)` : ', no markers') +
      (emptyVerses.length ? `, skipped ${emptyVerses.length} empty verses (${emptyVerses.join(', ')})` : '') +
      `, removed ${titledPsalms.length} Psalm titles from verse 1`
  );
  const untitled = Object.keys(usfmPsalms).map(Number).filter((n) => !titledPsalms.includes(n));
  console.log(`${code}: Psalms without a title: ${untitled.join(', ')}`);
  writeDataset(code, books);
}

/* ------------------------------------------------------------------------------------------ */
/* Other sources                                                                               */
/* ------------------------------------------------------------------------------------------ */

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

  // Keep canon book order regardless of download completion order.
  const ordered = {};
  for (const bookId of CANON_66) ordered[bookId] = books[bookId];
  writeDataset('WEB', ordered);
}

/** Rewrites only the metadata of an existing dataset; its verses are kept byte for byte. */
function restampMetadata(code) {
  const existing = JSON.parse(fs.readFileSync(datasetPath(code), 'utf-8'));
  writeDataset(code, existing.books);
}

const BUILDERS = {
  BLIVRE: () => buildEbible('BLIVRE'),
  ONBV: () => buildEbible('ONBV'),
  BSB: () => buildEbible('BSB'),
  WEB: buildWeb,
};

async function main() {
  const args = process.argv.slice(2);
  const metadataOnly = args.includes('--metadata-only');
  const requested = args.filter((a) => !a.startsWith('--')).map((a) => a.toUpperCase());
  const codes = requested.length > 0 ? requested : Object.keys(BUILDERS);

  const unknown = codes.filter((code) => !BUILDERS[code]);
  if (unknown.length > 0) {
    console.error(`Unknown dataset(s): ${unknown.join(', ')}. Known: ${Object.keys(BUILDERS).join(', ')}`);
    process.exit(1);
  }

  const failures = [];
  for (const code of codes) {
    try {
      if (metadataOnly) {
        restampMetadata(code);
      } else {
        await BUILDERS[code]();
      }
    } catch (err) {
      console.error(`Error building ${code}:`, err.message || err);
      failures.push(code);
    }
  }

  if (failures.length > 0) {
    console.error(`Failed: ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log(`Built ${codes.join(', ')} successfully.`);
}

main();
