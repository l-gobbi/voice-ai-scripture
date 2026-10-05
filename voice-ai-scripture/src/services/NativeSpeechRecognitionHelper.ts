import { Platform } from 'react-native';

/**
 * Safely retrieves ExpoSpeechRecognitionModule without crashing Expo Go.
 * In Expo Go, custom native modules like ExpoSpeechRecognition are not compiled in,
 * and requiring 'expo-speech-recognition' throws an Uncaught Error at module load time.
 */
export function getExpoSpeechRecognitionModule(): any {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    // Check if requireOptionalNativeModule is available from 'expo'
    const expo = require('expo');
    const requireOptionalNativeModule = expo?.requireOptionalNativeModule;

    if (typeof requireOptionalNativeModule === 'function') {
      const nativeModule = requireOptionalNativeModule('ExpoSpeechRecognition');
      if (!nativeModule) {
        return null;
      }
    }

    // If native module exists, safely require the package
    const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');
    return ExpoSpeechRecognitionModule || null;
  } catch {
    return null;
  }
}
