import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Verse } from '../services/VerseEngine';
import { useRecitationSession, RecitationLevel } from '../hooks/useRecitationSession';
import DiffView from '../components/DiffView';
import PaywallModal from '../components/PaywallModal';
import WaveformVisualizer from '../components/WaveformVisualizer';
import { SubscriptionService } from '../services/SubscriptionService';
import { SpeechTranscriber } from '../services/RecitationSession';

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
  const [showPaywall, setShowPaywall] = useState(false);
  const [showSandboxOptIn, setShowSandboxOptIn] = useState(false);

  const {
    level,
    status,
    volumeLevel,
    clozeTokens,
    isTextRevealed,
    assistanceUsed,
    currentResult,
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Button title="← Back" onPress={onComplete} />

          <View style={styles.modeToggle}>
            <Text
              style={[styles.modeTab, level === 1 && styles.activeModeTab]}
              onPress={() => setLevel(1)}
            >
              1. Echo
            </Text>
            <Text
              style={[styles.modeTab, level === 2 && styles.activeModeTab]}
              onPress={() => setLevel(2)}
            >
              2. Cloze
            </Text>
            <Text
              style={[styles.modeTab, level === 3 && styles.activeModeTab]}
              onPress={() => setLevel(3)}
            >
              3. Recite
            </Text>
          </View>
        </View>

        <View style={styles.verseContainer}>
          <Text style={styles.reference}>{verse.reference}</Text>

          {level === 1 && (
            <View style={styles.levelCard}>
              <Text style={styles.levelBadge}>Level 1: Echo Mode (Ear Training)</Text>
              {isTextRevealed ? (
                <Text style={styles.verseText}>{verse.text}</Text>
              ) : (
                <View style={styles.concealedBox}>
                  <Text style={styles.concealedHint}>
                    Listen to the audio, meditate, and repeat aloud into the microphone.
                  </Text>
                </View>
              )}
              <View style={styles.level1Controls}>
                <Button
                  title={isTextRevealed ? 'Conceal Text' : 'Reveal Text'}
                  onPress={toggleTextReveal}
                />
                <View style={{ width: 10 }} />
                <Button title="🔊 Listen Again" onPress={vocalize} />
              </View>
            </View>
          )}

          {level === 2 && (
            <View style={styles.levelCard}>
              <View style={styles.levelHeaderRow}>
                <Text style={styles.levelBadge}>Level 2: Cloze Practice</Text>
                <Button title="🔊 Listen" onPress={vocalize} />
              </View>
              <Text style={styles.instructionText}>
                Tap any blanked word to reveal it inline if you need a prompt.
              </Text>
              <View style={styles.clozeContainer}>
                {clozeTokens.map((token, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => tapWord(idx)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.clozeToken, token.isRevealed && styles.clozeRevealed]}>
                      {token.isRevealed ? token.word : token.masked}
                      {token.trailingSpace ? ' ' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {level === 3 && (
            <View style={styles.levelCard}>
              <Text style={styles.levelBadge}>Level 3: Blind Recitation (Active Recall)</Text>
              {assistanceUsed && (
                <Text style={styles.assistedWarning}>
                  ⚠️ Word Peek Lifeline used (Session score capped at 75%)
                </Text>
              )}
              <View style={styles.clozeContainer}>
                {clozeTokens.map((token, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => tapWord(idx)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.clozeToken, token.isRevealed && styles.peekToken]}>
                      {token.isRevealed ? token.word : token.masked}
                      {token.trailingSpace ? ' ' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.voiceSection}>
            <WaveformVisualizer isReciting={isReciting} volumeLevel={volumeLevel} />

            {!currentResult && !isVerifying && (
              <Text style={styles.voiceHint}>
                {isReciting
                  ? 'Listening... Recite the verse clearly and tap stop!'
                  : level === 3
                  ? 'Recite the full verse from memory into the mic.'
                  : 'Practice reciting aloud into the mic for instant voice feedback.'}
              </Text>
            )}

            {isVerifying && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#4f46e5" />
                <Text style={styles.loadingText}>Verifying recitation with Voice AI...</Text>
              </View>
            )}

            {currentResult && (
              <View style={styles.resultContainer}>
                <View style={styles.scoreHeader}>
                  <Text
                    style={[
                      styles.scoreBadge,
                      currentResult.passed ? styles.passScore : styles.failScore,
                    ]}
                  >
                    {displayScore}% Accuracy
                  </Text>
                  <Text style={styles.streakText}>
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

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <View style={styles.voiceActions}>
          {!currentResult ? (
            <Button
              title={isReciting ? '⏹ Stop & Verify' : '🎤 Start Reciting'}
              color={isReciting ? '#ef4444' : '#4f46e5'}
              onPress={handleToggleRecitation}
              disabled={isVerifying}
            />
          ) : (
            <View style={styles.doneActions}>
              <Button
                title="Practice Again"
                color="#6b7280"
                onPress={practiceAgain}
              />
              <View style={{ width: 16 }} />
              {level < 3 ? (
                <Button
                  title={`Next: Level ${level + 1} →`}
                  color="#4f46e5"
                  onPress={nextLevel}
                />
              ) : (
                <Button
                  title={isSandbox ? 'Finish Sandbox →' : 'Done (Next Verse) →'}
                  color="#16a34a"
                  onPress={() => {
                    if (isSandbox) {
                      setShowSandboxOptIn(true);
                    } else {
                      onComplete();
                    }
                  }}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSubscribe={async () => {
          await SubscriptionService.subscribePremium();
          setShowPaywall(false);
        }}
      />

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
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add {verse.reference} to your memory verses?</Text>
            <Text style={styles.modalDescription}>
              You've successfully tested all 3 tiers of recitation! Would you like to add this verse to your memory verses for daily spaced repetition?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalPrimaryButton]}
                testID="sandbox-opt-in-save"
                onPress={() => {
                  setShowSandboxOptIn(false);
                  if (onSandboxComplete) {
                    onSandboxComplete(verse, true);
                  } else {
                    onComplete();
                  }
                }}
              >
                <Text style={styles.modalPrimaryButtonText}>Add to My Verses</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSecondaryButton]}
                testID="sandbox-opt-in-dismiss"
                onPress={() => {
                  setShowSandboxOptIn(false);
                  if (onSandboxComplete) {
                    onSandboxComplete(verse, false);
                  } else {
                    onComplete();
                  }
                }}
              >
                <Text style={styles.modalSecondaryButtonText}>Explore App without Saving</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modeToggle: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 8, padding: 3 },
  modeTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  activeModeTab: { backgroundColor: 'white', color: '#1e293b', borderRadius: 6 },
  verseContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  reference: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  levelCard: { width: '100%', alignItems: 'center', marginBottom: 16 },
  levelBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  levelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionText: { fontSize: 13, color: '#6b7280', marginBottom: 12, textAlign: 'center' },
  assistedWarning: { fontSize: 12, color: '#d97706', fontWeight: '600', marginBottom: 8 },
  verseText: { fontSize: 17, lineHeight: 26, textAlign: 'center', color: '#374151' },
  concealedBox: { padding: 16, alignItems: 'center' },
  concealedHint: { color: '#9ca3af', fontStyle: 'italic', textAlign: 'center' },
  level1Controls: { flexDirection: 'row', marginTop: 12, justifyContent: 'center' },
  clozeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  clozeToken: {
    fontSize: 18,
    lineHeight: 30,
    fontFamily: 'monospace',
    color: '#1f2937',
  },
  clozeRevealed: {
    color: '#2563eb',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  peekToken: {
    color: '#d97706',
    fontWeight: '700',
    backgroundColor: '#fef3c7',
  },
  voiceSection: { width: '100%', alignItems: 'center', marginTop: 10 },
  voiceHint: { color: '#6b7280', fontSize: 14, textAlign: 'center', marginVertical: 10 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 16 },
  loadingText: { color: '#4f46e5', fontWeight: '500' },
  resultContainer: { width: '100%', alignItems: 'center' },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '700',
    fontSize: 13,
  },
  passScore: { backgroundColor: '#dcfce7', color: '#15803d' },
  failScore: { backgroundColor: '#fee2e2', color: '#b91c1c' },
  streakText: { fontSize: 13, color: '#4b5563', fontWeight: '600' },
  voiceActions: { width: '100%', alignSelf: 'center', maxWidth: 320, marginTop: 10 },
  doneActions: { flexDirection: 'row', justifyContent: 'center' },
  error: { color: '#ef4444', textAlign: 'center', marginBottom: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalActions: {
    gap: 12,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButton: {
    backgroundColor: '#4f46e5',
  },
  modalPrimaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSecondaryButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalSecondaryButtonText: {
    color: '#4b5563',
    fontSize: 15,
    fontWeight: '600',
  },
});

