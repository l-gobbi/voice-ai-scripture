import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SandboxAttempt, Verse } from '../services/VerseEngine';
import { useRecitationSession, RecitationLevel } from '../hooks/useRecitationSession';
import DiffView from '../components/DiffView';
import FloatingMicButton from '../components/FloatingMicButton';
import WaveformVisualizer from '../components/WaveformVisualizer';
import AcousticDebugTray from '../components/AcousticDebugTray';
import SandboxOptInModal from '../components/SandboxOptInModal';
import ScaffoldingLevelCard from '../components/ScaffoldingLevelCard';
import { RecitationOutcome, VoiceInput, VoiceRecitationResult } from '../services/RecitationSession';
import { scriptureCatalog } from '../services/ScriptureCatalog';
import { getTheme } from '../theme/tokens';
import { styles } from './ReviewScreen.styles';

export type { RecitationLevel };

type VerseLanguage = 'en' | 'pt';

/** The Error Budget outcome, said plainly in the verse's language. */
function outcomeLabel(outcome: RecitationOutcome, language: VerseLanguage): string {
  if (language === 'pt') {
    return outcome === 'clean'
      ? 'Lembrado'
      : outcome === 'slip'
      ? 'Lembrado com um deslize'
      : 'Precisa de mais prática';
  }
  return outcome === 'clean' ? 'Recalled' : outcome === 'slip' ? 'Recalled with a slip' : 'Needs work';
}

/** The unaided errors against the Error Budget, e.g. "1 error · 2 allowed". */
function errorBudgetLabel(errorCount: number, errorBudget: number, language: VerseLanguage): string {
  return language === 'pt'
    ? `${errorCount} ${errorCount === 1 ? 'erro' : 'erros'} · ${errorBudget} ${
        errorBudget === 1 ? 'permitido' : 'permitidos'
      }`
    : `${errorCount} ${errorCount === 1 ? 'error' : 'errors'} · ${errorBudget} allowed`;
}

/** Whether the attempt moved the schedule, in the verse's language (sandbox copy stays as it is). */
function attemptLabel(
  result: VoiceRecitationResult,
  level: RecitationLevel,
  isSandbox: boolean,
  language: VerseLanguage
): string {
  const pt = language === 'pt';
  if (level !== 3) {
    return pt ? '✅ Tentativa de prática (fora do limite diário)' : '✅ Practice Attempt (Unmetered)';
  }
  if (isSandbox) return '🎉 Sandbox Recitation Complete!';
  if (result.kind === 'practice') {
    return pt ? '✅ Tentativa de prática (agenda inalterada)' : '✅ Practice Attempt (Schedule Unchanged)';
  }
  if (result.passed) {
    return pt ? '🎉 Revisão oficial registrada!' : '🎉 Official Review Recorded!';
  }
  return pt ? '🔄 Reforço agendado para amanhã' : '🔄 Reinforcement Scheduled for Tomorrow';
}

interface ReviewScreenProps {
  verse: Verse;
  onComplete: () => void;
  voiceInput?: VoiceInput;
  isSandbox?: boolean;
  /**
   * Ends the sandbox. On a save it also hands over the sandbox's last Blind Recitation (null if
   * there was none), which the Verse Engine logs as a Practice Attempt of the new verse.
   */
  onSandboxComplete?: (
    verse: Verse,
    saveRequested: boolean,
    sandboxAttempt?: SandboxAttempt | null
  ) => void;
  /** Skips the recitation quota. Whether a recitation is an Official Review is the Verse Engine's call. */
  isUnmetered?: boolean;
}

