import { useState, useEffect, useRef, useCallback } from 'react';
import { Verse } from '../services/VerseEngine';
import {
  RecitationSession,
  RecitationState,
  VoiceRecitationResult,
  SpeechTranscriber,
} from '../services/RecitationSession';
import { SubscriptionService } from '../services/SubscriptionService';

export interface UseRecitationSessionOptions {
  transcriber?: SpeechTranscriber;
  subscriptionService?: SubscriptionService;
}

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
      sessionRef.current.reset();
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

    return () => {
      unsubscribe();
      session.reset();
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
