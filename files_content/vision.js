/**
 * AirScroll — Vision Signal Layer
 * Uses the front-facing camera + MediaPipe Hands to track index fingertip (landmark 8).
 * Calculates Y-axis delta between frames to determine scroll direction and velocity.
 */

const MEDIAPIPE_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js";
const CAMERA_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";

export class VisionSignal {
  constructor({ onData } = {}) {
    this.onData = onData;
    this.isRunning = false;
    this.hands = null;
    this.camera = null;
    this._lastY = null;
    this._videoEl = null;
  }

  async start() {
    if (this.isRunning) return;

    await this._loadScripts();

    this._videoEl = document.createElement("video");
    this._videoEl.style.display = "none";
    document.body.appendChild(this._videoEl);

    // eslint-disable-next-line no-undef
    this.hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,       // Fast — we only need 1 hand
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    this.hands.onResults((results) => this._onResults(results));

    // eslint-disable-next-line no-undef
    this.camera = new Camera(this._videoEl, {
      onFrame: async () => {
        if (this.isRunning) {
          await this.hands.send({ image: this._videoEl });
        }
      },
      width: 320,   // Low res — we just need landmark positions
      height: 240,
      facingMode: "user",
    });

    await this.camera.start();
    this.isRunning = true;
  }

  _onResults(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this._lastY = null;
      this.onData?.({ direction: null, velocity: 0 });
      return;
    }

    // Landmark 8 = index fingertip
    const landmarks = results.multiHandLandmarks[0];
    const indexTip = landmarks[8];
    const currentY = indexTip.y; // 0.0 (top) to 1.0 (bottom) normalized

    if (this._lastY === null) {
      this._lastY = currentY;
      return;
    }

    const delta = currentY - this._lastY; // positive = moving down, negative = moving up
    this._lastY = currentY;

    const MIN_DELTA = 0.004; // noise threshold
    const absDelta = Math.abs(delta);

    if (absDelta < MIN_DELTA) {
      this.onData?.({ direction: null, velocity: 0 });
      return;
    }

    // In camera space: finger moving DOWN = "toward" screen (scroll down)
    const direction = delta > 0 ? "toward" : "away";
    const velocity = Math.min(absDelta / 0.05, 1.0); // normalize 0–1

    this.onData?.({ direction, velocity, raw: { delta, currentY } });
  }

  async _loadScripts() {
    const load = (src) =>
      new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const s = document.createElement("script");
        s.src = src;
        s.crossOrigin = "anonymous";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });

    await load(MEDIAPIPE_CDN);
    await load(CAMERA_CDN);
  }

  stop() {
    this.isRunning = false;
    this.camera?.stop();
    this._videoEl?.remove();
    this._lastY = null;
  }
}
