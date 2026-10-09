/**
 * Spelled-out cardinal numbers in English and Portuguese.
 *
 * Words are comparison keys: lowercase, without diacritics or punctuation ("três" is "tres").
 */

type Lexeme =
  | { kind: 'zero' }
  | { kind: 'unit' | 'teen' | 'ten' | 'hundreds'; value: number }
  /** English "hundred", which multiplies the unit before it. */
  | { kind: 'hundred' }
  /** "thousand", "mil", "million": `bare` when it may stand alone ("mil" is 1000). */
  | { kind: 'scale'; value: number; bare: boolean }
  /** English "a"/"an", which is one only before "hundred" or a scale ("a hundred"). */
  | { kind: 'article' }
  /** "and"/"e" between the parts of a number. */
  | { kind: 'connector' };

const entries = (kind: 'unit' | 'teen' | 'ten' | 'hundreds', words: Record<string, number>) =>
  Object.entries(words).map(([word, value]) => [word, { kind, value }] as const);

const LEXICON = new Map<string, Lexeme>([
  ['zero', { kind: 'zero' }],
  ...entries('unit', {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
  }),
  ...entries('teen', {
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, quinze: 15,
    dezesseis: 16, dezasseis: 16, dezessete: 17, dezassete: 17, dezoito: 18, dezenove: 19, dezanove: 19,
  }),
  ...entries('ten', {
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
  }),
  ...entries('hundreds', {
    cem: 100, cento: 100,
    duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300,
    quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500,
    seiscentos: 600, seiscentas: 600, setecentos: 700, setecentas: 700,
    oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900,
  }),
  ['hundred', { kind: 'hundred' }],
  ['thousand', { kind: 'scale', value: 1_000, bare: false }],
  ['million', { kind: 'scale', value: 1_000_000, bare: false }],
  ['mil', { kind: 'scale', value: 1_000, bare: true }],
  ['milhao', { kind: 'scale', value: 1_000_000, bare: false }],
  ['milhoes', { kind: 'scale', value: 1_000_000, bare: false }],
  ['a', { kind: 'article' }],
  ['an', { kind: 'article' }],
  ['and', { kind: 'connector' }],
  ['e', { kind: 'connector' }],
]);

interface Parsed {
  value: number;
  next: number;
}

/** 1–99: "quarenta e quatro", "forty four", and the archaic "four and twenty". */
function parseBelowHundred(lexemes: Lexeme[], at: number): Parsed | null {
  const first = lexemes[at];
  if (first?.kind === 'teen') return { value: first.value, next: at + 1 };
  if (first?.kind === 'ten') {
    const unitAt = lexemes[at + 1]?.kind === 'connector' ? at + 2 : at + 1;
    const unit = lexemes[unitAt];
    return unit?.kind === 'unit'
      ? { value: first.value + unit.value, next: unitAt + 1 }
      : { value: first.value, next: at + 1 };
  }
  if (first?.kind === 'unit') {
    const ten = lexemes[at + 2];
    if (lexemes[at + 1]?.kind === 'connector' && ten?.kind === 'ten') {
      return { value: ten.value + first.value, next: at + 3 };
    }
    return { value: first.value, next: at + 1 };
  }
  return null;
}

/** 1–999: "cento e quarenta e quatro", "one hundred and forty-four", "an hundred". */
function parseGroup(lexemes: Lexeme[], at: number): Parsed | null {
  const first = lexemes[at];
  const second = lexemes[at + 1];
  let value = 0;
  let next = at;

  if (first?.kind === 'hundreds') {
    value = first.value;
    next = at + 1;
  } else if ((first?.kind === 'unit' || first?.kind === 'article') && second?.kind === 'hundred') {
    value = (first.kind === 'unit' ? first.value : 1) * 100;
    next = at + 2;
  } else if (first?.kind === 'article' && second?.kind === 'scale') {
    return { value: 1, next: at + 1 };
  }

  const hasHundreds = next > at;
  const belowAt = hasHundreds && lexemes[next]?.kind === 'connector' ? next + 1 : next;
  const below = parseBelowHundred(lexemes, belowAt);
  if (below) return { value: value + below.value, next: below.next };
  return hasHundreds ? { value, next } : null;
}

