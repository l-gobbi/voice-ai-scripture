import { Verse, VerseStorageService } from './VerseStorageService';
import { diffVerses, calculateScore, DiffToken } from '../engines/diffEngine';
import { calculateNextReview, DEFAULT_SRS_STATE, PASSING_SCORE_THRESHOLD, SRSResult, SRSState } from '../engines/srsEngine';

export interface VoiceRecitationResult {
  tokens: DiffToken[];
  score: number;
  passed: boolean;
  srsResult: SRSResult;
}

export async function processVoiceRecitation(
  verse: Verse,
  transcript: string
): Promise<VoiceRecitationResult> {
  const tokens = diffVerses(verse.text, transcript);
  const score = calculateScore(tokens);
  const passed = score >= PASSING_SCORE_THRESHOLD;

  const currentSRS: SRSState = verse.srs || DEFAULT_SRS_STATE;
  const srsResult = calculateNextReview(currentSRS, score);

  // Persist to local storage
  await VerseStorageService.updateVerseSRS(verse.id, srsResult);

  return {
    tokens,
    score,
    passed,
    srsResult,
  };
}
