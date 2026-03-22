/**
 * AirScroll — Sonar Signal Layer
 * Emits an inaudible 20kHz tone via speaker, listens for Doppler-shifted echoes
 * via microphone to detect finger movement direction and velocity.
 */

const EMIT_FREQUENCY = 20000; // 20kHz — above human hearing
const FFT_SIZE = 4096;        // High resolution for subtle frequency shifts
const SAMPLE_RATE = 48000;
const DOPPLER_WINDOW = 200;   // Hz range to monitor around emitted frequency

export interface SignalData {
    direction: 'toward' | 'away' | null;
    velocity: number;
    raw?: { lowerEnergy: number; upperEnergy: number };
}

export class SonarSignal {
    private onData: (data: SignalData) => void;
    private emitFrequency: number;

    private audioCtx: AudioContext | null = null;
    private oscillator: OscillatorNode | null = null;
    analyser: AnalyserNode | null = null; // public for FrequencyVisualizer
    private micStream: MediaStream | null = null;
    private gainNode: GainNode | null = null;

    isRunning = false;
    private animFrameId: number | null = null;

    private _baselineReady = false;
    private _baseline: Float32Array | null = null;
    private _baselineSamples = 60;

    constructor({ onData, emitFrequency = EMIT_FREQUENCY }: {
        onData: (data: SignalData) => void;
        emitFrequency?: number;
    }) {
        this.onData = onData;
        this.emitFrequency = emitFrequency;
    }

    async start() {
        if (this.isRunning) return;

        try {
            this.micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false, // CRITICAL: must be off for sonar
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: SAMPLE_RATE,
                } as MediaTrackConstraints,
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(`AirScroll: Microphone access denied — ${msg}`);
        }

        this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
            sampleRate: SAMPLE_RATE,
        });

        // === EMITTER: Speaker tone ===
        this.oscillator = this.audioCtx.createOscillator();
        this.oscillator.type = 'sine';
        this.oscillator.frequency.setValueAtTime(this.emitFrequency, this.audioCtx.currentTime);

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

    private _captureBaseline() {
        if (!this.analyser) return;
        const freqData = new Float32Array(this.analyser.frequencyBinCount);
        const baselineSums = new Float32Array(this.analyser.frequencyBinCount);
        let frames = 0;

        const capture = () => {
            if (!this.isRunning || !this.analyser) return;
            this.analyser.getFloatFrequencyData(freqData);
            for (let i = 0; i < freqData.length; i++) baselineSums[i] += freqData[i];
            frames++;

            if (frames < this._baselineSamples) {
                requestAnimationFrame(capture);
            } else {
                this._baseline = baselineSums.map((v) => v / frames);
                this._baselineReady = true;
                this._loop();
            }
        };

        requestAnimationFrame(capture);
    }

    private _freqToBin(freq: number): number {
        if (!this.analyser || !this.audioCtx) return 0;
        const nyquist = this.audioCtx.sampleRate / 2;
        return Math.round((freq / nyquist) * this.analyser.frequencyBinCount);
    }

    private _loop() {
        if (!this.isRunning || !this._baselineReady || !this.analyser || !this._baseline) return;

        const freqData = new Float32Array(this.analyser.frequencyBinCount);
        this.analyser.getFloatFrequencyData(freqData);

        const centerBin = this._freqToBin(this.emitFrequency);
        const windowBins = this._freqToBin(DOPPLER_WINDOW);

        const lowerStart = centerBin - windowBins;
        const lowerEnd = centerBin - 2;
        const upperStart = centerBin + 2;
        const upperEnd = centerBin + windowBins;

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
        const MIN_ENERGY = 2.0;

        if (totalEnergy > MIN_ENERGY) {
            const direction = upperEnergy > lowerEnergy ? 'toward' : 'away';
            const dominantEnergy = Math.max(upperEnergy, lowerEnergy);
            const velocity = Math.min(dominantEnergy / 30, 1.0);
            this.onData({ direction, velocity, raw: { lowerEnergy, upperEnergy } });
        } else {
            this.onData({ direction: null, velocity: 0, raw: { lowerEnergy, upperEnergy } });
        }

        this.animFrameId = requestAnimationFrame(() => this._loop());
    }

    stop() {
        this.isRunning = false;
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        if (this.oscillator) { try { this.oscillator.stop(); } catch (_) { } }
        if (this.audioCtx) this.audioCtx.close();
        if (this.micStream) this.micStream.getTracks().forEach((t) => t.stop());

        this.oscillator = null;
        this.audioCtx = null;
        this.analyser = null;
        this.micStream = null;
        this._baselineReady = false;
        this._baseline = null;
    }
}
