import { diffVerses, calculateScore, DiffToken } from './diffEngine';
import { stripSpokenReference, VerseReference } from './spokenReference';
import type { Language } from '../utils/languageNormalizer';

export { DiffToken, VerseReference };

/**
 * The Recitation Outcome under the Error Budget (CONTEXT.md, ADR 0017): no unaided errors is
 * `clean`, errors within the budget are a `slip`, and more errors than the budget is `forgotten`.
 */
export type RecitationOutcome = 'clean' | 'slip' | 'forgotten';

/** The share of a verse's words that may be unaided errors while it still counts as recalled. */
export const ERROR_BUDGET_RATE = 0.05;

/** Added words tolerated before each further added word counts as an error (filler, a repeat). */
export const ADDED_WORD_ALLOWANCE = 2;

export interface EvaluationInput {
  expectedText: string;
  transcribedText: string;
  /** The verse's own reference. A spoken copy of it at the start or end of the transcript is ignored. */
  reference?: VerseReference | null;
  /** The verse's language, used to read digits in the transcript as number words. */
  language?: Language;
  /**
   * Canonical word positions (from 0, as the diff counts words) revealed with the Word Peek
   * Lifeline during the attempt. Each counts as one error, even if the word was then recited.
   */
  peekedWordPositions?: readonly number[];
}

export interface RecitationEvaluation {
  tokens: DiffToken[];
  /** Word-level F1 score, 0–100. Kept for display and the Review Log; it does not decide the outcome. */
  rawScore: number;
  /** Unaided errors: canonical words missed or peeked (once each), plus added words beyond two. */
  errorCount: number;
  /** Errors the verse may contain and still count as recalled. */
  errorBudget: number;
  outcome: RecitationOutcome;
}

/** The Error Budget for a verse of `wordCount` canonical words: 5% of them, never less than one. */
export function errorBudgetFor(wordCount: number): number {
  return Math.max(1, Math.round(ERROR_BUDGET_RATE * wordCount));
}

/** Whether the outcome counts as recalled (`clean` or `slip`). */
export function isRecalled(outcome: RecitationOutcome): boolean {
  return outcome !== 'forgotten';
}

/**
 * Pure, deterministic verification of a scripture recitation: sequence alignment with diacritic,
 * abbreviation and number tolerance (ADR 0001, 0014), the raw F1 score, and the Error Budget
 * outcome. Scheduling is the SM-2 engine's job, from the outcome.
 */
export function evaluateRecitation(input: EvaluationInput): RecitationEvaluation {
  const transcript = input.reference
    ? stripSpokenReference(input.transcribedText, input.reference)
    : input.transcribedText;
  const tokens = diffVerses(input.expectedText, transcript, { language: input.language });
  const rawScore = calculateScore(tokens);

  const peeked = new Set(input.peekedWordPositions ?? []);
  let wordCount = 0;
  let unaidedWordErrors = 0;
  let added = 0;
  for (const token of tokens) {
    if (token.status === 'added') {
      added++;
      continue;
    }
    const position = wordCount++;
    if (token.status === 'missed' || peeked.has(position)) unaidedWordErrors++;
  }

  const errorCount = unaidedWordErrors + Math.max(0, added - ADDED_WORD_ALLOWANCE);
  const errorBudget = errorBudgetFor(wordCount);
  const outcome: RecitationOutcome =
    errorCount === 0 ? 'clean' : errorCount <= errorBudget ? 'slip' : 'forgotten';

  return { tokens, rawScore, errorCount, errorBudget, outcome };
}
