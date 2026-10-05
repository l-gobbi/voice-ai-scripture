import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Verse } from '../services/VerseEngine';
import { useRecitationSession, RecitationLevel } from '../hooks/useRecitationSession';
import DiffView from '../components/DiffView';
import PaywallModal from '../components/PaywallModal';
import WaveformVisualizer from '../components/WaveformVisualizer';
import { SubscriptionService } from '../services/SubscriptionService';
import { SpeechTranscriber } from '../services/RecitationSession';
import { getTheme, touchTarget } from '../theme/tokens';

export type { RecitationLevel };

interface ReviewScreenProps {
  verse: Verse;
  onComplete: () => void;
  transcriber?: SpeechTranscriber;
  isSandbox?: boolean;
  onSandboxComplete?: (verse: Verse, saveRequested: boolean) => void;
  isUnmetered?: boolean;
}

export default function ReviewScreen({
  verse,
  onComplete,
  transcriber,
  isSandbox = false,
  onSandboxComplete,
  isUnmetered = false,
}: ReviewScreenProps) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme);

  const [showPaywall, setShowPaywall] = useState(false);
  const [showSandboxOptIn, setShowSandboxOptIn] = useState(false);
  const [showDebugTray, setShowDebugTray] = useState(false);

  const {
    level,
    status,
    volumeLevel,
    clozeTokens,
    isTextRevealed,
    assistanceUsed,
    currentResult,
    rawTranscript,
    errorMessage,
    startReciting,
    stopAndVerify,
    setLevel,
    nextLevel,
    practiceAgain,
    toggleTextReveal,
    tapWord,
    vocalize,
  } = useRecitationSession(verse, {
    transcriber,
    isSandbox,
    isUnmetered,
    initialLevel: isSandbox ? 1 : 3,
  });

  const isReciting = status === 'reciting';
  const isVerifying = status === 'verifying';

  useEffect(() => {
    if (status === 'quota_exhausted') {
      setShowPaywall(true);
    }
  }, [status]);

  useEffect(() => {
    if (isSandbox && level === 3 && currentResult) {
      setShowSandboxOptIn(true);
    }
  }, [isSandbox, level, currentResult]);

  const handleToggleRecitation = async () => {
    if (isReciting) {
      await stopAndVerify();
    } else {
      await startReciting();
    }
  };

  const displayScore = currentResult ? currentResult.score : 0;

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Navigation and Segmented Control Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={onComplete}
            activeOpacity={0.7}
          >
            <Text style={[styles.backButtonText, { color: theme.colors.textPrimary }]}>
              ← Back
            </Text>
          </TouchableOpacity>

          <View
            style={[
              styles.modeToggle,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setLevel(1)}
              style={[
                styles.modeTabContainer,
                level === 1 && { backgroundColor: theme.colors.surface },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modeTab,
                  { color: level === 1 ? theme.colors.textPrimary : theme.colors.textSecondary },
                  level === 1 && styles.activeModeTabText,
                ]}
              >
                1. Echo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLevel(2)}
              style={[
                styles.modeTabContainer,
                level === 2 && { backgroundColor: theme.colors.surface },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modeTab,
                  { color: level === 2 ? theme.colors.textPrimary : theme.colors.textSecondary },
                  level === 2 && styles.activeModeTabText,
                ]}
              >
                2. Cloze
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLevel(3)}
              style={[
                styles.modeTabContainer,
                level === 3 && { backgroundColor: theme.colors.surface },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modeTab,
                  { color: level === 3 ? theme.colors.textPrimary : theme.colors.textSecondary },
                  level === 3 && styles.activeModeTabText,
                ]}
              >
                3. Recite
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Central Editorial Scripture Plane */}
        <View
          style={[
            styles.verseContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Reference Heading (Long press in __DEV__ toggles Acoustic Diagnostics) */}
          <TouchableOpacity
            onLongPress={() => {
              if (typeof __DEV__ !== 'undefined' && __DEV__) {
                setShowDebugTray((prev) => !prev);
              }
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.reference,
                {
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.fontFamily.ui,
                },
              ]}
            >
              {verse.reference}
            </Text>
          </TouchableOpacity>

          {/* Developer Acoustic Debug Tray (__DEV__ only) */}
          {typeof __DEV__ !== 'undefined' && __DEV__ && showDebugTray && (
            <View
              style={[
                styles.debugTray,
                {
                  backgroundColor: theme.colors.surfaceMuted,
                  borderColor: theme.colors.accentSacred,
                },
              ]}
            >
              <View style={styles.debugHeaderRow}>
                <Text
                  style={[
                    styles.debugTitle,
                    { color: theme.colors.accentSacred },
                  ]}
                >
                  🛠️ Acoustic Diagnostics (__DEV__)
                </Text>
                <TouchableOpacity onPress={() => setShowDebugTray(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.debugCloseText, { color: theme.colors.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.debugLabel, { color: theme.colors.textSecondary }]}>
                Speech Provider:{' '}
                <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
                  {process.env.EXPO_PUBLIC_GROQ_API_KEY
                    ? '⚡ Groq Cloud Whisper (whisper-large-v3-turbo)'
                    : process.env.EXPO_PUBLIC_OPENAI_API_KEY
                    ? '☁️ OpenAI Cloud (gpt-transcribe)'
                    : '📱 On-Device Native Speech Recognizer'}
                </Text>
              </Text>

              <Text style={[styles.debugLabel, { color: theme.colors.textSecondary, marginTop: 6 }]}>
                Raw Recognized Transcript:
              </Text>
              <View
                style={[
                  styles.debugTranscriptBox,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.debugTranscriptText,
                    { color: theme.colors.textPrimary },
                  ]}
                  selectable
                >
                  {rawTranscript || (isVerifying ? 'Transcribing...' : isReciting ? 'Listening...' : 'No transcription captured yet')}
                </Text>
              </View>
            </View>
          )}

          {/* Level 1: Echo Mode */}
          {level === 1 && (
            <View style={styles.levelCard}>
              <View
                style={[
                  styles.levelBadgeContainer,
                  { backgroundColor: theme.colors.surfaceMuted },
                ]}
              >
                <Text
                  style={[
                    styles.levelBadge,
                    { color: theme.colors.accentSacred },
                  ]}
                >
                  Level 1: Echo Mode (Ear Training)
                </Text>
              </View>

              {isTextRevealed ? (
                <Text
                  style={[
                    styles.verseText,
                    {
                      color: theme.colors.textPrimary,
                      fontFamily: theme.typography.fontFamily.scripture,
                    },
                  ]}
                >
                  {verse.text}
                </Text>
              ) : (
                <View style={styles.concealedBox}>
                  <Text
                    style={[
                      styles.concealedHint,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Listen to the audio, meditate, and repeat aloud into the microphone.
                  </Text>
                </View>
              )}

              <View style={styles.level1Controls}>
                <TouchableOpacity
                  style={[
                    styles.secondaryPillButton,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={toggleTextReveal}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.secondaryPillButtonText,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    {isTextRevealed ? 'Conceal Text' : 'Reveal Text'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.secondaryPillButton,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={vocalize}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.secondaryPillButtonText,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    🔊 Listen Again
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Level 2: Cloze Practice */}
          {level === 2 && (
            <View style={styles.levelCard}>
              <View style={styles.levelHeaderRow}>
                <View
                  style={[
                    styles.levelBadgeContainer,
                    { backgroundColor: theme.colors.surfaceMuted },
                  ]}
                >
                  <Text
                    style={[
                      styles.levelBadge,
                      { color: theme.colors.accentSacred },
                    ]}
                  >
                    Level 2: Cloze Practice
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.secondaryPillButton,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={vocalize}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.secondaryPillButtonText,
                      { color: theme.colors.textPrimary },
                    ]}
                  >
                    🔊 Listen
                  </Text>
                </TouchableOpacity>
              </View>

              <Text
                style={[
                  styles.instructionText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Tap any blanked word to reveal it inline if you need a prompt.
              </Text>

              <View style={styles.clozeContainer}>
                {clozeTokens.map((token, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => tapWord(idx)}
                    activeOpacity={0.7}
                    style={styles.tokenTouchTarget}
                  >
                    <Text
                      style={[
                        styles.clozeToken,
                        {
                          color: theme.colors.textPrimary,
                          fontFamily: theme.typography.fontFamily.scripture,
                        },
                        token.isRevealed && [
                          styles.clozeRevealed,
                          { color: theme.colors.accentSacred },
                        ],
                      ]}
                    >
                      {token.isRevealed ? token.word : token.masked}
                      {token.trailingSpace ? ' ' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Level 3: Blind Recitation */}
          {level === 3 && (
            <View style={styles.levelCard}>
              <View
                style={[
                  styles.levelBadgeContainer,
                  { backgroundColor: theme.colors.surfaceMuted },
                ]}
              >
                <Text
                  style={[
                    styles.levelBadge,
                    { color: theme.colors.accentSacred },
                  ]}
                >
                  Level 3: Blind Recitation (Active Recall)
                </Text>
              </View>

              {assistanceUsed && (
                <Text
                  style={[
                    styles.assistedWarning,
                    { color: theme.colors.diffAddedText },
                  ]}
                >
                  ⚠️ Word Peek Lifeline used (Session score capped at 75%)
                </Text>
              )}

              <View style={styles.clozeContainer}>
                {clozeTokens.map((token, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => tapWord(idx)}
                    activeOpacity={0.7}
                    style={styles.tokenTouchTarget}
                  >
                    <Text
                      style={[
                        styles.clozeToken,
                        {
                          color: theme.colors.textPrimary,
                          fontFamily: theme.typography.fontFamily.scripture,
                        },
                        token.isRevealed && [
                          styles.peekToken,
                          {
                            color: theme.colors.diffAddedText,
                            backgroundColor: theme.colors.diffAddedBg,
                          },
                        ],
                      ]}
                    >
                      {token.isRevealed ? token.word : token.masked}
                      {token.trailingSpace ? ' ' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Waveform & Recitation Feedback */}
          <View style={styles.voiceSection}>
            <WaveformVisualizer isReciting={isReciting} volumeLevel={volumeLevel} />

            {!currentResult && !isVerifying && (
              <Text
                style={[
                  styles.voiceHint,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {isReciting
                  ? 'Listening... Recite the verse clearly and tap stop!'
                  : level === 3
                  ? 'Recite the full verse from memory into the mic.'
                  : 'Practice reciting aloud into the mic for instant voice feedback.'}
              </Text>
            )}

            {isVerifying && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={theme.colors.accentSacred} />
                <Text
                  style={[
                    styles.loadingText,
                    { color: theme.colors.accentSacred },
                  ]}
                >
                  Verifying recitation with Voice AI...
                </Text>
              </View>
            )}

            {currentResult && (
              <View style={styles.resultContainer}>
                <View style={styles.scoreHeader}>
                  <Text
                    style={[
                      styles.scoreBadge,
                      {
                        backgroundColor: currentResult.passed
                          ? theme.colors.diffMatchBg
                          : theme.colors.diffMissedBg,
                        color: currentResult.passed
                          ? theme.colors.diffMatchText
                          : theme.colors.diffMissedText,
                      },
                    ]}
                  >
                    {displayScore}% Accuracy
                  </Text>
                  <Text
                    style={[
                      styles.streakText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {level === 3
                      ? isSandbox
                        ? '🎉 Sandbox Recitation Complete!'
                        : currentResult.passed
                        ? '🎉 Official Review Recorded!'
                        : '🔄 Reinforcement Scheduled for Tomorrow'
                      : '✅ Practice Attempt (Unmetered)'}
                  </Text>
                </View>

                <DiffView tokens={currentResult.tokens} />
              </View>
            )}
          </View>
        </View>

        {errorMessage ? (
          <Text style={[styles.error, { color: theme.colors.diffMissedText }]}>
            {errorMessage}
          </Text>
        ) : null}

        {/* Docked Floating Action Bar */}
        <View style={styles.voiceActions}>
          {!currentResult ? (
            <TouchableOpacity
              style={[
                styles.primaryHeroButton,
                {
                  backgroundColor: isReciting
                    ? '#DC2626'
                    : theme.colors.accentSacred,
                },
              ]}
              onPress={handleToggleRecitation}
              disabled={isVerifying}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryHeroButtonText}>
                {isReciting ? '⏹ Stop & Verify' : '🎤 Start Reciting'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.doneActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.practiceAgainButton,
                  {
                    backgroundColor: theme.colors.surfaceMuted,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={practiceAgain}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Practice Again
                </Text>
              </TouchableOpacity>

              <View style={{ width: 12 }} />

              {level < 3 ? (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.nextLevelButton,
                    { backgroundColor: theme.colors.accentSacred },
                  ]}
                  onPress={nextLevel}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryActionButtonText}>
                    {`Next: Level ${level + 1} →`}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.finishButton,
                    { backgroundColor: theme.colors.diffMatchText },
                  ]}
                  onPress={() => {
                    if (isSandbox) {
                      setShowSandboxOptIn(true);
                    } else {
                      onComplete();
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryActionButtonText}>
                    {isSandbox ? 'Finish Sandbox →' : 'Done (Next Verse) →'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSubscribe={async () => {
          await SubscriptionService.subscribePremium();
          setShowPaywall(false);
        }}
      />

      {/* Sandbox Opt-in Modal */}
      <Modal
        visible={showSandboxOptIn}
        transparent={true}
        animationType="fade"
        testID="sandbox-opt-in-modal"
        onRequestClose={() => {
          setShowSandboxOptIn(false);
          if (onSandboxComplete) {
            onSandboxComplete(verse, false);
          } else {
            onComplete();
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: theme.colors.textPrimary },
              ]}
            >
              Add {verse.reference} to your memory verses?
            </Text>
            <Text
              style={[
                styles.modalDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              You've successfully tested all 3 tiers of recitation! Would you like to add this verse to your memory verses for daily spaced repetition?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.accentSacred },
                ]}
                testID="sandbox-opt-in-save"
                onPress={() => {
                  setShowSandboxOptIn(false);
                  if (onSandboxComplete) {
                    onSandboxComplete(verse, true);
                  } else {
                    onComplete();
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalPrimaryButtonText}>Add to My Verses</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: theme.colors.surfaceMuted,
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                  },
                ]}
                testID="sandbox-opt-in-dismiss"
                onPress={() => {
                  setShowSandboxOptIn(false);
                  if (onSandboxComplete) {
                    onSandboxComplete(verse, false);
                  } else {
                    onComplete();
                  }
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.modalSecondaryButtonText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Explore App without Saving
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    minHeight: touchTarget.min,
    minWidth: touchTarget.min,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 22,
    borderWidth: 1,
    padding: 3,
  },
  modeTabContainer: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeTab: {
    fontSize: 13,
    fontWeight: '500',
  },
  activeModeTabText: {
    fontWeight: '700',
  },
  verseContainer: {
    borderRadius: 18,
    padding: 24,
    minHeight: 240,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reference: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  levelCard: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelBadgeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 14,
  },
  levelBadge: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  levelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 13,
    marginBottom: 14,
    textAlign: 'center',
    lineHeight: 18,
  },
  assistedWarning: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  verseText: {
    fontSize: 20,
    lineHeight: 32,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  concealedBox: {
    padding: 20,
    alignItems: 'center',
  },
  concealedHint: {
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  },
  level1Controls: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'center',
    gap: 12,
  },
  secondaryPillButton: {
    minHeight: touchTarget.min,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryPillButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clozeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tokenTouchTarget: {
    minHeight: 44,
    justifyContent: 'center',
    marginVertical: 2,
  },
  clozeToken: {
    fontSize: 20,
    lineHeight: 34,
  },
  clozeRevealed: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  peekToken: {
    fontWeight: '700',
    borderRadius: 4,
    paddingHorizontal: 3,
  },
  voiceSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  voiceHint: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
    lineHeight: 20,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 16,
  },
  loadingText: {
    fontWeight: '600',
    fontSize: 14,
  },
  resultContainer: {
    width: '100%',
    alignItems: 'center',
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    fontWeight: '700',
    fontSize: 13,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600',
  },
  voiceActions: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 360,
    marginTop: 8,
  },
  primaryHeroButton: {
    minHeight: touchTarget.hero,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryHeroButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  doneActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  practiceAgainButton: {
    borderWidth: 1,
  },
  nextLevelButton: {},
  finishButton: {},
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  error: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalActions: {
    gap: 12,
  },
  modalButton: {
    minHeight: touchTarget.min,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  debugTray: {
    width: '100%',
    marginVertical: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  debugHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  debugCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 4,
  },
  debugLabel: {
    fontSize: 12,
  },
  debugTranscriptBox: {
    marginTop: 6,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  debugTranscriptText: {
    fontSize: 13,
  },
});
