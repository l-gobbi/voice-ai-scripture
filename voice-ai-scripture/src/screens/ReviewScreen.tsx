import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { verseEngine, Verse } from '../services/VerseEngine';
import { useRecitationSession } from '../hooks/useRecitationSession';
import DiffView from '../components/DiffView';
import PaywallModal from '../components/PaywallModal';
import WaveformVisualizer from '../components/WaveformVisualizer';
import { SubscriptionService } from '../services/SubscriptionService';
import {
  generateClozeTokens,
  revealWord,
  hideWord,
  evaluateAssistedScore,
  ClozeToken,
} from '../engines/clozeEngine';
import { getDefaultSpeechSynthesizer } from '../services/SpeechSynthesizer';
import { inferVerseLanguage } from '../services/RecitationSession';

export type RecitationLevel = 1 | 2 | 3;

interface ReviewScreenProps {
  verse: Verse;
  onComplete: () => void;
}

export default function ReviewScreen({ verse, onComplete }: ReviewScreenProps) {
  const [level, setLevel] = useState<RecitationLevel>(3);
  const [level1Revealed, setLevel1Revealed] = useState(false);
  const [clozeTokens, setClozeTokens] = useState<ClozeToken[]>([]);
  const [assistanceUsed, setAssistanceUsed] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [practiceVoiceResult, setPracticeVoiceResult] = useState<{
    score: number;
    tokens: any[];
    passed: boolean;
  } | null>(null);

  const peekTimersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const {
    status,
    volumeLevel,
    result: officialResult,
    errorMessage,
    startReciting,
    stopAndVerify,
    reset: resetRecitation,
  } = useRecitationSession(verse);

  const isReciting = status === 'reciting';
  const isVerifying = status === 'verifying';

  useEffect(() => {
    resetRecitation();
    setPracticeVoiceResult(null);
    setAssistanceUsed(false);
    setLevel1Revealed(false);

    peekTimersRef.current.forEach((t) => clearTimeout(t));
    peekTimersRef.current.clear();

    if (level === 1) {
      const synth = getDefaultSpeechSynthesizer();
      const lang = inferVerseLanguage(verse);
      synth.speak(verse.text, { language: lang }).catch(() => {});
    } else if (level === 2) {
      setClozeTokens(generateClozeTokens(verse.text, 'first-letter'));
    } else if (level === 3) {
      setClozeTokens(generateClozeTokens(verse.text, 'blank'));
    }

    return () => {
      peekTimersRef.current.forEach((t) => clearTimeout(t));
      peekTimersRef.current.clear();
      getDefaultSpeechSynthesizer().stop().catch(() => {});
    };
  }, [level, verse.id, verse.text]);

  useEffect(() => {
    if (status === 'quota_exhausted') {
      setShowPaywall(true);
    }
  }, [status]);

  const handleVocalize = () => {
    const synth = getDefaultSpeechSynthesizer();
    const lang = inferVerseLanguage(verse);
    synth.speak(verse.text, { language: lang }).catch(() => {});
  };

  const handleLevel2WordTap = (index: number) => {
    setClozeTokens((prev) => revealWord(prev, index));
  };

  const handleLevel3WordTap = (index: number) => {
    setAssistanceUsed(true);
    setClozeTokens((prev) => revealWord(prev, index));

    const existingTimer = peekTimersRef.current.get(index);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      setClozeTokens((prev) => hideWord(prev, index));
      peekTimersRef.current.delete(index);
    }, 3000);

    peekTimersRef.current.set(index, timer);
  };

  const handleToggleRecitation = async () => {
    if (isReciting) {
      if (level === 1 || level === 2) {
        const res = await stopAndVerify({ unmetered: true });
        if (res) {
          setPracticeVoiceResult({
            score: res.score,
            tokens: res.tokens,
            passed: res.passed,
          });
        }
      } else {
        await stopAndVerify({
          unmetered: false,
          assistanceUsed,
        });
      }
    } else {
      setPracticeVoiceResult(null);
      if (level === 1 || level === 2) {
        await startReciting({ unmetered: true });
      } else {
        await startReciting({ unmetered: false });
      }
    }
  };

  const currentResult =
    level === 3
      ? officialResult
      : practiceVoiceResult ||
        (officialResult
          ? {
              score: officialResult.score,
              tokens: officialResult.tokens,
              passed: officialResult.passed,
            }
          : null);

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
              {level1Revealed ? (
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
                  title={level1Revealed ? 'Conceal Text' : 'Reveal Text'}
                  onPress={() => setLevel1Revealed(!level1Revealed)}
                />
                <View style={{ width: 10 }} />
                <Button title="🔊 Listen Again" onPress={handleVocalize} />
              </View>
            </View>
          )}

          {level === 2 && (
            <View style={styles.levelCard}>
              <View style={styles.levelHeaderRow}>
                <Text style={styles.levelBadge}>Level 2: Cloze Practice</Text>
                <Button title="🔊 Listen" onPress={handleVocalize} />
              </View>
              <Text style={styles.instructionText}>
                Tap any blanked word to reveal it inline if you need a prompt.
              </Text>
              <View style={styles.clozeContainer}>
                {clozeTokens.map((token, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleLevel2WordTap(idx)}
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
                    onPress={() => handleLevel3WordTap(idx)}
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
                      ? currentResult.passed
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
                onPress={() => {
                  setPracticeVoiceResult(null);
                  resetRecitation();
                }}
              />
              <View style={{ width: 16 }} />
              {level < 3 ? (
                <Button
                  title={`Next: Level ${level + 1} →`}
                  color="#4f46e5"
                  onPress={() => setLevel((prev) => (prev + 1) as RecitationLevel)}
                />
              ) : (
                <Button title="Done (Next Verse) →" color="#16a34a" onPress={onComplete} />
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
});
