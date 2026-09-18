export interface NormalizedReference {
  bookId: string;
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse?: number;
  canonicalRef: string;
  language: 'en' | 'pt';
}

interface BookDefinition {
  id: string;
  enName: string;
  ptName: string;
  enAliases: string[];
  ptAliases: string[];
}

const BOOKS: BookDefinition[] = [
  // Old Testament (Antigo Testamento)
  {
    id: 'GEN',
    enName: 'Genesis',
    ptName: 'Gênesis',
    enAliases: ['genesis', 'gen', 'ge', 'gn'],
    ptAliases: ['genesis', 'gen', 'gn'],
  },
  {
    id: 'EXO',
    enName: 'Exodus',
    ptName: 'Êxodo',
    enAliases: ['exodus', 'exod', 'exo', 'ex'],
    ptAliases: ['exodo', 'exod', 'exo', 'ex'],
  },
  {
    id: 'LEV',
    enName: 'Leviticus',
    ptName: 'Levítico',
    enAliases: ['leviticus', 'lev', 'le', 'lv'],
    ptAliases: ['levitico', 'lev', 'lv'],
  },
  {
    id: 'NUM',
    enName: 'Numbers',
    ptName: 'Números',
    enAliases: ['numbers', 'num', 'nu', 'nm'],
    ptAliases: ['numeros', 'num', 'nm'],
  },
  {
    id: 'DEU',
    enName: 'Deuteronomy',
    ptName: 'Deuteronômio',
    enAliases: ['deuteronomy', 'deut', 'deu', 'dt'],
    ptAliases: ['deuteronomio', 'deut', 'dt'],
  },
  {
    id: 'JOS',
    enName: 'Joshua',
    ptName: 'Josué',
    enAliases: ['joshua', 'josh', 'jos'],
    ptAliases: ['josue', 'jos', 'js'],
  },
  {
    id: 'JDG',
    enName: 'Judges',
    ptName: 'Juízes',
    enAliases: ['judges', 'judg', 'jdg'],
    ptAliases: ['juizes', 'juiz', 'jz'],
  },
  {
    id: 'RUT',
    enName: 'Ruth',
    ptName: 'Rute',
    enAliases: ['ruth', 'rut', 'ru'],
    ptAliases: ['rute', 'rt', 'ru'],
  },
  {
    id: '1SA',
    enName: '1 Samuel',
    ptName: '1 Samuel',
    enAliases: ['1 samuel', '1samuel', '1 sam', '1sam', '1 sa', '1sa'],
    ptAliases: ['1 samuel', '1samuel', '1 sam', '1sam', '1 sm', '1sm'],
  },
  {
    id: '2SA',
    enName: '2 Samuel',
    ptName: '2 Samuel',
    enAliases: ['2 samuel', '2samuel', '2 sam', '2sam', '2 sa', '2sa'],
    ptAliases: ['2 samuel', '2samuel', '2 sam', '2sam', '2 sm', '2sm'],
  },
  {
    id: '1KI',
    enName: '1 Kings',
    ptName: '1 Reis',
    enAliases: ['1 kings', '1kings', '1 kgs', '1kgs', '1 ki', '1ki'],
    ptAliases: ['1 reis', '1reis', '1 rs', '1rs', '1 re', '1re'],
  },
  {
    id: '2KI',
    enName: '2 Kings',
    ptName: '2 Reis',
    enAliases: ['2 kings', '2kings', '2 kgs', '2kgs', '2 ki', '2ki'],
    ptAliases: ['2 reis', '2reis', '2 rs', '2rs', '2 re', '2re'],
  },
  {
    id: '1CH',
    enName: '1 Chronicles',
    ptName: '1 Crônicas',
    enAliases: ['1 chronicles', '1chronicles', '1 chron', '1ch'],
    ptAliases: ['1 cronicas', '1cronicas', '1 cron', '1cr', '1 cr'],
  },
  {
    id: '2CH',
    enName: '2 Chronicles',
    ptName: '2 Crônicas',
    enAliases: ['2 chronicles', '2chronicles', '2 chron', '2ch'],
    ptAliases: ['2 cronicas', '2cronicas', '2 cron', '2cr', '2 cr'],
  },
  {
    id: 'EZR',
    enName: 'Ezra',
    ptName: 'Esdras',
    enAliases: ['ezra', 'ezr'],
    ptAliases: ['esdras', 'esd', 'ed'],
  },
  {
    id: 'NEH',
    enName: 'Nehemiah',
    ptName: 'Neemias',
    enAliases: ['nehemiah', 'neh', 'ne'],
    ptAliases: ['neemias', 'neem', 'ne'],
  },
  {
    id: 'EST',
    enName: 'Esther',
    ptName: 'Ester',
    enAliases: ['esther', 'esth', 'est'],
    ptAliases: ['ester', 'est', 'et'],
  },
  {
    id: 'JOB',
    enName: 'Job',
    ptName: 'Jó',
    enAliases: ['job'],
    ptAliases: ['jb'],
  },
  {
    id: 'PSA',
    enName: 'Psalms',
    ptName: 'Salmos',
    enAliases: ['psalms', 'psalm', 'psa', 'psm', 'pss', 'ps'],
    ptAliases: ['salmos', 'salmo', 'slm', 'sl'],
  },
  {
    id: 'PRO',
    enName: 'Proverbs',
    ptName: 'Provérbios',
    enAliases: ['proverbs', 'proverb', 'prov', 'pro', 'prv', 'pr'],
    ptAliases: ['proverbios', 'proverbio', 'prov', 'pv', 'pr'],
  },
  {
    id: 'ECC',
    enName: 'Ecclesiastes',
    ptName: 'Eclesiastes',
    enAliases: ['ecclesiastes', 'eccles', 'eccl', 'ecc', 'ec'],
    ptAliases: ['eclesiastes', 'ecl', 'ec'],
  },
  {
    id: 'SNG',
    enName: 'Song of Solomon',
    ptName: 'Cantares',
    enAliases: ['song of solomon', 'song of songs', 'song', 'songs', 'sos', 'canticles'],
    ptAliases: ['cantares', 'cantar', 'canticos', 'ct'],
  },
  {
    id: 'ISA',
    enName: 'Isaiah',
    ptName: 'Isaías',
    enAliases: ['isaiah', 'isa', 'is'],
    ptAliases: ['isaias', 'isa', 'is'],
  },
  {
    id: 'JER',
    enName: 'Jeremiah',
    ptName: 'Jeremias',
    enAliases: ['jeremiah', 'jer', 'je'],
    ptAliases: ['jeremias', 'jer', 'jr'],
  },
  {
    id: 'LAM',
    enName: 'Lamentations',
    ptName: 'Lamentações',
    enAliases: ['lamentations', 'lament', 'lam', 'la'],
    ptAliases: ['lamentacoes', 'lamentacao', 'lm', 'la'],
  },
  {
    id: 'EZK',
    enName: 'Ezekiel',
    ptName: 'Ezequiel',
    enAliases: ['ezekiel', 'ezek', 'eze', 'ezk'],
    ptAliases: ['ezequiel', 'eze', 'ez'],
  },
  {
    id: 'DAN',
    enName: 'Daniel',
    ptName: 'Daniel',
    enAliases: ['daniel', 'dan', 'da', 'dn'],
    ptAliases: ['daniel', 'dan', 'dn'],
  },
  {
    id: 'HOS',
    enName: 'Hosea',
    ptName: 'Oséias',
    enAliases: ['hosea', 'hos', 'ho'],
    ptAliases: ['oseias', 'ose', 'os'],
  },
  {
    id: 'JOL',
    enName: 'Joel',
    ptName: 'Joel',
    enAliases: ['joel', 'joe', 'jl'],
    ptAliases: ['joel', 'jl'],
  },
  {
    id: 'AMO',
    enName: 'Amos',
    ptName: 'Amós',
    enAliases: ['amos', 'amo', 'am'],
    ptAliases: ['amos', 'am'],
  },
  {
    id: 'OBA',
    enName: 'Obadiah',
    ptName: 'Obadias',
    enAliases: ['obadiah', 'obad', 'oba', 'ob'],
    ptAliases: ['obadias', 'ob', 'obd'],
  },
  {
    id: 'JON',
    enName: 'Jonah',
    ptName: 'Jonas',
    enAliases: ['jonah', 'jnh', 'jon'],
    ptAliases: ['jonas', 'jon', 'jns'],
  },
  {
    id: 'MIC',
    enName: 'Micah',
    ptName: 'Miquéias',
    enAliases: ['micah', 'mic', 'mc'],
    ptAliases: ['miqueias', 'miq', 'mq'],
  },
  {
    id: 'NAM',
    enName: 'Nahum',
    ptName: 'Naum',
    enAliases: ['nahum', 'nah', 'na'],
    ptAliases: ['naum', 'na'],
  },
  {
    id: 'HAB',
    enName: 'Habakkuk',
    ptName: 'Habacuque',
    enAliases: ['habakkuk', 'hab', 'hb'],
    ptAliases: ['habacuque', 'hab', 'hc'],
  },
  {
    id: 'ZEP',
    enName: 'Zephaniah',
    ptName: 'Sofonias',
    enAliases: ['zephaniah', 'zeph', 'zep', 'zp'],
    ptAliases: ['sofonias', 'sof', 'sf'],
  },
  {
    id: 'HAG',
    enName: 'Haggai',
    ptName: 'Ageu',
    enAliases: ['haggai', 'hag', 'hg'],
    ptAliases: ['ageu', 'ag'],
  },
  {
    id: 'ZEC',
    enName: 'Zechariah',
    ptName: 'Zacarias',
    enAliases: ['zechariah', 'zech', 'zec', 'zc'],
    ptAliases: ['zacarias', 'zac', 'zc'],
  },
  {
    id: 'MAL',
    enName: 'Malachi',
    ptName: 'Malaquias',
    enAliases: ['malachi', 'mal', 'ml'],
    ptAliases: ['malaquias', 'mal', 'mq', 'ml'],
  },

  // New Testament (Novo Testamento)
  {
    id: 'MAT',
    enName: 'Matthew',
    ptName: 'Mateus',
    enAliases: ['matthew', 'matt', 'mat', 'mt'],
    ptAliases: ['mateus', 'mat', 'mt'],
  },
  {
    id: 'MRK',
    enName: 'Mark',
    ptName: 'Marcos',
    enAliases: ['mark', 'mrk', 'mk'],
    ptAliases: ['marcos', 'marc', 'mc'],
  },
  {
    id: 'LUK',
    enName: 'Luke',
    ptName: 'Lucas',
    enAliases: ['luke', 'luk', 'lk'],
    ptAliases: ['lucas', 'luc', 'lc'],
  },
  {
    id: 'JHN',
    enName: 'John',
    ptName: 'João',
    enAliases: ['john', 'jhn', 'jn'],
    ptAliases: ['joao', 'jo'],
  },
  {
    id: 'ACT',
    enName: 'Acts',
    ptName: 'Atos',
    enAliases: ['acts', 'act', 'ac'],
    ptAliases: ['atos', 'at'],
  },
  {
    id: 'ROM',
    enName: 'Romans',
    ptName: 'Romanos',
    enAliases: ['romans', 'roman', 'rom', 'ro'],
    ptAliases: ['romanos', 'rm'],
  },
  {
    id: '1CO',
    enName: '1 Corinthians',
    ptName: '1 Coríntios',
    enAliases: ['1 corinthians', '1corinthians', '1 cor', '1cor', '1 co', '1co'],
    ptAliases: ['1 corintios', '1corintios', '1 cor', '1cor', '1 co', '1co'],
  },
  {
    id: '2CO',
    enName: '2 Corinthians',
    ptName: '2 Coríntios',
    enAliases: ['2 corinthians', '2corinthians', '2 cor', '2cor', '2 co', '2co'],
    ptAliases: ['2 corintios', '2corintios', '2 cor', '2cor', '2 co', '2co'],
  },
  {
    id: 'GAL',
    enName: 'Galatians',
    ptName: 'Gálatas',
    enAliases: ['galatians', 'gal', 'ga'],
    ptAliases: ['galatas', 'gal', 'gl'],
  },
  {
    id: 'EPH',
    enName: 'Ephesians',
    ptName: 'Efésios',
    enAliases: ['ephesians', 'ephes', 'eph'],
    ptAliases: ['efesios', 'efe', 'ef'],
  },
  {
    id: 'PHP',
    enName: 'Philippians',
    ptName: 'Filipenses',
    enAliases: ['philippians', 'philip', 'phil', 'php', 'pp'],
    ptAliases: ['filipenses', 'fil', 'fp', 'fl'],
  },
  {
    id: 'COL',
    enName: 'Colossians',
    ptName: 'Colossenses',
    enAliases: ['colossians', 'coloss', 'col', 'cl'],
    ptAliases: ['colossenses', 'col', 'cl'],
  },
  {
    id: '1TH',
    enName: '1 Thessalonians',
    ptName: '1 Tessalonicenses',
    enAliases: ['1 thessalonians', '1thessalonians', '1 thess', '1thess', '1 th', '1th'],
    ptAliases: ['1 tessalonicenses', '1tessalonicenses', '1 tess', '1 ts', '1ts'],
  },
  {
    id: '2TH',
    enName: '2 Thessalonians',
    ptName: '2 Tessalonicenses',
    enAliases: ['2 thessalonians', '2thessalonians', '2 thess', '2thess', '2 th', '2th'],
    ptAliases: ['2 tessalonicenses', '2tessalonicenses', '2 tess', '2 ts', '2ts'],
  },
  {
    id: '1TI',
    enName: '1 Timothy',
    ptName: '1 Timóteo',
    enAliases: ['1 timothy', '1timothy', '1 tim', '1tim', '1 ti', '1ti'],
    ptAliases: ['1 timoteo', '1timoteo', '1 tim', '1tim', '1 tm', '1tm', '1 ti', '1ti'],
  },
  {
    id: '2TI',
    enName: '2 Timothy',
    ptName: '2 Timóteo',
    enAliases: ['2 timothy', '2timothy', '2 tim', '2tim', '2 ti', '2ti'],
    ptAliases: ['2 timoteo', '2timoteo', '2 tim', '2tim', '2 tm', '2tm', '2 ti', '2ti'],
  },
  {
    id: 'TIT',
    enName: 'Titus',
    ptName: 'Tito',
    enAliases: ['titus', 'tit', 'ti'],
    ptAliases: ['tito', 'tit', 'tt'],
  },
  {
    id: 'PHM',
    enName: 'Philemon',
    ptName: 'Filemom',
    enAliases: ['philemon', 'philem', 'phm', 'pm'],
    ptAliases: ['filemom', 'flm', 'fm'],
  },
  {
    id: 'HEB',
    enName: 'Hebrews',
    ptName: 'Hebreus',
    enAliases: ['hebrews', 'hebr', 'heb'],
    ptAliases: ['hebreus', 'heb', 'hb'],
  },
  {
    id: 'JAS',
    enName: 'James',
    ptName: 'Tiago',
    enAliases: ['james', 'jas', 'jm'],
    ptAliases: ['tiago', 'tiag', 'tg'],
  },
  {
    id: '1PE',
    enName: '1 Peter',
    ptName: '1 Pedro',
    enAliases: ['1 peter', '1peter', '1 pet', '1pet', '1 pe', '1pe', '1 pt', '1pt'],
    ptAliases: ['1 pedro', '1pedro', '1 ped', '1ped', '1 pe', '1pe', '1 pt', '1pt'],
  },
  {
    id: '2PE',
    enName: '2 Peter',
    ptName: '2 Pedro',
    enAliases: ['2 peter', '2peter', '2 pet', '2pet', '2 pe', '2pe', '2 pt', '2pt'],
    ptAliases: ['2 pedro', '2pedro', '2 ped', '2ped', '2 pe', '2pe', '2 pt', '2pt'],
  },
  {
    id: '1JN',
    enName: '1 John',
    ptName: '1 João',
    enAliases: ['1 john', '1john', '1 jhn', '1jhn', '1 jn', '1jn'],
    ptAliases: ['1 joao', '1joao', '1 jo', '1jo'],
  },
  {
    id: '2JN',
    enName: '2 John',
    ptName: '2 João',
    enAliases: ['2 john', '2john', '2 jhn', '2jhn', '2 jn', '2jn'],
    ptAliases: ['2 joao', '2joao', '2 jo', '2jo'],
  },
  {
    id: '3JN',
    enName: '3 John',
    ptName: '3 João',
    enAliases: ['3 john', '3john', '3 jhn', '3jhn', '3 jn', '3jn'],
    ptAliases: ['3 joao', '3joao', '3 jo', '3jo'],
  },
  {
    id: 'JUD',
    enName: 'Jude',
    ptName: 'Judas',
    enAliases: ['jude', 'jud', 'jd'],
    ptAliases: ['judas', 'jud', 'jd'],
  },
  {
    id: 'REV',
    enName: 'Revelation',
    ptName: 'Apocalipse',
    enAliases: ['revelation', 'revelations', 'rev', 're'],
    ptAliases: ['apocalipse', 'apoc', 'ap'],
  },
];

function sanitizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]/g, ' ')      // replace non-alphanumeric with spaces
    .replace(/\s+/g, ' ')            // collapse multiple spaces
    .trim();
}

export function normalizeReference(rawInput: string): NormalizedReference | null {
  if (!rawInput || typeof rawInput !== 'string') {
    return null;
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return null;
  }

  // Matches book, chapter, startVerse, and optional endVerse
  // Examples: "John 3:16", "jo3:16", "Rm 8.28", "1 Co 13:4-7", "Salmos 23:1-3", "João 3:16 - 17"
  const match = trimmed.match(/^(?<rawBook>.*?)\s*(?<rawChapter>\d+)[:.](?<rawStartVerse>\d+)(?:\s*-\s*(?<rawEndVerse>\d+))?$/);
  if (!match || !match.groups) {
    return null;
  }

  const rawBook = match.groups.rawBook.trim();
  const chapter = parseInt(match.groups.rawChapter, 10);
  const startVerse = parseInt(match.groups.rawStartVerse, 10);
  const endVerse = match.groups.rawEndVerse ? parseInt(match.groups.rawEndVerse, 10) : undefined;

  if (chapter <= 0 || startVerse <= 0) {
    return null;
  }

  if (endVerse !== undefined && endVerse < startVerse) {
    return null;
  }

  const sanitizedBook = sanitizeString(rawBook);
  if (!sanitizedBook) {
    return null;
  }

function buildNormalizedReference(
  bookId: string,
  bookName: string,
  chapter: number,
  startVerse: number,
  endVerse: number | undefined,
  language: 'en' | 'pt',
): NormalizedReference {
  const span = endVerse !== undefined ? `${startVerse}-${endVerse}` : `${startVerse}`;
  return {
    bookId,
    bookName,
    chapter,
    startVerse,
    endVerse,
    canonicalRef: `${bookName} ${chapter}:${span}`,
    language,
  };
}

  // Also try collapsing spaces for numbered books like "1co" -> "1 co"
  const normalizedBookForm = sanitizedBook.replace(/^([1-3])\s*([a-z]+)$/, '$1 $2');
  const collapsedBookForm = sanitizedBook.replace(/^([1-3])\s*([a-z]+)$/, '$1$2');
  if (rawBook.toLowerCase().trim() === 'jó') {
    return buildNormalizedReference('JOB', 'Jó', chapter, startVerse, endVerse, 'pt');
  }

  for (const book of BOOKS) {
    // Check Portuguese aliases
    const matchedPt = book.ptAliases.some((alias) => {
      const cleanAlias = sanitizeString(alias);
      return (
        sanitizedBook === cleanAlias ||
        normalizedBookForm === cleanAlias ||
        collapsedBookForm === cleanAlias
      );
    });

    if (matchedPt) {
      return buildNormalizedReference(book.id, book.ptName, chapter, startVerse, endVerse, 'pt');
    }

    // Check English aliases
    const matchedEn = book.enAliases.some((alias) => {
      const cleanAlias = sanitizeString(alias);
      return (
        sanitizedBook === cleanAlias ||
        normalizedBookForm === cleanAlias ||
        collapsedBookForm === cleanAlias
      );
    });

    if (matchedEn) {
      return buildNormalizedReference(book.id, book.enName, chapter, startVerse, endVerse, 'en');
    }
  }

  return null;
}
