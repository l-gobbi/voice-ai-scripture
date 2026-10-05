export type DiffStatus = 'correct' | 'missed' | 'added';

export interface DiffToken {
  word: string;
  status: DiffStatus;
}

const ABBREVIATION_MAP: Record<string, string> = {
  // Portuguese honorifics & biblical abbreviations commonly emitted by STT
  sr: 'senhor',
  sra: 'senhor',
  snr: 'senhor',
  snra: 'senhor',
  sto: 'santo',
  sta: 'santa',
  cap: 'capitulo',
  vs: 'versiculo',

  // English honorifics & biblical abbreviations
  st: 'saint',
  mr: 'mister',
  mrs: 'missus',
  ms: 'miss',
  dr: 'doctor',
  mt: 'mount',
  ch: 'chapter',
};

export const toComparisonKey = (word: string): string => {
  const stripped = word
    .toLowerCase()
    // Normalize curly apostrophes to straight single quote
    .replace(/[\u2018\u2019]/g, "'")
    // Normalize unicode and strip diacritics/accents (e.g. é -> e, á -> a, ç -> c, ã -> a)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    // Strip non-alphanumeric and non-apostrophe characters
    .replace(/[^\p{L}\p{N}']/gu, '');

  return ABBREVIATION_MAP[stripped] ?? stripped;
};

export interface AlignedToken {
  display: string;
  key: string;
}

const tokenize = (text: string): AlignedToken[] => {
  if (!text || text.trim().length === 0) return [];
  // Replace dashes and hyphens with spaces so joined words split cleanly
  const splitText = text.replace(/[-—–]/g, ' ');
  const rawTokens = splitText.split(/\s+/).filter((w) => w.length > 0);
  return rawTokens
    .map((display) => ({
      display,
      key: toComparisonKey(display),
    }))
    .filter((t) => t.key.length > 0);
};

export function diffVerses(expectedStr: string, transcribedStr: string): DiffToken[] {
  const expectedTokens = tokenize(expectedStr);
  const transcribedTokens = tokenize(transcribedStr);

  if (expectedTokens.length === 0 && transcribedTokens.length === 0) return [];
  if (expectedTokens.length === 0) {
    return transcribedTokens.map((t) => ({ word: t.display, status: 'added' }));
  }
  if (transcribedTokens.length === 0) {
    return expectedTokens.map((t) => ({ word: t.display, status: 'missed' }));
  }

  // Edit distance matrix for optimal sequence alignment
  const editDistanceMatrix: number[][] = Array(expectedTokens.length + 1)
    .fill(null)
    .map(() => Array(transcribedTokens.length + 1).fill(0));

  for (let i = 1; i <= expectedTokens.length; i++) editDistanceMatrix[i][0] = i;
  for (let j = 1; j <= transcribedTokens.length; j++) editDistanceMatrix[0][j] = j;

  for (let i = 1; i <= expectedTokens.length; i++) {
    for (let j = 1; j <= transcribedTokens.length; j++) {
      if (expectedTokens[i - 1].key === transcribedTokens[j - 1].key) {
        editDistanceMatrix[i][j] = editDistanceMatrix[i - 1][j - 1];
      } else {
        editDistanceMatrix[i][j] = 1 + Math.min(
          editDistanceMatrix[i - 1][j],
          editDistanceMatrix[i][j - 1],
          editDistanceMatrix[i - 1][j - 1]
        );
      }
    }
  }

  // Backtrack to find alignment
  let i = expectedTokens.length;
  let j = transcribedTokens.length;
  const result: DiffToken[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && expectedTokens[i - 1].key === transcribedTokens[j - 1].key) {
      result.unshift({ word: expectedTokens[i - 1].display, status: 'correct' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || editDistanceMatrix[i][j - 1] + 1 === editDistanceMatrix[i][j])) {
      result.unshift({ word: transcribedTokens[j - 1].display, status: 'added' });
      j--;
    } else if (i > 0 && (j === 0 || editDistanceMatrix[i - 1][j] + 1 === editDistanceMatrix[i][j])) {
      result.unshift({ word: expectedTokens[i - 1].display, status: 'missed' });
      i--;
    } else {
      result.unshift({ word: transcribedTokens[j - 1].display, status: 'added' });
      result.unshift({ word: expectedTokens[i - 1].display, status: 'missed' });
      i--;
      j--;
    }
  }

  return result;
}

export function calculateScore(diffTokens: DiffToken[]): number {
  if (diffTokens.length === 0) return 0;

  const correctCount = diffTokens.filter((t) => t.status === 'correct').length;
  if (correctCount === 0) return 0;

  const missedCount = diffTokens.filter((t) => t.status === 'missed').length;
  const addedCount = diffTokens.filter((t) => t.status === 'added').length;

  const totalExpected = correctCount + missedCount;
  if (totalExpected === 0) return 0;

  // Balanced F1 accuracy: harmonic mean of Recall (verse coverage) and Precision (absence of hallucinations/stutter)
  const recall = correctCount / totalExpected;
  const precision = correctCount / (correctCount + addedCount);

  if (recall + precision === 0) return 0;

  const f1Score = (2 * (recall * precision)) / (recall + precision);
  return Math.round(f1Score * 100);
}
