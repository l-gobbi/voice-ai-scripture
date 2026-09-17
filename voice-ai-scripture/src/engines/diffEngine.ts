export type DiffStatus = 'correct' | 'missed' | 'added';

export interface DiffToken {
  word: string;
  status: DiffStatus;
}

const normalize = (text: string): string[] =>
  text
    .toLowerCase()
    // Normalize curly apostrophes to straight single quote
    .replace(/[\u2018\u2019]/g, "'")
    // Replace dashes and hyphens with spaces so joined words split cleanly
    .replace(/[-—–]/g, ' ')
    // Strip other punctuation while preserving letters, numbers, whitespace, and apostrophes
    .replace(/[^\w\s']/gi, '')
    .split(/\s+/)
    .filter((w) => w.length > 0);

export function diffVerses(expectedStr: string, transcribedStr: string): DiffToken[] {
  const expectedWords = normalize(expectedStr);
  const transcribedWords = normalize(transcribedStr);

  if (expectedWords.length === 0 && transcribedWords.length === 0) return [];
  if (expectedWords.length === 0) {
    return transcribedWords.map((word) => ({ word, status: 'added' }));
  }
  if (transcribedWords.length === 0) {
    return expectedWords.map((word) => ({ word, status: 'missed' }));
  }

  // Edit distance matrix for optimal sequence alignment
  const editDistanceMatrix: number[][] = Array(expectedWords.length + 1)
    .fill(null)
    .map(() => Array(transcribedWords.length + 1).fill(0));

  for (let i = 1; i <= expectedWords.length; i++) editDistanceMatrix[i][0] = i;
  for (let j = 1; j <= transcribedWords.length; j++) editDistanceMatrix[0][j] = j;

  for (let i = 1; i <= expectedWords.length; i++) {
    for (let j = 1; j <= transcribedWords.length; j++) {
      if (expectedWords[i - 1] === transcribedWords[j - 1]) {
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
  let i = expectedWords.length;
  let j = transcribedWords.length;
  const result: DiffToken[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && expectedWords[i - 1] === transcribedWords[j - 1]) {
      result.unshift({ word: expectedWords[i - 1], status: 'correct' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || editDistanceMatrix[i][j - 1] + 1 === editDistanceMatrix[i][j])) {
      result.unshift({ word: transcribedWords[j - 1], status: 'added' });
      j--;
    } else if (i > 0 && (j === 0 || editDistanceMatrix[i - 1][j] + 1 === editDistanceMatrix[i][j])) {
      result.unshift({ word: expectedWords[i - 1], status: 'missed' });
      i--;
    } else {
      result.unshift({ word: transcribedWords[j - 1], status: 'added' });
      result.unshift({ word: expectedWords[i - 1], status: 'missed' });
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
