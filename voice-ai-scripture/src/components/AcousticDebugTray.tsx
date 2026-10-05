import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { getTheme } from '../theme/tokens';

export interface AcousticDebugTrayProps {
  visible: boolean;
  rawTranscript?: string | null;
  isVerifying: boolean;
  isReciting: boolean;
  errorDetails?: string | null;
  onClose: () => void;
}

export default function AcousticDebugTray({
  visible,
  rawTranscript,
  isVerifying,
  isReciting,
  errorDetails,
  onClose,
}: AcousticDebugTrayProps) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme);

  if (!visible || typeof __DEV__ === 'undefined' || !__DEV__) {
    return null;
  }

  return (
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
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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

      {errorDetails ? (
        <>
          <Text style={[styles.debugLabel, { color: theme.colors.diffMissedText, marginTop: 6 }]}>
            Last Error Details:
          </Text>
          <View
            style={[
              styles.debugTranscriptBox,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.diffMissedText },
            ]}
          >
            <Text
              style={[
                styles.debugTranscriptText,
                { color: theme.colors.diffMissedText, fontSize: 12 },
              ]}
              selectable
            >
              {errorDetails}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
