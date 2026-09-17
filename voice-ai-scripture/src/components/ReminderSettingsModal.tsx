import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Button,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReminderService, ReminderSettings } from '../services/ReminderService';

interface ReminderSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRESET_HOURS = [
  { label: '6:30 AM (Sunrise)', hour: 6, minute: 30 },
  { label: '8:00 AM (Morning)', hour: 8, minute: 0 },
  { label: '12:30 PM (Midday)', hour: 12, minute: 30 },
  { label: '9:00 PM (Evening)', hour: 21, minute: 0 },
];

export default function ReminderSettingsModal({
  visible,
  onClose,
}: ReminderSettingsModalProps) {
  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: false,
    hour: 8,
    minute: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      ReminderService.getReminderSettings().then(setSettings);
    }
  }, [visible]);

  const handleSave = async () => {
    setSaving(true);
    const result = await ReminderService.saveReminderSettings(settings);
    setSaving(false);

    let message = settings.enabled
      ? `Quiet-Time reminder scheduled for ${formatTime(settings.hour, settings.minute)} every day!`
      : 'Daily reminders turned off.';

    if (settings.enabled && result?.isExpoGoAndroid) {
      message += '\n\n(Saved to your device! Note: Local push notifications trigger in standalone / development builds).';
    }

    Alert.alert('Settings Saved', message);
    onClose();
  };

  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const displayMin = m < 10 ? `0${m}` : m;
    return `${displayHour}:${displayMin} ${period}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalCard}>
          <Text style={styles.header}>⏰ Daily Quiet-Time Reminder</Text>
          <Text style={styles.subtitle}>
            Build a consistent scripture habit. We'll send you a peaceful prompt when you have verses due.
          </Text>

          {/* Toggle Switch */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Enable Daily Reminder</Text>
            <Switch
              value={settings.enabled}
              onValueChange={(val) => setSettings({ ...settings, enabled: val })}
              trackColor={{ false: '#d1d5db', true: '#c7d2fe' }}
              thumbColor={settings.enabled ? '#4f46e5' : '#f4f3f4'}
            />
          </View>

          {/* Time Picker Presets */}
          {settings.enabled && (
            <View style={styles.presetSection}>
              <Text style={styles.sectionTitle}>Choose your prayer & recitation time:</Text>
              <View style={styles.presetList}>
                {PRESET_HOURS.map((preset) => {
                  const isSelected =
                    settings.hour === preset.hour && settings.minute === preset.minute;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      style={[styles.presetButton, isSelected && styles.selectedPreset]}
                      onPress={() =>
                        setSettings({
                          ...settings,
                          hour: preset.hour,
                          minute: preset.minute,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.presetText,
                          isSelected && styles.selectedPresetText,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.actionButtons}>
            <Button title="Cancel" color="#6b7280" onPress={onClose} />
            <View style={{ width: 16 }} />
            <Button
              title={saving ? 'Saving...' : 'Save Reminder'}
              color="#4f46e5"
              onPress={handleSave}
              disabled={saving}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  presetSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  presetList: {
    gap: 8,
  },
  presetButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  selectedPreset: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  presetText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  selectedPresetText: {
    color: '#4338ca',
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
});
