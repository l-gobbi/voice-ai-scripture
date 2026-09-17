import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calculateNextReview, DEFAULT_SRS_STATE, SRSState } from '../engines/srsEngine';
import { VerseStorageService, Verse } from '../services/VerseStorageService';
import { useRecitationSession } from '../hooks/useRecitationSession';
import DiffView from '../components/DiffView';
import PaywallModal from '../components/PaywallModal';
import WaveformVisualizer from '../components/WaveformVisualizer';
import { SubscriptionService } from '../services/SubscriptionService';

interface ReviewScreenProps {
  verse: Verse;
  onComplete: () => void;
}

export default function ReviewScreen({ verse, onComplete }: ReviewScreenProps) {
  const [mode, setMode] = useState<'self-review' | 'voice'>('voice');
  const [isRevealed, setIsRevealed] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const {
    status,
    volumeLevel,
    result: voiceResult,
    errorMessage,
    startReciting,
    stopAndVerify,
    reset: resetRecitation,
  } = useRecitationSession(verse);

  const isReciting = status === 'reciting';
  const isProcessing = status === 'evaluating';

  useEffect(() => {
    if (status === 'quota_exhausted') {
      setShowPaywall(true);
    }
  }, [status]);

  // Manual Self-Review Verification
  const handleManualVerification = async (passed: boolean) => {
    const currentSRS: SRSState = verse.srs || DEFAULT_SRS_STATE;
    const score = passed ? 100 : 0;
    const newSRS = calculateNextReview(currentSRS, score);

    await VerseStorageService.updateVerseSRS(verse.id, newSRS);
    onComplete();
  };

  // Voice Recitation Toggle
  const handleToggleRecord = async () => {
    if (isReciting) {
      await stopAndVerify();
    } else {
      await startReciting();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Button title="← Back" onPress={onComplete} />
          
          <View style={styles.modeToggle}>
            <Text
              style={[styles.modeTab, mode === 'voice' && styles.activeModeTab]}
              onPress={() => {
                setMode('voice');
                resetRecitation();
              }}
            >
              🎤 Voice AI
            </Text>
            <Text
              style={[styles.modeTab, mode === 'self-review' && styles.activeModeTab]}
              onPress={() => setMode('self-review')}
            >
              📄 Self-Review
            </Text>
          </View>
        </View>

        <View style={styles.verseContainer}>
          <Text style={styles.reference}>{verse.reference}</Text>

          {mode === 'self-review' ? (
            // Self-Review Mode UI
            <>
              {isRevealed ? (
                <Text style={styles.verseText}>{verse.text}</Text>
              ) : (
                <View style={styles.concealedBox}>
                  <Text style={styles.concealedHint}>Recite the verse in your mind or out loud...</Text>
                </View>
              )}
            </>
          ) : (
            // Voice AI Mode UI
            <View style={styles.voiceSection}>
              <WaveformVisualizer isReciting={isReciting} volumeLevel={volumeLevel} />

              {!voiceResult && !isProcessing && (
                <Text style={styles.voiceHint}>
                  {isReciting
                    ? 'Listening... Recite the verse clearly and tap stop!'
                    : 'Tap the button below and recite this verse from memory.'}
                </Text>
              )}

              {isProcessing && (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color="#4f46e5" />
                  <Text style={styles.loadingText}>Evaluating recitation with AI...</Text>
                </View>
              )}

              {voiceResult && (
                <View style={styles.resultContainer}>
                  <View style={styles.scoreHeader}>
                    <Text style={[styles.scoreBadge, voiceResult.passed ? styles.passScore : styles.failScore]}>
                      {voiceResult.score}% Accuracy
                    </Text>
                    <Text style={styles.streakText}>
                      {voiceResult.passed ? '🎉 Streak Increased!' : '🔄 Review Scheduled for Tomorrow'}
                    </Text>
                  </View>

                  <DiffView tokens={voiceResult.tokens} />
                </View>
              )}
            </View>
          )}
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        {/* Action Controls */}
        {mode === 'self-review' ? (
          !isRevealed ? (
            <View style={styles.actionContainer}>
              <Button title="Reveal Text" onPress={() => setIsRevealed(true)} />
            </View>
          ) : (
            <View style={styles.verificationContainer}>
              <Text style={styles.verificationLabel}>How did you do?</Text>
              <View style={styles.buttonRow}>
                <Button title="❌ Fail" color="#ef4444" onPress={() => handleManualVerification(false)} />
                <Button title="✅ Pass" color="#22c55e" onPress={() => handleManualVerification(true)} />
              </View>
            </View>
          )
        ) : (
          <View style={styles.voiceActions}>
            {!voiceResult ? (
              <Button
                title={isReciting ? '⏹ Stop & Verify' : '🎤 Start Reciting'}
                color={isReciting ? '#ef4444' : '#4f46e5'}
                onPress={handleToggleRecord}
                disabled={isProcessing}
              />
            ) : (
              <View style={styles.doneActions}>
                <Button title="Practice Again" color="#6b7280" onPress={resetRecitation} />
                <View style={{ width: 16 }} />
                <Button title="Done (Next Verse) →" color="#16a34a" onPress={onComplete} />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSubscribe={async () => {
          await SubscriptionService.subscribePremium();
          setShowPaywall(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modeToggle: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 8, padding: 3 },
  modeTab: { paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, fontWeight: '600', color: '#64748b' },
  activeModeTab: { backgroundColor: 'white', color: '#1e293b', borderRadius: 6 },
  verseContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    minHeight: 200,
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
  reference: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  verseText: { fontSize: 17, lineHeight: 26, textAlign: 'center', color: '#374151' },
  concealedBox: { padding: 20, alignItems: 'center' },
  concealedHint: { color: '#9ca3af', fontStyle: 'italic', textAlign: 'center' },
  voiceSection: { width: '100%', alignItems: 'center' },
  voiceHint: { color: '#6b7280', fontSize: 15, textAlign: 'center', marginVertical: 12 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 16 },
  loadingText: { color: '#4f46e5', fontWeight: '500' },
  resultContainer: { width: '100%', alignItems: 'center' },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 10 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontWeight: '700', fontSize: 13 },
  passScore: { backgroundColor: '#dcfce7', color: '#15803d' },
  failScore: { backgroundColor: '#fee2e2', color: '#b91c1c' },
  streakText: { fontSize: 13, color: '#4b5563', fontWeight: '600' },
  actionContainer: { paddingHorizontal: 20 },
  verificationContainer: { alignItems: 'center' },
  verificationLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#4b5563' },
  buttonRow: { flexDirection: 'row', gap: 20, justifyContent: 'center', width: '100%' },
  voiceActions: { width: '100%', alignSelf: 'center', maxWidth: 300, marginTop: 10 },
  doneActions: { flexDirection: 'row', justifyContent: 'center' },
  error: { color: '#ef4444', textAlign: 'center', marginBottom: 12 },
});
