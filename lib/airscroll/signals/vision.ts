/**
 * AirScroll — Vision Signal Layer
 * Uses the front-facing camera + MediaPipe Hands to track index fingertip (landmark 8).
 * Calculates Y-axis delta between frames to determine scroll direction and velocity.
 */

import type { SignalData } from './sonar';

const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
const CAMERA_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';

export class VisionSignal {
    private onData: (data: SignalData) => void;
    isRunning = false;
    private hands: unknown = null;
    private camera: unknown = null;
    private _lastY: number | null = null;
    private _videoEl: HTMLVideoElement | null = null;

    constructor({ onData }: { onData: (data: SignalData) => void }) {
        this.onData = onData;
    }

    async start() {
        if (this.isRunning) return;

        await this._loadScripts();

        this._videoEl = document.createElement('video');
        this._videoEl.style.display = 'none';
        document.body.appendChild(this._videoEl);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Hands = (window as any).Hands;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Camera = (window as any).Camera;

        this.hands = new Hands({
            locateFile: (file: string) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.hands as any).setOptions({
            maxNumHands: 1,
            modelComplexity: 0,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.hands as any).onResults((results: any) => this._onResults(results));

        this.camera = new Camera(this._videoEl, {
            onFrame: async () => {
                if (this.isRunning) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await (this.hands as any).send({ image: this._videoEl });
                }
            },
            width: 320,
            height: 240,
            facingMode: 'user',
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.camera as any).start();
        this.isRunning = true;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _onResults(results: any) {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            this._lastY = null;
            this.onData({ direction: null, velocity: 0 });
            return;
        }

        const landmarks = results.multiHandLandmarks[0];
        const indexTip = landmarks[8];
        const currentY: number = indexTip.y;

        if (this._lastY === null) {
            this._lastY = currentY;
            return;
        }

        const delta = currentY - this._lastY;
        this._lastY = currentY;

        const MIN_DELTA = 0.004;
        const absDelta = Math.abs(delta);

        if (absDelta < MIN_DELTA) {
            this.onData({ direction: null, velocity: 0 });
            return;
        }

        const direction = delta > 0 ? 'toward' : 'away';
        const velocity = Math.min(absDelta / 0.05, 1.0);

        this.onData({ direction, velocity, raw: { lowerEnergy: 0, upperEnergy: 0 } });
    }

    private async _loadScripts() {
        const load = (src: string) =>
            new Promise<void>((resolve, reject) => {
                if (document.querySelector(`script[src="${src}"]`)) {
                    resolve();
                    return;
                }
                const s = document.createElement('script');
                s.src = src;
                s.crossOrigin = 'anonymous';
                s.onload = () => resolve();
                s.onerror = reject;
                document.head.appendChild(s);
            });

        await load(MEDIAPIPE_CDN);
        await load(CAMERA_CDN);
    }

    stop() {
        this.isRunning = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.camera as any)?.stop();
        this._videoEl?.remove();
        this._lastY = null;
    }
}
