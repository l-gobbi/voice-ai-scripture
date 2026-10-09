import { useState, useEffect, useRef, useCallback } from 'react';
import { Verse } from '../services/VerseEngine';
import {
  RecitationSession,
  RecitationSessionOptions,
  RecitationState,
  RecitationLevel,
  RelearningState,
  VoiceRecitationResult,
  SpeechSynthesizer,
  ClozeToken,
} from '../services/RecitationSession';

export type {
  RecitationSessionOptions,
  RecitationState,
  RecitationLevel,
  RelearningState,
  VoiceRecitationResult,
  ClozeToken,
};

export interface UseRecitationSessionOptions extends RecitationSessionOptions {}

export function useRecitationSession(
  verse: Verse,
  options?: UseRecitationSessionOptions
) {
  const sessionRef = useRef<RecitationSession | null>(null);
  const verseRef = useRef(verse);

  if (
    !sessionRef.current ||
    verseRef.current.id !== verse.id ||
    verseRef.current.text !== verse.text
  ) {
    if (sessionRef.current) {
      sessionRef.current.dispose();
    }
    sessionRef.current = new RecitationSession(verse, options);
    verseRef.current = verse;
  }

  const [state, setState] = useState<RecitationState>(() =>
    sessionRef.current!.getState()
  );

  useEffect(() => {
    const session = sessionRef.current!;
    setState(session.getState());
    const unsubscribe = session.subscribe((nextState) => {
      setState(nextState);
    });

    session.warmUp().catch(() => {});

    return () => {
      unsubscribe();
      session.dispose();
    };
  }, [verse.id, verse.text]);

  const warmUp = useCallback(async () => {
    await sessionRef.current?.warmUp();
  }, []);

  /**
   * `unmetered: true` skips the recitation quota for this attempt; it can never meter one. The
   * Verse Engine decides scheduling.
   */
  const startReciting = useCallback(async (opts?: { unmetered?: boolean }) => {
    await sessionRef.current?.startReciting(opts);
  }, []);

  const stopAndVerify = useCallback(async (): Promise<VoiceRecitationResult | null> => {
    return (await sessionRef.current?.stopAndVerify()) ?? null;
  }, []);

  const reset = useCallback(async () => {
    await sessionRef.current?.reset();
  }, []);

  const setLevel = useCallback((level: RecitationLevel) => {
    sessionRef.current?.setLevel(level);
  }, []);

  const nextLevel = useCallback(() => {
    sessionRef.current?.nextLevel();
  }, []);

  const practiceAgain = useCallback(() => {
    sessionRef.current?.practiceAgain();
  }, []);

  const acceptRelearning = useCallback(() => {
    sessionRef.current?.acceptRelearning();
  }, []);

  const declineRelearning = useCallback(() => {
    sessionRef.current?.declineRelearning();
  }, []);

  const toggleTextReveal = useCallback(() => {
    sessionRef.current?.toggleTextReveal();
  }, []);

  const tapWord = useCallback((index: number) => {
    sessionRef.current?.tapWord(index);
  }, []);

  const vocalize = useCallback(async () => {
    await sessionRef.current?.vocalize();
  }, []);

  const cancelRecitation = useCallback(async () => {
    await sessionRef.current?.cancelRecitation();
  }, []);

  const isReciting = state.status === 'reciting';
  const isVerifying = state.status === 'verifying';

  return {
    ...state,
    isReciting,
    isVerifying,
    warmUp,
    startReciting,
    stopAndVerify,
    cancelRecitation,
    reset,
    setLevel,
    nextLevel,
    practiceAgain,
    acceptRelearning,
    declineRelearning,
    toggleTextReveal,
    tapWord,
    vocalize,
  };
}
