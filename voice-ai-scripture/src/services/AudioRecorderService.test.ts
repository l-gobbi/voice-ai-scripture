import { AudioRecorderService, audioRecorder, WebAudioDriver, AudioDriver } from './AudioRecorderService';

describe('AudioRecorderService', () => {
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
