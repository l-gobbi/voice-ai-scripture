import {
  AudioRecorderService,
  audioRecorder,
  WebAudioDriver,
  AudioDriver,
  calculateNormalizedDbLevel,
} from './AudioRecorderService';

describe('AudioRecorderService', () => {
  describe('calculateNormalizedDbLevel (Quadratic dBFS Mapping)', () => {
    it('clamps values below -80 dBFS to 0', () => {
      expect(calculateNormalizedDbLevel(-100)).toBe(0);
      expect(calculateNormalizedDbLevel(-80)).toBe(0);
    });

    it('clamps values above 0 dBFS to 1', () => {
      expect(calculateNormalizedDbLevel(0)).toBe(1);
      expect(calculateNormalizedDbLevel(10)).toBe(1);
    });

    it('compresses AGC-pumped ambient room hiss (-25 to -20 dBFS) below speech thresholds', () => {
      const atMinus25 = calculateNormalizedDbLevel(-25);
      const atMinus20 = calculateNormalizedDbLevel(-20);

      // (55 / 80)^2 = 0.47265625
      expect(atMinus25).toBeCloseTo(0.473, 2);
      // (60 / 80)^2 = 0.5625
      expect(atMinus20).toBeCloseTo(0.563, 2);
    });

    it('amplifies spoken recitation levels (-10 to -4 dBFS) into clear speech range', () => {
      const atMinus10 = calculateNormalizedDbLevel(-10);
      const atMinus4 = calculateNormalizedDbLevel(-4);

      // (70 / 80)^2 = 0.765625
      expect(atMinus10).toBeCloseTo(0.766, 2);
      // (76 / 80)^2 = 0.9025
      expect(atMinus4).toBeCloseTo(0.903, 2);
    });
  });

  it('safely handles deleteAudioFile for web and native paths', async () => {
    // Empty URI handling
    const resEmpty = await audioRecorder.deleteAudioFile('');
    expect(resEmpty).toBe(false);

    // Valid URI deletion
    const resValid = await audioRecorder.deleteAudioFile('file:///cache/recitation.m4a');
    expect(resValid).toBe(true);
  });

  it('delegates recording operations to injected AudioDriver', async () => {
    const mockDriver: AudioDriver = {
      requestPermissions: jest.fn().mockResolvedValue(true),
      startRecording: jest.fn().mockResolvedValue(undefined),
      stopRecording: jest.fn().mockResolvedValue('file:///test.m4a'),
      deleteAudioFile: jest.fn().mockResolvedValue(true),
    };

    const service = new AudioRecorderService(mockDriver);

    expect(await service.requestPermissions()).toBe(true);
    expect(mockDriver.requestPermissions).toHaveBeenCalled();

    const onMeter = jest.fn();
    await service.startRecording(onMeter);
    expect(mockDriver.startRecording).toHaveBeenCalledWith(onMeter);

    expect(await service.stopRecording()).toBe('file:///test.m4a');
    expect(mockDriver.stopRecording).toHaveBeenCalled();

    expect(await service.deleteAudioFile('file:///test.m4a')).toBe(true);
    expect(mockDriver.deleteAudioFile).toHaveBeenCalledWith('file:///test.m4a');
  });

  it('WebAudioDriver safely revokes blob URLs on deletion', async () => {
    const revokeSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const webDriver = new WebAudioDriver();

    const resEmpty = await webDriver.deleteAudioFile('');
    expect(resEmpty).toBe(false);

    const resBlob = await webDriver.deleteAudioFile('blob:http://localhost/1234');
    expect(resBlob).toBe(true);
    expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/1234');

    revokeSpy.mockRestore();
  });
});