/**
 * Reads a whole run of number words as one cardinal, or returns null when the run is not
 * exactly one number ("vinte e três" is 23; "three sixteen" and "and four" are not numbers).
 */
export function parseNumberWords(words: readonly string[]): number | null {
  const found = words.map((word) => LEXICON.get(word));
  if (found.length === 0 || found.some((lexeme) => lexeme === undefined)) return null;
  const lexemes = found as Lexeme[];
  if (lexemes.length === 1 && lexemes[0].kind === 'zero') return 0;

  let total = 0;
  let lastScale = Infinity;
  let at = 0;
  for (;;) {
    const group = parseGroup(lexemes, at);
    const next = group ? group.next : at;
    const scale = lexemes[next];

    if (scale?.kind !== 'scale') {
      return group && next === lexemes.length ? total + group.value : null;
    }
    if (scale.value >= lastScale || (!group && !scale.bare)) return null;

    total += (group ? group.value : 1) * scale.value;
    lastScale = scale.value;
    at = next + 1;
    if (at === lexemes.length) return total;
    // "mil e quinhentos", "one thousand and one"
    if (lexemes[at].kind === 'connector') at++;
    if (at === lexemes.length) return null;
  }
}

/** Whether a word can be part of a spelled-out number. */
export function isNumberWord(word: string): boolean {
  return LEXICON.has(word);
}

const EN_BELOW_TWENTY = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const PT_BELOW_TWENTY = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
  'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
];
const PT_TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const PT_HUNDREDS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
  'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
];

/** 1–99 as its parts, highest first: 44 is [40, 4]. */
const belowHundredParts = (n: number, belowTwenty: string[], tens: string[]): string[] =>
  n < 20 ? [belowTwenty[n]] : [tens[Math.floor(n / 10)], ...(n % 10 ? [belowTwenty[n % 10]] : [])];

/** 1–999 in English: "one hundred forty four". */
function englishGroup(n: number): string[] {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [
    ...(hundreds ? [EN_BELOW_TWENTY[hundreds], 'hundred'] : []),
    ...(rest ? belowHundredParts(rest, EN_BELOW_TWENTY, EN_TENS) : []),
  ];
}

/** 1–999 in Portuguese: "cento e quarenta e quatro". */
function portugueseGroup(n: number): string[] {
  if (n === 100) return ['cem'];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [
    ...(hundreds ? [PT_HUNDREDS[hundreds]] : []),
    ...(rest ? belowHundredParts(rest, PT_BELOW_TWENTY, PT_TENS) : []),
  ];
  return parts.flatMap((part, index) => (index === 0 ? [part] : ['e', part]));
}

/** The largest number spelled out; larger numbers keep their digits. */
export const MAX_SPELLED_NUMBER = 999_999_999;

/**
 * Spells out a cardinal in its usual form, as words with diacritics:
 * 144 is "one hundred forty four" in en and "cento e quarenta e quatro" in pt.
 */
export function spellNumber(value: number, language: 'en' | 'pt'): string[] {
  if (!Number.isInteger(value) || value < 0 || value > MAX_SPELLED_NUMBER) return [];
  if (value === 0) return ['zero'];

  const millions = Math.floor(value / 1_000_000);
  const thousands = Math.floor(value / 1_000) % 1_000;
  const rest = value % 1_000;

  if (language === 'en') {
    return [
      ...(millions ? [...englishGroup(millions), 'million'] : []),
      ...(thousands ? [...englishGroup(thousands), 'thousand'] : []),
      ...(rest ? englishGroup(rest) : []),
    ];
  }

  const words = [
    ...(millions ? (millions === 1 ? ['um', 'milhão'] : [...portugueseGroup(millions), 'milhões']) : []),
    ...(thousands ? (thousands === 1 ? ['mil'] : [...portugueseGroup(thousands), 'mil']) : []),
  ];
  // "mil e quinhentos", "mil e vinte", but "mil cento e vinte"
  if (rest && words.length > 0 && (rest < 100 || rest % 100 === 0)) words.push('e');
  return [...words, ...(rest ? portugueseGroup(rest) : [])];
}
