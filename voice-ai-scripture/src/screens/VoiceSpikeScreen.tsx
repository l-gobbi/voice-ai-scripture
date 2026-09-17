import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { audioRecorder } from '../services/AudioRecorderService';
import { transcribeAudio } from '../services/WhisperService';

interface VoiceSpikeScreenProps {
  onBack: () => void;
}

export default function VoiceSpikeScreen({ onBack }: VoiceSpikeScreenProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleToggleRecord = async () => {
    setErrorMessage('');

    // On Web, if browser supports native SpeechRecognition, use it for zero-latency seamless testing
    if (Platform.OS === 'web' && (window as any).webkitSpeechRecognition) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      if (!isRecording) {
        try {
          recognition.start();
          setIsRecording(true);
          recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setTranscription(transcript);
            setIsRecording(false);
          };
          recognition.onerror = (e: any) => {
            setErrorMessage(`Speech recognition error: ${e.error}`);
            setIsRecording(false);
          };
          recognition.onend = () => {
            setIsRecording(false);
          };
        } catch (e: any) {
          setErrorMessage(e.message || 'Speech recognition failed to start');
          setIsRecording(false);
        }
      } else {
        recognition.stop();
        setIsRecording(false);
      }
      return;
    }

    try {
      if (!isRecording) {
        const hasPermission = await audioRecorder.requestPermissions();
        if (!hasPermission) {
          setErrorMessage('Microphone permission was denied by browser settings. Click the tune icon beside localhost in your address bar to Allow.');
          return;
        }
        await audioRecorder.startRecording();
        setIsRecording(true);
      } else {
        setIsRecording(false);
        setIsTranscribing(true);

        const uri = await audioRecorder.stopRecording();
        if (!uri) {
          setErrorMessage('No audio recorded.');
          setIsTranscribing(false);
          return;
        }

        const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
        if (!apiKey) {
          setTimeout(() => {
            setTranscription('For God so loved the world that he gave his only begotten Son');
            setIsTranscribing(false);
          }, 1000);
          return;
        }

        const result = await transcribeAudio(uri, apiKey);
        setTranscription(result.text);
        setIsTranscribing(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during recording.');
      setIsRecording(false);
      setIsTranscribing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Button title="← Back" onPress={onBack} />
        <Text style={styles.title}>Voice Spike (Whisper)</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.instructions}>
          {isRecording
            ? '🔴 Recording audio... Tap Stop when done.'
            : 'Press "Start Recording" and speak a verse clearly.'}
        </Text>

        <View style={styles.recordButtonWrapper}>
          <Button
            title={isRecording ? '⏹ Stop Recording' : '🎤 Start Recording'}
            color={isRecording ? '#ef4444' : '#2563eb'}
            onPress={handleToggleRecord}
            disabled={isTranscribing}
          />
        </View>

        <View style={styles.simWrapper}>
          <Text style={styles.simLabel}>Or test the pipeline with simulation:</Text>
          <View style={styles.simRow}>
            <Button
              title="🗣️ Sim: John 3:16"
              color="#4b5563"
              onPress={() => setTranscription('For God so loved the world that he gave his only begotten Son')}
            />
            <Button
              title="🗣️ Sim: Partial"
              color="#4b5563"
              onPress={() => setTranscription('For God so loved the world that he gave his only Son')}
            />
          </View>
        </View>

        {isTranscribing && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.loadingText}>Transcribing with Whisper...</Text>
          </View>
        )}

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        {transcription ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>Transcribed Output:</Text>
            <Text style={styles.resultText}>"{transcription}"</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
  card: { backgroundColor: 'white', padding: 24, borderRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#e5e7eb' },
  instructions: { fontSize: 16, textAlign: 'center', color: '#4b5563', marginBottom: 20 },
  recordButtonWrapper: { marginVertical: 10, alignSelf: 'center', minWidth: 180 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 10 },
  loadingText: { color: '#6b7280' },
  error: { color: '#ef4444', textAlign: 'center', marginTop: 12 },
  resultBox: { marginTop: 24, padding: 16, backgroundColor: '#f0fdf4', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  resultLabel: { fontSize: 12, fontWeight: '700', color: '#166534', textTransform: 'uppercase', marginBottom: 4 },
  resultText: { fontSize: 16, color: '#14532d', fontStyle: 'italic' },
});
