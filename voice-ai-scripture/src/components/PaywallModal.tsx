import React from 'react';
import { View, Text, StyleSheet, Modal, Button, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}

export default function PaywallModal({ visible, onClose, onSubscribe }: PaywallModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalCard}>
          <Text style={styles.header}>Unlock Unlimited Voice AI</Text>
          <Text style={styles.subtitle}>
            Strengthen your scripture memorization with hands-free recitation and real-time feedback.
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🎤</Text>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Unlimited Voice Recitations</Text>
                <Text style={styles.featureDesc}>Speak your verses out loud and get instant word-by-word diffs.</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📈</Text>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Spaced Repetition Algorithm</Text>
                <Text style={styles.featureDesc}>Automatic scheduling that adapts to your recitation accuracy.</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✝️</Text>
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>Kingdom Mission</Text>
                <Text style={styles.featureDesc}>Supports development of independent Christian technology.</Text>
              </View>
            </View>
          </View>

          <View style={styles.pricingBox}>
            <Text style={styles.priceText}>$4.99 / month</Text>
            <Text style={styles.trialText}>7-day free trial, cancel anytime</Text>
          </View>

          <View style={styles.ctaButton}>
            <Button title="Start 7-Day Free Trial" color="#4f46e5" onPress={onSubscribe} />
          </View>

          <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
            <Text style={styles.dismissText}>Continue with Free Self-Review</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  featuresList: {
    width: '100%',
    marginBottom: 20,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  featureDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  pricingBox: {
    backgroundColor: '#f5f3ff',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  priceText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4f46e5',
  },
  trialText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  ctaButton: {
    width: '100%',
    marginBottom: 12,
  },
  dismissButton: {
    paddingVertical: 10,
  },
  dismissText: {
    color: '#9ca3af',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
