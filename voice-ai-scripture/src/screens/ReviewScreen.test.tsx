import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import ReviewScreen from './ReviewScreen';
import { Verse, verseEngine } from '../services/VerseEngine';
import { SubscriptionService } from '../services/SubscriptionService';
import {
  setDefaultSpeechSynthesizer,
  MockSpeechSynthesizer,
} from '../services/SpeechSynthesizer';
import { SimulatedVoiceAdapter } from '../services/VoiceInput';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('ReviewScreen Integration: Three-Tier Scaffolded Recitation (Ticket 29)', () => {
  const mockVerse: Verse = {
    id: 'verse-1',
    reference: 'Philippians 4:13',
    text: 'I can do all this through him who gives me strength.',
  };

  let mockSynthesizer: MockSpeechSynthesizer;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSynthesizer = new MockSpeechSynthesizer();
    setDefaultSpeechSynthesizer(mockSynthesizer);
  });

  afterEach(() => {
    setDefaultSpeechSynthesizer(null);
    jest.useRealTimers();
  });

  it('renders default Level 3 (Blind Recitation) with 3-tier segmented control and floating mic button', async () => {
    const onComplete = jest.fn();
    const { getByText, getByTestId, queryByTestId } = await render(
      <ReviewScreen verse={mockVerse} onComplete={onComplete} />
    );

    expect(getByText('Philippians 4:13')).toBeTruthy();
    expect(getByText('1. Echo')).toBeTruthy();
    expect(getByText('2. Cloze')).toBeTruthy();
    expect(getByText('3. Recite')).toBeTruthy();
    expect(getByText('Level 3: Blind Recitation (Active Recall)')).toBeTruthy();
    expect(getByTestId('floating-mic-button')).toBeTruthy();
    expect(getByText('🎙️')).toBeTruthy();
    expect(getByText('Recite the full verse from memory into the mic.')).toBeTruthy();
    expect(queryByTestId('floating-mic-cancel')).toBeNull();
  });

  it('switches to Level 1 (Echo Mode), auto-vocalizes, and toggles text reveal', async () => {
    const onComplete = jest.fn();
    const { getByText, queryByText } = await render(
      <ReviewScreen verse={mockVerse} onComplete={onComplete} />
    );

    // Switch to Level 1: Echo Mode
    await act(async () => {
      fireEvent.press(getByText('1. Echo'));
    });

    expect(getByText('Level 1: Echo Mode (Listen & Read Aloud)')).toBeTruthy();
    expect(getByText('Reveal Text')).toBeTruthy();
    expect(queryByText('I can do all this through him who gives me strength.')).toBeNull();

    // Verify auto-vocalization called
    expect(mockSynthesizer.getSpokenUtterances().length).toBeGreaterThan(0);
    expect(mockSynthesizer.getSpokenUtterances()[0].text).toBe(mockVerse.text);

    // Toggle reveal text
    await act(async () => {
      fireEvent.press(getByText('Reveal Text'));
    });

    expect(getByText('I can do all this through him who gives me strength.')).toBeTruthy();
    expect(getByText('Conceal Text')).toBeTruthy();
  });

  it('switches to Level 2 (Cloze Practice) and reveals a tapped blanked word inline permanently', async () => {
    const onComplete = jest.fn();
    const { getByText, findByText } = await render(
      <ReviewScreen verse={mockVerse} onComplete={onComplete} />
    );

    // Switch to Level 2: Cloze Practice
    await act(async () => {
      fireEvent.press(getByText('2. Cloze'));
    });

    expect(getByText('Level 2: Cloze Practice')).toBeTruthy();
    expect(getByText('🔊 Listen')).toBeTruthy();

    // In first-letter cloze mode, 'through' (7 chars) is masked as 't______ '
    const maskedWord = await findByText(/t______/);
    expect(maskedWord).toBeTruthy();

    // Tap word to reveal inline
    await act(async () => {
      fireEvent.press(maskedWord);
    });

    expect(await findByText(/through/)).toBeTruthy();
  });

  it('in Level 3 (Blind Recitation), tapping a word triggers Word Peek Lifeline and caps score at 75%', async () => {
    const onComplete = jest.fn();
    const recordSpy = jest.spyOn(verseEngine, 'recordReview').mockResolvedValue({
      streak: 1,
      repetitions: 1,
      intervalDays: 1,
      easeFactor: 2.5,
      nextReviewDate: new Date(),
      passed: true,
    });

    const mockVoiceInput = new SimulatedVoiceAdapter({
      defaultTranscript: mockVerse.text,
    });

    const { getByText, findAllByText, findByText, getByTestId } = await render(
      <ReviewScreen
        verse={mockVerse}
        onComplete={onComplete}
        voiceInput={mockVoiceInput}
      />
    );

    // In Level 3, all words are blanked. Find the blank tokens
    const blankTokens = await findAllByText(/_+/);
    expect(blankTokens.length).toBeGreaterThan(0);

    // Tap the first blank word lifeline
    await act(async () => {
      fireEvent.press(blankTokens[0]);
    });

    // Lifeline banner is visible
    expect(getByText(/Word Peek Lifeline used/)).toBeTruthy();

    // Start voice recitation via floating mic button
    await act(async () => {
      fireEvent.press(getByTestId('floating-mic-button'));
    });

    // In active reciting state, hint changes and stop icon renders
    expect(
      await findByText('Listening... Tap button to verify (or pause 3.5s)')
    ).toBeTruthy();
    expect(getByText('⏹')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();

    // Stop and verify via floating mic button
    await act(async () => {
      fireEvent.press(getByTestId('floating-mic-button'));
    });

    // Verify assisted score is recorded and capped at 75%
    expect(recordSpy).toHaveBeenCalled();
    const recordedScore = recordSpy.mock.calls[0][1];
    expect(recordedScore).toBeLessThanOrEqual(75);
  });

  it('in Level 3 (Blind Recitation), multiple word peeks each schedule an independent 3s re-hide timer without leaking', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const onComplete = jest.fn();

    const { findAllByText, queryByText } = await render(
      <ReviewScreen verse={mockVerse} onComplete={onComplete} />
    );

    const blankTokens = await findAllByText(/_+/);
    expect(blankTokens.length).toBeGreaterThan(2);

    // Tap first word (I)
    await act(async () => {
      fireEvent.press(blankTokens[0]);
    });
    expect(queryByText(/^I\s*$/)).toBeTruthy();

    // Tap second word (can)
    await act(async () => {
      fireEvent.press(blankTokens[1]);
    });
    expect(queryByText(/^can\s*$/)).toBeTruthy();

    // Verify both word peeks scheduled independent 3000ms timeouts
    const peekTimerCalls = setTimeoutSpy.mock.calls.filter((call) => call[1] === 3000);
    expect(peekTimerCalls.length).toBeGreaterThanOrEqual(2);

    // Execute both timer callbacks to verify both words re-hide
    await act(async () => {
      peekTimerCalls[0][0]();
      peekTimerCalls[1][0]();
    });

    expect(queryByText(/^I\s*$/)).toBeNull();
    expect(queryByText(/^can\s*$/)).toBeNull();

    setTimeoutSpy.mockRestore();
  });

  it('displays devotional cooldown message on rate limit and never displays paywall modal', async () => {
    jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
      allowed: false,
      reason: 'rate_limited',
      retryAfterSeconds: 45,
      remaining: 0,
    });

    const onComplete = jest.fn();
    const { findByText, getByTestId, queryByText } = await render(
      <ReviewScreen verse={mockVerse} onComplete={onComplete} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('floating-mic-button'));
    });

    expect(
      await findByText(
        'Taking a quick breath... Please wait a few seconds before your next recitation.'
      )
    ).toBeTruthy();

    // Never displays paywall modal
    expect(queryByText('Unlock Unlimited Voice AI')).toBeNull();
  });

  it('bilingual support: detects Portuguese verse and renders localized hints and Cancelar link', async () => {
    const ptVerse: Verse = {
      id: 'pt-1',
      reference: 'João 3:16',
      text: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito.',
      translation: 'ARC',
    };

    const onComplete = jest.fn();
    const { getByText, getByTestId, queryByTestId, findByText } = await render(
      <ReviewScreen verse={ptVerse} onComplete={onComplete} />
    );

    // Portuguese idle hint
    expect(getByText('Recite o versículo de memória no microfone.')).toBeTruthy();

    // Start reciting
    await act(async () => {
      fireEvent.press(getByTestId('floating-mic-button'));
    });

    // Portuguese active reciting hint and Cancelar button
    expect(
      await findByText('Ouvindo... Toque no botão para verificar (ou pause 3.5s)')
    ).toBeTruthy();
    expect(getByText('Cancelar')).toBeTruthy();

    // Tapping Cancelar aborts without verifying and returns to idle
    await act(async () => {
      fireEvent.press(getByTestId('floating-mic-cancel'));
    });

    expect(queryByTestId('floating-mic-cancel')).toBeNull();
    expect(getByText('Recite o versículo de memória no microfone.')).toBeTruthy();
  });

  it('bilingual support: Portuguese verse renders localized devotional cooldown on rate limit', async () => {
    const ptVerse: Verse = {
      id: 'pt-2',
      reference: 'Salmos 23:1',
      text: 'O Senhor é o meu pastor, nada me faltará.',
      translation: 'ARC',
    };

    jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
      allowed: false,
      reason: 'rate_limited',
      retryAfterSeconds: 30,
      remaining: 0,
    });

    const onComplete = jest.fn();
    const { getByTestId, findByText } = await render(
      <ReviewScreen verse={ptVerse} onComplete={onComplete} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('floating-mic-button'));
    });

    expect(
      await findByText(
        'Respirando fundo... Aguarde alguns segundos antes da próxima recitação.'
      )
    ).toBeTruthy();
  });

  it('displays localized initial silence prompt if 10s grace expires without speech (English & Portuguese)', async () => {
    // 1. English
    const onCompleteEn = jest.fn();
    const { getByTestId: getByTestIdEn, findByText: findByTextEn } = await render(
      <ReviewScreen verse={mockVerse} onComplete={onCompleteEn} />
    );

    jest.useFakeTimers();
    try {
      await act(async () => {
        fireEvent.press(getByTestIdEn('floating-mic-button'));
      });

      await act(async () => {
        jest.advanceTimersByTime(10500);
      });

      expect(
        await findByTextEn('No speech detected. Tap the mic to try again.')
      ).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }

    // 2. Portuguese
    const ptVerse: Verse = {
      id: 'pt-3',
      reference: 'Gênesis 1:1',
      text: 'No princípio, criou Deus os céus e a terra.',
      translation: 'ARC',
    };

    const onCompletePt = jest.fn();
    const { getByTestId: getByTestIdPt, findByText: findByTextPt } = await render(
      <ReviewScreen verse={ptVerse} onComplete={onCompletePt} />
    );

    jest.useFakeTimers();
    try {
      await act(async () => {
        fireEvent.press(getByTestIdPt('floating-mic-button'));
      });

      await act(async () => {
        jest.advanceTimersByTime(10500);
      });

      expect(
        await findByTextPt(
          'Nenhuma fala detectada. Toque no microfone para tentar novamente.'
        )
      ).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('hides floating mic button and renders review actions once results are displayed', async () => {
    const onComplete = jest.fn();
    const mockVoiceInput = new SimulatedVoiceAdapter({
      defaultTranscript: mockVerse.text,
    });

    const { getByTestId, queryByTestId, findByText } = await render(
      <ReviewScreen
        verse={mockVerse}
        onComplete={onComplete}
        voiceInput={mockVoiceInput}
      />
    );

    // Start reciting
    await act(async () => {
      fireEvent.press(getByTestId('floating-mic-button'));
    });

    // Stop and verify
    await act(async () => {
      fireEvent.press(getByTestId('floating-mic-button'));
    });

    // Floating mic is hidden when results appear
    expect(queryByTestId('floating-mic-button')).toBeNull();

    // Action buttons are displayed
    expect(await findByText('Practice Again')).toBeTruthy();
    expect(await findByText('Done (Next Verse) →')).toBeTruthy();
  });

  describe('Sandbox Mode (Ticket 31)', () => {
    const sandboxVerse: Verse = {
      id: 'sandbox-acts-2-38',
      reference: 'Acts 2:38',
      text: 'Peter said to them, Repent, and be baptized, every one of you',
      translation: 'WEB',
    };

    it('launches in Level 1 (Echo Mode) and allows completing all 3 tiers with opt-in dialog', async () => {
      const onComplete = jest.fn();
      const onSandboxComplete = jest.fn();
      const recordSpy = jest.spyOn(verseEngine, 'recordReview');
      const consumeSpy = jest.spyOn(SubscriptionService, 'consumeRecitation');

      const mockVoiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: sandboxVerse.text,
      });

      const { getByText, findByText, getByTestId } = await render(
        <ReviewScreen
          verse={sandboxVerse}
          onComplete={onComplete}
          onSandboxComplete={onSandboxComplete}
          voiceInput={mockVoiceInput}
          isSandbox={true}
        />
      );

      // Verify Level 1 Echo Mode is initial
      expect(getByText('Level 1: Echo Mode (Listen & Read Aloud)')).toBeTruthy();

      // Advance to Level 2
      await act(async () => {
        fireEvent.press(getByText('2. Cloze'));
      });
      expect(getByText('Level 2: Cloze Practice')).toBeTruthy();

      // Advance to Level 3
      await act(async () => {
        fireEvent.press(getByText('3. Recite'));
      });
      expect(getByText('Level 3: Blind Recitation (Active Recall)')).toBeTruthy();

      // Recite at Level 3
      await act(async () => {
        fireEvent.press(getByTestId('floating-mic-button'));
      });

      // Does not consume quota
      expect(consumeSpy).not.toHaveBeenCalled();

      // Stop & verify
      await act(async () => {
        fireEvent.press(getByTestId('floating-mic-button'));
      });

      // Does not record to VerseEngine SRS
      expect(recordSpy).not.toHaveBeenCalled();

      // Opt-in modal should appear
      expect(await findByText('Add Acts 2:38 to your memory verses?')).toBeTruthy();
      expect(getByTestId('sandbox-opt-in-save')).toBeTruthy();
      expect(getByTestId('sandbox-opt-in-dismiss')).toBeTruthy();

      // Tap Add to My Verses
      await act(async () => {
        fireEvent.press(getByTestId('sandbox-opt-in-save'));
      });

      expect(onSandboxComplete).toHaveBeenCalledWith(sandboxVerse, true);
    });

    it('allows choosing Explore App without Saving in opt-in modal', async () => {
      const onComplete = jest.fn();
      const onSandboxComplete = jest.fn();
      const mockVoiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: sandboxVerse.text,
      });

      const { findByText, getByTestId } = await render(
        <ReviewScreen
          verse={sandboxVerse}
          onComplete={onComplete}
          onSandboxComplete={onSandboxComplete}
          voiceInput={mockVoiceInput}
          isSandbox={true}
        />
      );

      // Switch to Level 3 directly
      await act(async () => {
        fireEvent.press(await findByText('3. Recite'));
      });

      await act(async () => {
        fireEvent.press(getByTestId('floating-mic-button'));
      });

      await act(async () => {
        fireEvent.press(getByTestId('floating-mic-button'));
      });

      expect(await findByText('Add Acts 2:38 to your memory verses?')).toBeTruthy();

      // Tap Explore App without Saving
      await act(async () => {
        fireEvent.press(getByTestId('sandbox-opt-in-dismiss'));
      });

      expect(onSandboxComplete).toHaveBeenCalledWith(sandboxVerse, false);
    });
  });

  describe('Ticket 69: Instant Recitation Turn-Taking & Pre-Warming', () => {
    it('automatically triggers warmUp on mount when review screen displays', async () => {
      const onComplete = jest.fn();
      const mockVoiceInput = {
        requestPermissions: jest.fn().mockResolvedValue(true),
        warmUp: jest.fn().mockResolvedValue(undefined),
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue({ transcript: 'test' }),
        cancel: jest.fn().mockResolvedValue(undefined),
      };

      await render(
        <ReviewScreen
          verse={mockVerse}
          onComplete={onComplete}
          voiceInput={mockVoiceInput as any}
        />
      );

      expect(mockVoiceInput.warmUp).toHaveBeenCalledTimes(1);
    });

    it('instantly transitions to recording state on mic press without delay', async () => {
      const onComplete = jest.fn();
      const mockVoiceInput = new SimulatedVoiceAdapter({
        defaultTranscript: mockVerse.text,
      });

      const { getByTestId, findByText } = await render(
        <ReviewScreen
          verse={mockVerse}
          onComplete={onComplete}
          voiceInput={mockVoiceInput}
        />
      );

      const micButton = getByTestId('floating-mic-button');

      await act(async () => {
        fireEvent(micButton, 'pressIn');
        fireEvent.press(micButton);
      });

      // Instantly shows Stop icon and Listening prompt
      expect(await findByText('⏹')).toBeTruthy();
      expect(await findByText(/Listening... Tap button to verify/)).toBeTruthy();
    });
  });
});

