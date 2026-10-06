global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default
);

jest.mock('expo-audio', () => ({
  AudioModule: {
    requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    Recording: jest.fn().mockImplementation(() => ({
      prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
      record: jest.fn(),
      stop: jest.fn().mockResolvedValue(undefined),
      getURI: jest.fn().mockReturnValue('file:///test.m4a'),
      setOnRecordingStatusUpdate: jest.fn(),
    })),
  },
}));
