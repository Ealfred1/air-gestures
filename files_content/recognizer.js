/**
 * AirScroll — Gesture Recognizer
 * Converts smooth velocity data into confirmed scroll gestures.
 * Implements direction locking to prevent jitter mid-gesture.
 */

const CONFIRM_FRAMES = 3; // consecutive frames needed to confirm a direction

export class GestureRecognizer {
  constructor({ onGesture, sensitivity = 0.7 } = {}) {
    this.onGesture = onGesture;
    this.sensitivity = sensitivity; // 0.0–1.0, affects scroll speed multiplier

    this._pendingDirection = null;
    this._pendingCount = 0;
    this._lockedDirection = null;
    this._lockTimeout = null;
  }

  process({ direction, velocity, active }) {
    if (!active || !direction) {
      this._unlock();
      return;
    }

    // Direction lock: once scrolling in one direction, commit to it
    if (this._lockedDirection && direction !== this._lockedDirection) {
      return; // ignore flips until lock released
    }

    // Confirmation: require N consecutive frames of same direction
    if (direction === this._pendingDirection) {
      this._pendingCount++;
    } else {
      this._pendingDirection = direction;
      this._pendingCount = 1;
    }

    if (this._pendingCount >= CONFIRM_FRAMES) {
      this._lockedDirection = direction;
      this._resetLockTimeout();

      // Map sonar direction to scroll direction
      // "toward" (finger moving toward screen) = scroll DOWN
      // "away" (finger moving away from screen) = scroll UP
      const scrollDirection = direction === "toward" ? "down" : "up";
      const scrollSpeed = velocity * this.sensitivity * 40; // px per frame

      this.onGesture?.({
        direction: scrollDirection,
        speed: scrollSpeed,
        velocity,
        raw: { sonarDirection: direction },
      });
    }
  }

  _unlock() {
    this._pendingDirection = null;
    this._pendingCount = 0;
    // Keep direction lock for a short grace period (prevents stuttering)
  }

  _resetLockTimeout() {
    if (this._lockTimeout) clearTimeout(this._lockTimeout);
    this._lockTimeout = setTimeout(() => {
      this._lockedDirection = null;
    }, 300); // 300ms of inactivity unlocks direction
  }

  reset() {
    this._pendingDirection = null;
    this._pendingCount = 0;
    this._lockedDirection = null;
    if (this._lockTimeout) clearTimeout(this._lockTimeout);
  }
}
