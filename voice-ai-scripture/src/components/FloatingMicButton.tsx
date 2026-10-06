import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Animated,
} from 'react-native';
import { getTheme, touchTarget } from '../theme/tokens';

export interface FloatingMicButtonProps {
  isReciting: boolean;
  isVerifying?: boolean;
  volumeLevel?: number; // 0 to 1
  vadProgress?: number; // 0 to 1
  language?: 'en' | 'pt';
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

export default function FloatingMicButton({
  isReciting,
  isVerifying = false,
  volumeLevel = 0,
  vadProgress = 0,
  language = 'en',
  onStart,
  onStop,
  onCancel,
  disabled = false,
}: FloatingMicButtonProps) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme);

  const isDisabled = disabled || isVerifying;

  const handlePress = () => {
    if (isDisabled) return;
    if (isReciting) {
      onStop();
    } else {
      onStart();
    }
  };

  const cancelLabel = language === 'pt' ? 'Cancelar' : 'Cancel';
  const buttonAccessibilityLabel = isReciting
    ? language === 'pt'
      ? 'Parar e verificar'
      : 'Stop and verify'
    : language === 'pt'
    ? 'Começar a recitar'
    : 'Start reciting';

  // Breathing aura dimension based on volumeLevel
  const clampedVol = Math.max(0, Math.min(1, volumeLevel));
  const auraScale = 1 + clampedVol * 0.35;
  const auraOpacity = 0.15 + clampedVol * 0.3;

  return (
    <View style={styles.dockContainer}>
      <View style={styles.buttonWrapper}>
        {/* Breathing Audio Aura (visible only when reciting) */}
        {isReciting && (
          <View
            testID="floating-mic-aura"
            style={[
              styles.aura,
              {
                backgroundColor: theme.colors.accentSacred,
                opacity: auraOpacity,
                transform: [{ scale: auraScale }],
              },
            ]}
          />
        )}

        {/* Delayed Silence Progress Ring */}
        <View
          testID="floating-mic-progress-ring"
          style={[
            styles.progressRing,
            {
              borderColor: theme.colors.accentSacred,
              opacity: vadProgress > 0 ? Math.min(1, Math.max(0, vadProgress)) : 0,
              borderWidth: 3 + vadProgress * 2,
            },
          ]}
        />

        {/* 76x76dp Circular Touch Target */}
        <TouchableOpacity
          testID="floating-mic-button"
          style={[
            styles.circleButton,
            {
              backgroundColor: isReciting
                ? theme.colors.accentSacred
                : theme.colors.accentSacred,
            },
            isDisabled && styles.disabledButton,
          ]}
          onPress={handlePress}
          disabled={isDisabled}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={buttonAccessibilityLabel}
        >
          <Text style={styles.buttonIcon}>
            {isReciting ? '⏹' : '🎙️'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Subtle Cancel Link (visible only while reciting) */}
      {isReciting && (
        <TouchableOpacity
          testID="floating-mic-cancel"
          style={styles.cancelLink}
          onPress={onCancel}
          disabled={isDisabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={cancelLabel}
        >
          <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>
            {cancelLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 8,
  },
  buttonWrapper: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  progressRing: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  circleButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonIcon: {
    fontSize: 28,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  cancelLink: {
    minHeight: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
