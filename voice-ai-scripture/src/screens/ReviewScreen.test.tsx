import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import ReviewScreen from './ReviewScreen';
import { Verse, verseEngine } from '../services/VerseEngine';
import { SubscriptionService } from '../services/SubscriptionService';
import { audioRecorder } from '../services/AudioRecorderService';
import {
  setDefaultSpeechSynthesizer,
  MockSpeechSynthesizer,
} from '../services/SpeechSynthesizer';
import { SimulatedTranscriber } from '../services/SpeechTranscriber';

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

    // Mock AudioRecorderService methods for unit testing environment
    jest.spyOn(audioRecorder, 'requestPermissions').mockResolvedValue(true);
    jest.spyOn(audioRecorder, 'startRecording').mockResolvedValue(undefined);
    jest.spyOn(audioRecorder, 'stopRecording').mockResolvedValue('file:///recording.m4a');
    jest.spyOn(audioRecorder, 'deleteAudioFile').mockResolvedValue(true);
  });

  afterEach(() => {
    setDefaultSpeechSynthesizer(null);
    jest.useRealTimers();
  });

  it('renders default Level 3 (Blind Recitation) with 3-tier segmented control', async () => {
    const onComplete = jest.fn();
    const { getByText } = await render(
      <ReviewScreen verse={mockVerse} onComplete={onComplete} />
    );

    expect(getByText('Philippians 4:13')).toBeTruthy();
    expect(getByText('1. Echo')).toBeTruthy();
    expect(getByText('2. Cloze')).toBeTruthy();
    expect(getByText('3. Recite')).toBeTruthy();
    expect(getByText('Level 3: Blind Recitation (Active Recall)')).toBeTruthy();
    expect(getByText('🎤 Start Reciting')).toBeTruthy();
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

    expect(getByText('Level 1: Echo Mode (Ear Training)')).toBeTruthy();
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

    const mockTranscriber = new SimulatedTranscriber({
      defaultText: mockVerse.text,
    });

    const { getByText, findAllByText, findByText } = await render(
      <ReviewScreen
        verse={mockVerse}
        onComplete={onComplete}
        transcriber={mockTranscriber}
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

    // Start & stop voice recitation
    await act(async () => {
      fireEvent.press(getByText('🎤 Start Reciting'));
    });

    const stopButton = await findByText('⏹ Stop & Verify');
    expect(stopButton).toBeTruthy();

    await act(async () => {
      fireEvent.press(stopButton);
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

  it('shows paywall modal when quota is exhausted in Level 3', async () => {
    jest.spyOn(SubscriptionService, 'consumeRecitation').mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      isSubscribed: false,
    });

    const onComplete = jest.fn();
    const { findByText } = await render(
      <ReviewScreen verse={mockVerse} onComplete={onComplete} />
    );

    const startButton = await findByText('🎤 Start Reciting');
    await act(async () => {
      fireEvent.press(startButton);
    });

    const paywallHeader = await findByText('Unlock Unlimited Voice AI');
    expect(paywallHeader).toBeTruthy();
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

      const mockTranscriber = new SimulatedTranscriber({
        defaultText: sandboxVerse.text,
      });

      const { getByText, findByText, getByTestId, queryByTestId } = await render(
        <ReviewScreen
          verse={sandboxVerse}
          onComplete={onComplete}
          onSandboxComplete={onSandboxComplete}
          transcriber={mockTranscriber}
          isSandbox={true}
        />
      );

      // Verify Level 1 Echo Mode is initial
      expect(getByText('Level 1: Echo Mode (Ear Training)')).toBeTruthy();

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
      const startButton = await findByText('🎤 Start Reciting');
      await act(async () => {
        fireEvent.press(startButton);
      });

      // Does not consume quota
      expect(consumeSpy).not.toHaveBeenCalled();

      const stopButton = await findByText('⏹ Stop & Verify');
      await act(async () => {
        fireEvent.press(stopButton);
      });

      // Does not record to VerseEngine SRS
      expect(recordSpy).not.toHaveBeenCalled();

      // Opt-in modal should appear
      expect(await findByText('Add Acts 2:38 to your daily memory deck?')).toBeTruthy();
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
      const mockTranscriber = new SimulatedTranscriber({
        defaultText: sandboxVerse.text,
      });

      const { findByText, getByTestId } = await render(
        <ReviewScreen
          verse={sandboxVerse}
          onComplete={onComplete}
          onSandboxComplete={onSandboxComplete}
          transcriber={mockTranscriber}
          isSandbox={true}
        />
      );

      // Switch to Level 3 directly
      await act(async () => {
        fireEvent.press(await findByText('3. Recite'));
      });

      await act(async () => {
        fireEvent.press(await findByText('🎤 Start Reciting'));
      });

      await act(async () => {
        fireEvent.press(await findByText('⏹ Stop & Verify'));
      });

      expect(await findByText('Add Acts 2:38 to your daily memory deck?')).toBeTruthy();

      // Tap Explore App without Saving
      await act(async () => {
        fireEvent.press(getByTestId('sandbox-opt-in-dismiss'));
      });

      expect(onSandboxComplete).toHaveBeenCalledWith(sandboxVerse, false);
    });
  });
});

