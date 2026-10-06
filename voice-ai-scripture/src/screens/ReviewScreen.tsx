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
import { Verse } from '../services/VerseEngine';
import { useRecitationSession, RecitationLevel } from '../hooks/useRecitationSession';
import DiffView from '../components/DiffView';
import FloatingMicButton from '../components/FloatingMicButton';
import WaveformVisualizer from '../components/WaveformVisualizer';
import AcousticDebugTray from '../components/AcousticDebugTray';
import SandboxOptInModal from '../components/SandboxOptInModal';
import ScaffoldingLevelCard from '../components/ScaffoldingLevelCard';
import { VoiceInput } from '../services/RecitationSession';
import { scriptureCatalog } from '../services/ScriptureCatalog';
import { getTheme } from '../theme/tokens';
import { styles } from './ReviewScreen.styles';

export type { RecitationLevel };

interface ReviewScreenProps {
  verse: Verse;
  onComplete: () => void;
  voiceInput?: VoiceInput;
  isSandbox?: boolean;
  onSandboxComplete?: (verse: Verse, saveRequested: boolean) => void;
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
    assistanceUsed,
    currentResult,
    rawTranscript,
    errorMessage,
    errorDetails,
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
              {verse.translation || 'WEB'}
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
            assistanceUsed={assistanceUsed}
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
              onStop={() => stopAndVerify({ unmetered: isUnmetered })}
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
            onSandboxComplete(verse, true);
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

