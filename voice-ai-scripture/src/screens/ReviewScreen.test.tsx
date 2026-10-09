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
import { ReviewLogEntry } from '../services/ReviewLog';
import { addStudyDays, toStudyDay } from '../engines/studyDay';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

/** Stubs the singleton Verse Engine's attempt operation for verses that are not stored. */
function stubRecordAttempt() {
  return jest.spyOn(verseEngine, 'recordAttempt').mockImplementation(async (input) => ({
    kind: 'official',
    srsResult: {
      streak: 1,
      repetitions: 1,
      intervalDays: 1,
      easeFactor: 2.5,
      nextReviewDate: '2026-10-10',
      passed: input.evaluation.outcome !== 'forgotten',
    },
    memoryTier: 'seed',
    entry: {} as ReviewLogEntry,
  }));
}

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

  it('in Level 3 (Blind Recitation), a Word Peek counts as one error: a peek in an 11-word verse is a slip', async () => {
    const onComplete = jest.fn();
    const recordSpy = stubRecordAttempt();

    const mockVoiceInput = new SimulatedVoiceAdapter({
      defaultTranscript: mockVerse.text,
    });

    const { getByText, queryByText, findAllByText, findByText, getByTestId } = await render(
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

    // The lifeline note says what a peek costs; the retired 75% cap is gone.
    expect(getByText('Word Peek used: each peeked word counts as one error.')).toBeTruthy();
    expect(queryByText(/75%/)).toBeNull();

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

    // The peek is recorded as one error against a budget of one, with the score uncapped
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        peekedWordPositions: [0],
        evaluation: expect.objectContaining({ rawScore: 100, errorCount: 1, errorBudget: 1, outcome: 'slip' }),
      })
    );
    expect(await findByText('Recalled with a slip')).toBeTruthy();
    expect(getByText('1 error · 1 allowed')).toBeTruthy();
    expect(getByText('100% accuracy')).toBeTruthy();
    recordSpy.mockRestore();
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
    const recordSpy = stubRecordAttempt();
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
    recordSpy.mockRestore();
  });

  describe('Version label (Ticket 81)', () => {
    it('shows the verse’s own translation, including a label without bundled text', async () => {
      const { getByText, queryByText } = await render(
        <ReviewScreen
          verse={{
            id: 'almeida-1',
            reference: 'Salmos 23:1',
            text: 'O Senhor é o meu pastor; nada me faltará.',
            translation: 'ALMEIDA',
          }}
          onComplete={jest.fn()}
        />
      );

      expect(getByText('ALMEIDA')).toBeTruthy();
      expect(queryByText('BLIVRE')).toBeNull();
    });

    it('shows Bíblia Livre for a Portuguese verse that has no translation', async () => {
      const { getByText, queryByText } = await render(
        <ReviewScreen
          verse={{ id: 'pt-1', reference: 'Salmos 23:1', text: 'O SENHOR é meu pastor, nada me faltará.' }}
          onComplete={jest.fn()}
        />
      );

      expect(getByText('BLIVRE')).toBeTruthy();
      expect(queryByText('WEB')).toBeNull();
    });

    it('shows the BSB for an English verse that has no translation', async () => {
      const { getByText, queryByText } = await render(
        <ReviewScreen verse={mockVerse} onComplete={jest.fn()} />
      );

      expect(getByText('BSB')).toBeTruthy();
      expect(queryByText('WEB')).toBeNull();
    });
  });

  describe('Official Review vs Practice Attempt (Ticket 72)', () => {
    const OFFICIAL = '🎉 Official Review Recorded!';
    const PRACTICE = '✅ Practice Attempt (Schedule Unchanged)';

    /** A verse stored through the app's Verse Engine, so the real classification runs. */
    const storeVerse = (reference: string, text: string) =>
      verseEngine.addVerse({ reference, text, translation: 'WEB' });

    async function reciteOnScreen(getByTestId: (id: string) => any) {
      await act(async () => {
        fireEvent.press(getByTestId('floating-mic-button'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('floating-mic-button'));
      });
    }

    it('labels Practice Again on a Due Verse as a Practice Attempt, not another Official Review', async () => {
      const verse = await storeVerse('Psalm 23:1', 'The Lord is my shepherd; I shall not want.');
      const { getByTestId, getByText, findByText, queryByText } = await render(
        <ReviewScreen
          verse={verse}
          onComplete={jest.fn()}
          voiceInput={new SimulatedVoiceAdapter({ defaultTranscript: verse.text })}
        />
      );

      await reciteOnScreen(getByTestId);
      expect(await findByText(OFFICIAL)).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByText('Practice Again'));
      });
      await reciteOnScreen(getByTestId);

      expect(await findByText(PRACTICE)).toBeTruthy();
      expect(queryByText(OFFICIAL)).toBeNull();
    });

    it('labels a Blind Recitation of a verse not yet due as a Practice Attempt', async () => {
      const added = await storeVerse('John 11:35', 'Jesus wept.');
      const verse = await verseEngine.updateVerse(added.id, {
        srs: {
          intervalDays: 6,
          streak: 2,
          easeFactor: 2.5,
          nextReviewDate: addStudyDays(toStudyDay(new Date()), 3),
        },
      });
      const { getByTestId, findByText, queryByText } = await render(
        <ReviewScreen
          verse={verse}
          onComplete={jest.fn()}
          isUnmetered={true}
          voiceInput={new SimulatedVoiceAdapter({ defaultTranscript: verse.text })}
        />
      );

      await reciteOnScreen(getByTestId);

      expect(await findByText(PRACTICE)).toBeTruthy();
      expect(queryByText(OFFICIAL)).toBeNull();
    });
  });

  describe('Outcome and Error Budget on the result (Ticket 73)', () => {
    // Unmetered only skips the shared quota and burst limit; the Verse Engine still classifies.
    async function reciteOnScreen(getByTestId: (id: string) => any) {
      await act(async () => {
        fireEvent.press(getByTestId('floating-mic-button'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('floating-mic-button'));
      });
    }

    const renderRecitation = async (verse: Verse, transcript: string) => {
      const screen = await render(
        <ReviewScreen
          verse={verse}
          onComplete={jest.fn()}
          isUnmetered={true}
          voiceInput={new SimulatedVoiceAdapter({ defaultTranscript: transcript })}
        />
      );
      await reciteOnScreen(screen.getByTestId);
      return screen;
    };

    it('states a clean recall with its errors against the budget, the percentage as secondary detail', async () => {
      const verse = await verseEngine.addVerse({
        reference: 'Psalm 23:1',
        text: 'The Lord is my shepherd; I shall not want.',
        translation: 'WEB',
      });

      const { findByText, getByText, queryByText } = await renderRecitation(verse, verse.text);

      expect(await findByText('Recalled')).toBeTruthy();
      expect(getByText('0 errors · 1 allowed')).toBeTruthy();
      expect(getByText('100% accuracy')).toBeTruthy();
      expect(getByText('🎉 Official Review Recorded!')).toBeTruthy();
      expect(queryByText('100% Accuracy')).toBeNull();
    });

    it('says a recitation over the budget needs work, even when its percentage used to pass', async () => {
      const verse = await verseEngine.addVerse({
        reference: 'Psalm 8:1',
        text: 'Yahweh, our Lord, how majestic is your name in all the earth! You have set your glory above the heavens!',
        translation: 'WEB',
      });

      const { findByText, getByText } = await renderRecitation(
        verse,
        'Yahweh, Lord, how is your in all the! You have your glory the heavens!'
      );

      expect(await findByText('Needs work')).toBeTruthy();
      expect(getByText('6 errors · 1 allowed')).toBeTruthy();
      expect(getByText('82% accuracy')).toBeTruthy();
      expect(getByText('🔄 Reinforcement Scheduled for Tomorrow')).toBeTruthy();
    });

    it('speaks Portuguese for a Portuguese verse: a slip, its errors and the Official Review label', async () => {
      const verse = await verseEngine.addVerse({
        reference: 'Salmos 23:1',
        text: 'O Senhor é o meu pastor; nada me faltará.',
        translation: 'ALMEIDA',
      });

      const { findByText, getByText } = await renderRecitation(verse, 'O Senhor é o meu pastor nada faltará');

      expect(await findByText('Lembrado com um deslize')).toBeTruthy();
      expect(getByText('1 erro · 1 permitido')).toBeTruthy();
      expect(getByText('94% de precisão')).toBeTruthy();
      expect(getByText('🎉 Revisão oficial registrada!')).toBeTruthy();
    });

    it('speaks Portuguese for a forgotten verse and for a Practice Attempt', async () => {
      const verse = await verseEngine.addVerse({
        reference: 'João 11:35',
        text: 'Jesus chorou.',
        translation: 'ALMEIDA',
      });
      const speech = { transcript: 'Jesus orou de novo' };
      const { findByText, getByText, getByTestId } = await render(
        <ReviewScreen
          verse={verse}
          onComplete={jest.fn()}
          isUnmetered={true}
          voiceInput={new SimulatedVoiceAdapter({ handler: () => speech.transcript })}
        />
      );
      await reciteOnScreen(getByTestId);

      // "chorou" missed, and one added word beyond the allowance of two.
      expect(await findByText('Precisa de mais prática')).toBeTruthy();
      expect(getByText('2 erros · 1 permitido')).toBeTruthy();
      expect(getByText('🔄 Reforço agendado para amanhã')).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByText('Practice Again'));
      });
      speech.transcript = verse.text;
      await reciteOnScreen(getByTestId);

      expect(await findByText('Lembrado')).toBeTruthy();
      expect(getByText('0 erros · 1 permitido')).toBeTruthy();
      expect(getByText('✅ Tentativa de prática (agenda inalterada)')).toBeTruthy();
    });

    it('labels Echo Mode and Cloze Practice attempts as practice in the verse’s language', async () => {
      const verse = await verseEngine.addVerse({
        reference: 'Salmos 119:105',
        text: 'Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.',
        translation: 'ALMEIDA',
      });
      const { findByText, getByText, getByTestId } = await render(
        <ReviewScreen
          verse={verse}
          onComplete={jest.fn()}
          isUnmetered={true}
          voiceInput={new SimulatedVoiceAdapter({ defaultTranscript: verse.text })}
        />
      );

      await act(async () => {
        fireEvent.press(getByText('2. Cloze'));
      });
      await reciteOnScreen(getByTestId);

      expect(await findByText('✅ Tentativa de prática (fora do limite diário)')).toBeTruthy();
      expect(getByText('Lembrado')).toBeTruthy();
    });
  });

  describe('Transcription Error retry message (Ticket 74)', () => {
    async function reciteUnheard(verse: Verse) {
      const screen = await render(
        <ReviewScreen
          verse={verse}
          onComplete={jest.fn()}
          voiceInput={new SimulatedVoiceAdapter({ defaultTranscript: '' })}
        />
      );
      await act(async () => {
        fireEvent.press(screen.getByTestId('floating-mic-button'));
      });
      await act(async () => {
        fireEvent.press(screen.getByTestId('floating-mic-button'));
      });
      return screen;
    }

    it('says calmly that nothing was graded and no recitation was used, shows no score, and lets the learner retry', async () => {
      const verse = await verseEngine.addVerse({
        reference: 'Psalm 23:1',
        text: 'The Lord is my shepherd; I shall not want.',
        translation: 'WEB',
      });

      const { findByTestId, getByText, queryByText, getByTestId } = await reciteUnheard(verse);

      expect(await findByTestId('transcription-error-retry')).toBeTruthy();
      expect(
        getByText(
          'Could not transcribe audio. Please speak clearly and try again. Nothing was graded and no recitation was used.'
        )
      ).toBeTruthy();
      expect(queryByText(/accuracy/)).toBeNull();
      expect(queryByText(/allowed/)).toBeNull();
      expect(queryByText('Needs work')).toBeNull();
      expect(queryByText('Practice Again')).toBeNull();
      expect(getByTestId('floating-mic-button')).toBeTruthy();
    });

    it('speaks Portuguese for a Portuguese verse', async () => {
      const verse = await verseEngine.addVerse({
        reference: 'Salmos 23:1',
        text: 'O Senhor é o meu pastor; nada me faltará.',
        translation: 'ALMEIDA',
      });

      const { findByText, queryByText } = await reciteUnheard(verse);

      expect(
        await findByText(
          'Não foi possível entender o áudio. Fale com clareza e tente novamente. Nada foi avaliado e nenhuma recitação foi usada.'
        )
      ).toBeTruthy();
      expect(queryByText(/precisão/)).toBeNull();
      expect(queryByText('Precisa de mais prática')).toBeNull();
    });
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
      const recordSpy = jest.spyOn(verseEngine, 'recordAttempt');
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

      // Records nothing: the sandbox verse is not stored yet
      expect(recordSpy).not.toHaveBeenCalled();

      // Opt-in modal should appear
      expect(await findByText('Add Acts 2:38 to your memory verses?')).toBeTruthy();
      expect(getByTestId('sandbox-opt-in-save')).toBeTruthy();
      expect(getByTestId('sandbox-opt-in-dismiss')).toBeTruthy();

      // Tap Add to My Verses
      await act(async () => {
        fireEvent.press(getByTestId('sandbox-opt-in-save'));
      });

      // Saving hands over the sandbox's Blind Recitation, to be logged as practice (Ticket 79)
      expect(onSandboxComplete).toHaveBeenCalledWith(
        sandboxVerse,
        true,
        expect.objectContaining({
          level: 3,
          evaluation: expect.objectContaining({ outcome: 'clean', errorCount: 0, rawScore: 100 }),
          recognizer: 'simulated',
        })
      );
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

