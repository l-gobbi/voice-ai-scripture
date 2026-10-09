import { diffVerses, calculateScore, DiffToken } from './diffEngine';
import {
  calculateNextReview,
  SRSState,
  SRSResult,
  DEFAULT_SRS_STATE,
} from './srsEngine';
import { readStudyDay } from './studyDay';
import { stripSpokenReference, VerseReference } from './spokenReference';

export { DiffToken, SRSState, SRSResult, VerseReference };

export const ASSISTED_SCORE_CAP = 75;

export interface EvaluationInput {
  expectedText: string;
  transcribedText: string;
  /** The verse's own reference. A spoken copy of it at the start or end of the transcript is ignored. */
  reference?: VerseReference | null;
  /** The verse's language, used to read digits in the transcript as number words. */
  language?: 'en' | 'pt';
  assistanceUsed?: boolean;
  currentSRS?: SRSState & {
    nextReviewDate?: string;
    lastScore?: number;
  };
  isUnmetered?: boolean;
}

export interface RecitationEvaluation {
  tokens: DiffToken[];
  rawScore: number;
  finalScore: number;
  passed: boolean;
  isAssisted: boolean;
  srsResult: SRSResult;
}

/**
 * Pure, deterministic mathematical evaluation pipeline for scripture recitation.
 * Consolidates sequence alignment, diacritic tolerance, honorific abbreviation expansion,
 * balanced F1 accuracy scoring, assistance score capping, and SuperMemo-2 scheduling projection.
 */
export function evaluateRecitation(input: EvaluationInput): RecitationEvaluation {
  const transcript = input.reference
    ? stripSpokenReference(input.transcribedText, input.reference)
    : input.transcribedText;
  const tokens = diffVerses(input.expectedText, transcript, { language: input.language });
  const rawScore = calculateScore(tokens);

  const isAssisted = !!input.assistanceUsed;
  const finalScore = isAssisted ? Math.min(rawScore, ASSISTED_SCORE_CAP) : rawScore;

  const srsState = input.currentSRS ?? DEFAULT_SRS_STATE;
  const simulatedSRS = calculateNextReview(srsState, finalScore);

  let srsResult: SRSResult;
  if (input.isUnmetered) {
    srsResult = {
      ...simulatedSRS,
      // Keep the stored due Study Day (legacy ISO timestamps read as the Study Day they fall in).
      nextReviewDate: readStudyDay(input.currentSRS?.nextReviewDate) ?? simulatedSRS.nextReviewDate,
      intervalDays: srsState.intervalDays ?? 0,
      streak: srsState.streak ?? 0,
    };
  } else {
    srsResult = simulatedSRS;
  }

  const passed = srsResult.passed;

  return {
    tokens,
    rawScore,
    finalScore,
    passed,
    isAssisted,
    srsResult,
  };
}

