import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface WaveformVisualizerProps {
  isReciting?: boolean;
  isRecording?: boolean;
  volumeLevel?: number; // 0.0 (silence) to 1.0 (loud)
}

export default function WaveformVisualizer({
  isReciting,
  isRecording,
  volumeLevel = 0,
}: WaveformVisualizerProps) {
  const active = isReciting ?? isRecording ?? false;

  // 5 bars
  const bar1 = useRef(new Animated.Value(10)).current;
  const bar2 = useRef(new Animated.Value(14)).current;
  const bar3 = useRef(new Animated.Value(18)).current;
  const bar4 = useRef(new Animated.Value(14)).current;
  const bar5 = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    if (!active) {
      bar1.setValue(10);
      bar2.setValue(14);
      bar3.setValue(18);
      bar4.setValue(14);
      bar5.setValue(10);
      return;
    }

    // Dynamic reaction: scale heights based on live volume input
    const baseH = 8;
    const boost = Math.max(0.05, volumeLevel); // at least small gentle baseline

    const target1 = baseH + boost * 35 * 0.6;
    const target2 = baseH + boost * 55 * 0.85;
    const target3 = baseH + boost * 75 * 1.0; // center peak
    const target4 = baseH + boost * 55 * 0.85;
    const target5 = baseH + boost * 35 * 0.6;

    Animated.parallel([
      Animated.timing(bar1, { toValue: target1, duration: 80, useNativeDriver: false }),
      Animated.timing(bar2, { toValue: target2, duration: 80, useNativeDriver: false }),
      Animated.timing(bar3, { toValue: target3, duration: 80, useNativeDriver: false }),
      Animated.timing(bar4, { toValue: target4, duration: 80, useNativeDriver: false }),
      Animated.timing(bar5, { toValue: target5, duration: 80, useNativeDriver: false }),
    ]).start();
  }, [active, volumeLevel]);

  if (!active) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bar, { height: bar1 }]} />
      <Animated.View style={[styles.bar, { height: bar2 }]} />
      <Animated.View style={[styles.bar, styles.centerBar, { height: bar3 }]} />
      <Animated.View style={[styles.bar, { height: bar4 }]} />
      <Animated.View style={[styles.bar, { height: bar5 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 85,
    marginVertical: 12,
  },
  bar: {
    width: 6,
    borderRadius: 3,
    backgroundColor: '#818cf8',
  },
  centerBar: {
    backgroundColor: '#4f46e5',
  },
});