export default function ReviewScreen({
  verse,
  onComplete,
  voiceInput,
  isSandbox = false,
  onSandboxComplete,
  isUnmetered = false,
}: ReviewScreenProps) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme);

  const [showSandboxOptIn, setShowSandboxOptIn] = useState(false);
  const [showDebugTray, setShowDebugTray] = useState(false);

  const language = scriptureCatalog.detectLanguage(verse);

  const {
    level,
    volumeLevel,
    vadProgress,
    vadState,
    vadThreshold,
    clozeTokens,
    isTextRevealed,
    peekedWordPositions,
    currentResult,
    rawTranscript,
    errorMessage,
    errorDetails,
    transcriptionErrorCode,
    sandboxAttempt,
    isReciting,
    isVerifying,
    startReciting,
    stopAndVerify,
    cancelRecitation,
    setLevel,
    nextLevel,
    practiceAgain,
    toggleTextReveal,
    tapWord,
    vocalize,
  } = useRecitationSession(verse, {
    voiceInput,
    isSandbox,
    isUnmetered,
    initialLevel: isSandbox ? 1 : 3,
  });

  useEffect(() => {
    if (isSandbox && level === 3 && currentResult) {
      setShowSandboxOptIn(true);
    }
  }, [isSandbox, level, currentResult]);

  const outcomeTone = (outcome: RecitationOutcome) =>
    outcome === 'clean'
      ? { backgroundColor: theme.colors.diffMatchBg, color: theme.colors.diffMatchText }
      : outcome === 'slip'
      ? { backgroundColor: theme.colors.diffAddedBg, color: theme.colors.diffAddedText }
      : { backgroundColor: theme.colors.diffMissedBg, color: theme.colors.diffMissedText };

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
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={onComplete}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.backButtonText,
                { color: theme.colors.textPrimary },
              ]}
            >
              ← Back
            </Text>
          </TouchableOpacity>

          {/* Three-Tier Scaffolding Segmented Control */}
          <View
            style={[
              styles.modeToggle,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {(
              [
                { lvl: 1 as RecitationLevel, label: '1. Echo' },
                { lvl: 2 as RecitationLevel, label: '2. Cloze' },
                { lvl: 3 as RecitationLevel, label: '3. Recite' },
              ] as const
            ).map((item) => (
              <TouchableOpacity
                key={item.lvl}
                style={[
                  styles.modeTabContainer,
                  level === item.lvl && {
                    backgroundColor: theme.colors.surface,
                    shadowColor: '#000',
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  },
                ]}
                onPress={() => setLevel(item.lvl)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.modeTab,
                    {
                      color:
                        level === item.lvl
                          ? theme.colors.accentSacred
                          : theme.colors.textSecondary,
                    },
                    level === item.lvl && styles.activeModeTabText,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sacred Editorial Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Reference Heading (Long press in __DEV__ toggles Acoustic Diagnostics) */}
          <View style={styles.cardHeader}>
            <TouchableOpacity
              onLongPress={() => {
                setShowDebugTray((prev) => !prev);
              }}
              delayLongPress={600}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.reference,
                  { color: theme.colors.accentSacred },
                ]}
              >
                {verse.reference}
              </Text>
            </TouchableOpacity>
            <Text
              style={[
                styles.translationBadge,
                { color: theme.colors.textSecondary },
              ]}
            >
              {verse.translation || scriptureCatalog.getDefaultTranslation(language)}
            </Text>
          </View>

          {/* Developer Acoustic Debug Tray (__DEV__ only) */}
          <AcousticDebugTray
            visible={showDebugTray}
            rawTranscript={rawTranscript}
            isVerifying={isVerifying}
            isReciting={isReciting}
            volumeLevel={volumeLevel}
            vadProgress={vadProgress}
            vadState={vadState}
            vadThreshold={vadThreshold}
            errorDetails={errorDetails}
            onClose={() => setShowDebugTray(false)}
          />

          {/* Scaffolding Practice Card (Levels 1, 2, 3) */}
          <ScaffoldingLevelCard
            level={level}
            verse={verse}
            clozeTokens={clozeTokens}
            isTextRevealed={isTextRevealed}
            peekedWordCount={peekedWordPositions.length}
            onToggleTextReveal={toggleTextReveal}
            onVocalize={vocalize}
            onTapWord={tapWord}
          />

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
                  ? language === 'pt'
                    ? 'Ouvindo... Toque no botão para verificar (ou pause 3.5s)'
                    : 'Listening... Tap button to verify (or pause 3.5s)'
                  : level === 3
                  ? language === 'pt'
                    ? 'Recite o versículo de memória no microfone.'
                    : 'Recite the full verse from memory into the mic.'
                  : language === 'pt'
                  ? 'Pratique recitando em voz alta no microfone para feedback instantâneo.'
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
                  <Text style={[styles.scoreBadge, outcomeTone(currentResult.outcome)]}>
                    {outcomeLabel(currentResult.outcome, language)}
                  </Text>
                  <Text
                    style={[
                      styles.streakText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {attemptLabel(currentResult, level, isSandbox, language)}
                  </Text>
                </View>

                <View style={styles.errorBudgetRow}>
                  <Text style={[styles.errorBudgetText, { color: theme.colors.textPrimary }]}>
                    {errorBudgetLabel(currentResult.errorCount, currentResult.errorBudget, language)}
                  </Text>
                  <Text style={[styles.accuracyDetail, { color: theme.colors.textSecondary }]}>
                    {language === 'pt'
                      ? `${currentResult.score}% de precisão`
                      : `${currentResult.score}% accuracy`}
                  </Text>
                </View>

                <DiffView tokens={currentResult.tokens} />
              </View>
            )}
          </View>
        </View>

        {errorMessage && transcriptionErrorCode ? (
          // The app failed to hear the learner: a calm retry notice, never a grade (ticket 74).
          <View
            testID="transcription-error-retry"
            style={[
              styles.retryNotice,
              { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.retryNoticeText, { color: theme.colors.textPrimary }]}>
              {errorMessage}
            </Text>
            {typeof __DEV__ !== 'undefined' && __DEV__ && errorDetails ? (
              <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                ({errorDetails})
              </Text>
            ) : null}
          </View>
        ) : errorMessage ? (
          <View style={{ marginHorizontal: 24, marginTop: 12, alignItems: 'center' }}>
            <Text style={[styles.error, { color: theme.colors.diffMissedText, marginTop: 0 }]}>
              {errorMessage}
            </Text>
            {typeof __DEV__ !== 'undefined' && __DEV__ && errorDetails ? (
              <Text style={{ fontSize: 11, color: theme.colors.textSecondary, marginTop: 4, textAlign: 'center' }}>
                ({errorDetails})
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Docked Floating Action Bar */}
        <View style={styles.voiceActions}>
          {typeof __DEV__ !== 'undefined' && __DEV__ && isReciting && (
            <View style={{ marginHorizontal: 24, marginBottom: 8, padding: 6, backgroundColor: theme.colors.surfaceMuted, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border }}>
              <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
                🎙️ Mic: {Math.round(volumeLevel * 100)}% | Thresh: {Math.round((vadThreshold ?? 0.58) * 100)}% | State: {vadState ?? 'reciting'} | Silence: {Math.round(vadProgress * 100)}%
              </Text>
            </View>
          )}

          {!currentResult ? (
            <FloatingMicButton
              isReciting={isReciting}
              isVerifying={isVerifying}
              volumeLevel={volumeLevel}
              vadProgress={vadProgress}
              language={language}
              onStart={() => startReciting({ unmetered: isUnmetered })}
              onStop={() => stopAndVerify()}
              onCancel={cancelRecitation}
              disabled={isVerifying}
            />
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

      {/* Sandbox Opt-in Modal */}
      <SandboxOptInModal
        visible={showSandboxOptIn}
        verse={verse}
        onSave={() => {
          setShowSandboxOptIn(false);
          if (onSandboxComplete) {
            onSandboxComplete(verse, true, sandboxAttempt);
          } else {
            onComplete();
          }
        }}
        onDismiss={() => {
          setShowSandboxOptIn(false);
          if (onSandboxComplete) {
            onSandboxComplete(verse, false);
          } else {
            onComplete();
          }
        }}
      />
    </SafeAreaView>
  );
}

