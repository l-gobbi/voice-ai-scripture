import { VoiceActivityDetector, VADConfig, VADState } from './VoiceActivityDetector';

describe('VoiceActivityDetector (Ticket 51)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('initializes in idle state and transitions to calibrating on start', () => {
    const vad = new VoiceActivityDetector();
    expect(vad.getState()).toBe('idle');

    vad.start();
    expect(vad.getState()).toBe('calibrating');
  });

  it('calibrates dynamic noise floor during first 300ms and transitions to listening_initial', () => {
    const vad = new VoiceActivityDetector();
    vad.start();

    // Send background hum (e.g. 0.05) during 300ms
    vad.feedMeter(0.04);
    jest.advanceTimersByTime(100);
    vad.feedMeter(0.05);
    jest.advanceTimersByTime(100);
    vad.feedMeter(0.06);
    jest.advanceTimersByTime(100);

    expect(vad.getState()).toBe('listening_initial');
    expect(vad.getNoiseFloor()).toBeCloseTo(0.05, 2);
  });

  it('triggers initial silence timeout if no speech is detected within 10 seconds', () => {
    const onInitialTimeout = jest.fn();
    const vad = new VoiceActivityDetector({ onInitialTimeout });
    vad.start();

    // 300ms calibration
    jest.advanceTimersByTime(300);
    expect(vad.getState()).toBe('listening_initial');

    // 10 seconds of background silence
    jest.advanceTimersByTime(9900);
    expect(onInitialTimeout).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100); // reaches 10s of listening_initial
    expect(onInitialTimeout).toHaveBeenCalledTimes(1);
    expect(vad.getState()).toBe('idle');
  });

  it('transitions to speaking when audible speech occurs above noise floor', () => {
    const onSpeechStart = jest.fn();
    const vad = new VoiceActivityDetector({ onSpeechStart });
    vad.start();
    jest.advanceTimersByTime(300);

    // Feed audible speech (volume 0.70 in quadratic domain)
    vad.feedMeter(0.70);
    expect(vad.getState()).toBe('speaking');
    expect(onSpeechStart).toHaveBeenCalledTimes(1);
  });

  it('does not arm thinking grace period until cumulative speech reaches at least 1.0s', () => {
    const onSilenceTimeout = jest.fn();
    const vad = new VoiceActivityDetector({ onSilenceTimeout });
    vad.start();
    jest.advanceTimersByTime(300);

    // Speak for only 400ms (e.g. short cough)
    vad.feedMeter(0.70);
    jest.advanceTimersByTime(400);

    // Silence begins
    vad.feedMeter(0.02);
    jest.advanceTimersByTime(3500);

    // Since cumulative speech was < 1.0s, thinking grace silence auto-complete should NOT fire
    expect(onSilenceTimeout).not.toHaveBeenCalled();
    // It should have returned to listening_initial
    expect(vad.getState()).toBe('listening_initial');
  });

  it('enters thinking_grace and delayed arc when silence follows >= 1.0s of speech', () => {
    const onProgress = jest.fn();
    const onSilenceTimeout = jest.fn();
    const vad = new VoiceActivityDetector({ onProgress, onSilenceTimeout });
    vad.start();
    jest.advanceTimersByTime(300);

    // Speak for 1200ms (1.2s > 1.0s min speech)
    vad.feedMeter(0.70);
    jest.advanceTimersByTime(1200);

    // Silence begins
    vad.feedMeter(0.03);
    expect(vad.getState()).toBe('thinking_grace');

    // First 1.5 seconds of silence: progress must remain 0 (delayed arc, anxiety-free)
    jest.advanceTimersByTime(500);
    expect(vad.getProgress()).toBe(0);

    jest.advanceTimersByTime(1000); // 1.5s total silence
    expect(vad.getProgress()).toBe(0);

    // Between 1.5s and 3.5s (2.0s duration), progress scales smoothly from 0 to 1
    jest.advanceTimersByTime(1000); // 2.5s total silence (halfway through the 2.0s arc)
    expect(vad.getProgress()).toBeCloseTo(0.5, 1);

    jest.advanceTimersByTime(1000); // 3.5s total silence
    expect(vad.getProgress()).toBe(1);
    expect(onSilenceTimeout).toHaveBeenCalledTimes(1);
    expect(vad.getState()).toBe('auto_completed');
  });

  it('resets progress arc to 0 immediately if user resumes speaking during thinking_grace', () => {
    const onProgress = jest.fn();
    const vad = new VoiceActivityDetector({ onProgress });
    vad.start();
    jest.advanceTimersByTime(300);

    // Speak for 1000ms
    vad.feedMeter(0.70);
    jest.advanceTimersByTime(1000);

    // Pause for 2.5s (progress should be ~0.5)
    vad.feedMeter(0.02);
    jest.advanceTimersByTime(2500);
    expect(vad.getProgress()).toBeGreaterThan(0.4);

    // User resumes speaking!
    vad.feedMeter(0.75);
    expect(vad.getState()).toBe('speaking');
    expect(vad.getProgress()).toBe(0);
  });

  it('cleans up all timers on cancel and resets to idle', () => {
    const onSilenceTimeout = jest.fn();
    const vad = new VoiceActivityDetector({ onSilenceTimeout });
    vad.start();
    jest.advanceTimersByTime(300);

    vad.feedMeter(0.70);
    jest.advanceTimersByTime(1000);

    vad.cancel();
    expect(vad.getState()).toBe('idle');
    expect(vad.getProgress()).toBe(0);

    // Advance past any timers
    jest.advanceTimersByTime(10000);
    expect(onSilenceTimeout).not.toHaveBeenCalled();
  });

  describe('Bug Repro: Silence auto-completion failure in real room conditions', () => {
    it('fails to trigger silence timeout when mic initializes after 300ms and room noise is 0.15', () => {
      const onSilenceTimeout = jest.fn();
      const onProgress = jest.fn();
      const vad = new VoiceActivityDetector({ onSilenceTimeout, onProgress });

      vad.start();
      // Hardware/driver delay: 0 meter samples during first 300ms calibration
      jest.advanceTimersByTime(300);

      // Microphone finally starts streaming with ambient room noise (0.15)
      vad.feedMeter(0.15);

      // User speaks loudly for 1500ms
      vad.feedMeter(0.65);
      jest.advanceTimersByTime(1500);

      // User STOPS speaking completely. Only room ambient noise (0.15) remains.
      for (let t = 0; t < 4000; t += 100) {
        vad.feedMeter(0.15);
        jest.advanceTimersByTime(100);
      }

      // Expected: User stopped speaking for 4 seconds (> 3.5s grace period).
      // auto-completion MUST trigger onSilenceTimeout.
      expect(onSilenceTimeout).toHaveBeenCalledTimes(1);
    });

    it('triggers silence timeout when room ambient noise is 0.22 and user stops speaking', () => {
      const onSilenceTimeout = jest.fn();
      const vad = new VoiceActivityDetector({ onSilenceTimeout });

      vad.start();
      // Mic streams background noise of 0.22 during calibration
      vad.feedMeter(0.22);
      jest.advanceTimersByTime(300);

      // User speaks at 0.65 for 1500ms
      vad.feedMeter(0.65);
      jest.advanceTimersByTime(1500);

      // User stops reciting. Only 0.22 room noise remains.
      for (let t = 0; t < 4000; t += 100) {
        vad.feedMeter(0.22);
        jest.advanceTimersByTime(100);
      }

      expect(onSilenceTimeout).toHaveBeenCalledTimes(1);
    });

    it('triggers silence timeout when mic initializes after 300ms and room noise is 0.22', () => {
      const onSilenceTimeout = jest.fn();
      const vad = new VoiceActivityDetector({ onSilenceTimeout });

      vad.start();
      // Hardware/driver delay: 0 meter samples during first 300ms calibration
      jest.advanceTimersByTime(300);

      // Microphone finally starts streaming with ambient room noise (0.22)
      vad.feedMeter(0.22);

      // User speaks loudly for 1500ms
      vad.feedMeter(0.65);
      jest.advanceTimersByTime(1500);

      // User STOPS speaking completely. Only room ambient noise (0.22) remains.
      for (let t = 0; t < 4000; t += 100) {
        vad.feedMeter(0.22);
        jest.advanceTimersByTime(100);
      }

      expect(onSilenceTimeout).toHaveBeenCalledTimes(1);
    });

    it('triggers silence timeout when room ambient noise is 0.26 after speech', () => {
      const onSilenceTimeout = jest.fn();
      const vad = new VoiceActivityDetector({ onSilenceTimeout });

      vad.start();
      // Room ambient noise 0.26
      vad.feedMeter(0.26);
      jest.advanceTimersByTime(300);

      // User speaks at 0.70 for 2000ms
      vad.feedMeter(0.70);
      jest.advanceTimersByTime(2000);

      // User stops reciting. Room ambient noise is 0.26
      for (let t = 0; t < 4500; t += 100) {
        vad.feedMeter(0.26);
        jest.advanceTimersByTime(100);
      }

      expect(onSilenceTimeout).toHaveBeenCalledTimes(1);
    });

    it('triggers silence timeout despite natural post-speech exhale and mic rustle', () => {
      const onSilenceTimeout = jest.fn();
      const vad = new VoiceActivityDetector({ onSilenceTimeout });

      vad.start();
      vad.feedMeter(0.18);
      jest.advanceTimersByTime(300);

      // User speaks at 0.65 for 2000ms
      vad.feedMeter(0.65);
      jest.advanceTimersByTime(2000);

      // Post-speech exhale (200ms at 0.35)
      vad.feedMeter(0.35);
      jest.advanceTimersByTime(200);

      // Followed by 4000ms of staying quiet with ambient fluctuations (0.18 to 0.25)
      for (let t = 0; t < 4000; t += 100) {
        const flutter = 0.20 + (t % 3 === 0 ? 0.05 : 0.01);
        vad.feedMeter(flutter);
        jest.advanceTimersByTime(100);
      }

      expect(onSilenceTimeout).toHaveBeenCalledTimes(1);
    });

    it('reproduces street noise failure: ambient 0.40 with 0.50 spikes prevents auto-completion', () => {
      const onSilenceTimeout = jest.fn();
      const onProgress = jest.fn();
      const vad = new VoiceActivityDetector({ onSilenceTimeout, onProgress });

      vad.start();
      // Calibrate at 0.38
      for (let t = 0; t < 300; t += 100) {
        vad.feedMeter(0.38);
        jest.advanceTimersByTime(100);
      }

      // User recites for 2000ms at 0.65
      for (let t = 0; t < 2000; t += 100) {
        vad.feedMeter(0.65);
        jest.advanceTimersByTime(100);
      }

      // User stops reciting. Now user is quiet, but street noise hovers at 0.40 with spikes to 0.50 every 400ms
      for (let t = 0; t < 5000; t += 100) {
        const spike = (t % 400 === 0) ? 0.50 : 0.40;
        vad.feedMeter(spike);
        jest.advanceTimersByTime(100);
      }

      // In real life, after 5 seconds of the user stopping speech, silence timeout MUST trigger!
      expect(onSilenceTimeout).toHaveBeenCalledTimes(1);
    });

    it('triggers silence timeout when calibration receives 0 samples (native delay) and room noise is 0.40', () => {
      const onSilenceTimeout = jest.fn();
      const vad = new VoiceActivityDetector({ onSilenceTimeout });

      vad.start();
      // Native audio hardware initialization delay: 0 samples during calibration window
      jest.advanceTimersByTime(300);

      // Microphone wakes up with ambient room noise 0.40
      vad.feedMeter(0.40);

      // User recites for 2500ms at 0.75
      for (let t = 0; t < 2500; t += 100) {
        vad.feedMeter(0.75);
        jest.advanceTimersByTime(100);
      }

      // User finishes recitation. Ambient room noise remains at 0.40 for 4500ms
      for (let t = 0; t < 4500; t += 100) {
        vad.feedMeter(0.40);
        jest.advanceTimersByTime(100);
      }

      expect(onSilenceTimeout).toHaveBeenCalledTimes(1);
    });

    it('triggers silence timeout despite sustained street noise rumble (400ms at 0.50) during silence', () => {
      const onSilenceTimeout = jest.fn();
      const vad = new VoiceActivityDetector({ onSilenceTimeout });

      vad.start();
      // Calibration at 0.40
      for (let t = 0; t < 300; t += 100) {
        vad.feedMeter(0.40);
        jest.advanceTimersByTime(100);
      }

      // User recites for 2000ms at 0.72
      for (let t = 0; t < 2000; t += 100) {
        vad.feedMeter(0.72);
        jest.advanceTimersByTime(100);
      }

      // User stops speaking. Street noise rumbles at 0.50 for 400ms (4 frames), then returns to 0.40
      for (let t = 0; t < 4500; t += 100) {
        const level = (t >= 1000 && t < 1400) ? 0.50 : 0.40;
        vad.feedMeter(level);
        jest.advanceTimersByTime(100);
      }

      expect(onSilenceTimeout).toHaveBeenCalledTimes(1);
    });

    it('triggers silence timeout despite street noise rumble (400ms at 0.55) during thinking_grace', () => {
      const onSilenceTimeout = jest.fn();
      const onProgress = jest.fn();
      const vad = new VoiceActivityDetector({ onSilenceTimeout, onProgress });

      vad.start();
      // Calibrate at 0.38
      for (let t = 0; t < 300; t += 100) {
        vad.feedMeter(0.38);
        jest.advanceTimersByTime(100);
      }

      // User recites for 2000ms at 0.75
      for (let t = 0; t < 2000; t += 100) {
        vad.feedMeter(0.75);
        jest.advanceTimersByTime(100);
      }

      // User stops speaking. At t=1800ms of silence, car rumbles at 0.55 for 400ms (4 frames)
      for (let t = 0; t < 4500; t += 100) {
        const level = (t >= 1800 && t < 2200) ? 0.55 : 0.38;
        vad.feedMeter(level);
        jest.advanceTimersByTime(100);
      }

      // Silence countdown must still complete without getting reset by street rumble
      expect(onSilenceTimeout).toHaveBeenCalledTimes(1);
    });
  });
});
