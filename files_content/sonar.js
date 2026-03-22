/**
 * AirScroll — Sonar Signal Layer
 * Emits an inaudible 20kHz tone via speaker, listens for Doppler-shifted echoes
 * via microphone to detect finger movement direction and velocity.
 */

const EMIT_FREQUENCY = 20000; // 20kHz — above human hearing
const FFT_SIZE = 4096;        // High resolution for subtle frequency shifts
const SAMPLE_RATE = 48000;
const DOPPLER_WINDOW = 200;   // Hz range to monitor around emitted frequency

export class SonarSignal {
  constructor({ onData, emitFrequency = EMIT_FREQUENCY } = {}) {
    this.onData = onData;
    this.emitFrequency = emitFrequency;

    this.audioCtx = null;
    this.oscillator = null;
    this.analyser = null;
    this.micStream = null;
    this.gainNode = null;

    this.isRunning = false;
    this.animFrameId = null;

    this._baselineBuffer = [];
    this._baselineReady = false;
    this._baselineSamples = 60; // frames to capture for baseline
  }

  async start() {
    if (this.isRunning) return;

    try {
      // Request microphone access
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false, // CRITICAL: must be off for sonar
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: SAMPLE_RATE,
        },
      });
    } catch (err) {
      throw new Error(`AirScroll: Microphone access denied — ${err.message}`);
    }

    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: SAMPLE_RATE,
    });

    // === EMITTER: Speaker tone ===
    this.oscillator = this.audioCtx.createOscillator();
    this.oscillator.type = "sine";
    this.oscillator.frequency.setValueAtTime(
      this.emitFrequency,
      this.audioCtx.currentTime
    );

    // Low gain — just enough to create a reflectable echo
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.setValueAtTime(0.08, this.audioCtx.currentTime);

    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);
    this.oscillator.start();

    // === RECEIVER: Microphone analyser ===
    const micSource = this.audioCtx.createMediaStreamSource(this.micStream);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.6;
    micSource.connect(this.analyser);

    this.isRunning = true;
    this._captureBaseline();
  }

  _captureBaseline() {
    const freqData = new Float32Array(this.analyser.frequencyBinCount);
    let frames = 0;
    const baselineSums = new Float32Array(this.analyser.frequencyBinCount);

    const capture = () => {
      if (!this.isRunning) return;
      this.analyser.getFloatFrequencyData(freqData);

      for (let i = 0; i < freqData.length; i++) {
        baselineSums[i] += freqData[i];
      }
      frames++;

      if (frames < this._baselineSamples) {
        requestAnimationFrame(capture);
      } else {
        // Average baseline
        this._baseline = baselineSums.map((v) => v / frames);
        this._baselineReady = true;
        this._loop();
      }
    };

    requestAnimationFrame(capture);
  }

  _freqToBin(freq) {
    const nyquist = this.audioCtx.sampleRate / 2;
    return Math.round((freq / nyquist) * this.analyser.frequencyBinCount);
  }

  _loop() {
    if (!this.isRunning || !this._baselineReady) return;

    const freqData = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(freqData);

    const centerBin = this._freqToBin(this.emitFrequency);
    const windowBins = this._freqToBin(DOPPLER_WINDOW);

    const lowerStart = centerBin - windowBins;
    const lowerEnd = centerBin - 2;
    const upperStart = centerBin + 2;
    const upperEnd = centerBin + windowBins;

    // Energy below center = finger moving AWAY (frequency drops)
    // Energy above center = finger moving TOWARD (frequency rises)
    let lowerEnergy = 0;
    let upperEnergy = 0;

    for (let i = lowerStart; i <= lowerEnd; i++) {
      const delta = freqData[i] - this._baseline[i];
      if (delta > 0) lowerEnergy += delta;
    }

    for (let i = upperStart; i <= upperEnd; i++) {
      const delta = freqData[i] - this._baseline[i];
      if (delta > 0) upperEnergy += delta;
    }

    const totalEnergy = lowerEnergy + upperEnergy;
    const MIN_ENERGY = 2.0; // noise floor threshold

    if (totalEnergy > MIN_ENERGY) {
      const direction = upperEnergy > lowerEnergy ? "toward" : "away";
      const dominantEnergy = Math.max(upperEnergy, lowerEnergy);
      const velocity = Math.min(dominantEnergy / 30, 1.0); // normalize 0–1

      this.onData?.({ direction, velocity, raw: { lowerEnergy, upperEnergy } });
    } else {
      this.onData?.({ direction: null, velocity: 0, raw: { lowerEnergy, upperEnergy } });
    }

    this.animFrameId = requestAnimationFrame(() => this._loop());
  }

  stop() {
    this.isRunning = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.oscillator) { try { this.oscillator.stop(); } catch (_) {} }
    if (this.audioCtx) this.audioCtx.close();
    if (this.micStream) this.micStream.getTracks().forEach((t) => t.stop());

    this.oscillator = null;
    this.audioCtx = null;
    this.analyser = null;
    this.micStream = null;
    this._baselineReady = false;
  }
}
