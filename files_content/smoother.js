/**
 * AirScroll — Smoother
 * Applies rolling average smoothing and dead zone filtering
 * to raw signal data to produce stable, fluid scroll velocity.
 */

export class Smoother {
  constructor({
    windowSize = 8,
    deadZone = 0.08,
    decayRate = 0.85,
  } = {}) {
    this.windowSize = windowSize;
    this.deadZone = deadZone;
    this.decayRate = decayRate;

    this._buffer = [];         // rolling window of recent velocities
    this._smoothedVelocity = 0;
    this._lastDirection = null;
  }

  process({ direction, velocity }) {
    // If no signal, decay the velocity toward zero
    if (!direction || velocity < this.deadZone) {
      this._smoothedVelocity *= this.decayRate;
      if (this._smoothedVelocity < 0.01) {
        this._smoothedVelocity = 0;
        this._lastDirection = null;
      }
      return {
        direction: this._lastDirection,
        velocity: this._smoothedVelocity,
        active: this._smoothedVelocity > 0.01,
      };
    }

    // Add to rolling buffer
    this._buffer.push(velocity);
    if (this._buffer.length > this.windowSize) {
      this._buffer.shift();
    }

    // Rolling average
    const avg = this._buffer.reduce((a, b) => a + b, 0) / this._buffer.length;
    this._smoothedVelocity = avg;
    this._lastDirection = direction;

    return {
      direction,
      velocity: this._smoothedVelocity,
      active: true,
    };
  }

  reset() {
    this._buffer = [];
    this._smoothedVelocity = 0;
    this._lastDirection = null;
  }
}
