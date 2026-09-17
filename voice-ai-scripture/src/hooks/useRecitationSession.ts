import { useState, useEffect, useRef, useCallback } from 'react';
import { Verse } from '../services/VerseStorageService';
import {
  RecitationSession,
  RecitationState,
  VoiceRecitationResult,
  SpeechTranscriber,
} from '../services/RecitationSession';

export interface UseRecitationSessionOptions {
  transcriber?: SpeechTranscriber;
}

export function useRecitationSession(
  verse: Verse,
  options?: UseRecitationSessionOptions
) {
  const sessionRef = useRef<RecitationSession | null>(null);

  if (!sessionRef.current) {
    sessionRef.current = new RecitationSession(verse, options);
  }

  const [state, setState] = useState<RecitationState>(() =>
    sessionRef.current!.getState()
  );

  useEffect(() => {
    sessionRef.current = new RecitationSession(verse, options);
    const session = sessionRef.current;
    const unsubscribe = session.subscribe((nextState) => {
      setState(nextState);
    });

    return () => {
      unsubscribe();
    };
  }, [verse.id, verse.text]);

  const startReciting = useCallback(async () => {
    await sessionRef.current?.startReciting();
  }, []);

  const stopAndVerify = useCallback(async (): Promise<VoiceRecitationResult | null> => {
    return (await sessionRef.current?.stopAndVerify()) ?? null;
  }, []);

  const reset = useCallback(async () => {
    await sessionRef.current?.reset();
  }, []);

  return {
    ...state,
    startReciting,
    stopAndVerify,
    reset,
  };
}
