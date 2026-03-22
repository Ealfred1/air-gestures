/**
 * AirScroll — Smoother
 * Applies rolling average smoothing and dead zone filtering
 * to raw signal data to produce stable, fluid scroll velocity.
 */

import type { SignalData } from '../signals/sonar';

export interface SmoothedData {
    direction: 'toward' | 'away' | null;
    velocity: number;
    active: boolean;
}

export class Smoother {
    private windowSize: number;
    private deadZone: number;
    private decayRate: number;

    private _buffer: number[] = [];
    private _smoothedVelocity = 0;
    private _lastDirection: 'toward' | 'away' | null = null;

    constructor({
        windowSize = 8,
        deadZone = 0.08,
        decayRate = 0.85,
    }: {
        windowSize?: number;
        deadZone?: number;
        decayRate?: number;
    } = {}) {
        this.windowSize = windowSize;
        this.deadZone = deadZone;
        this.decayRate = decayRate;
    }

    process({ direction, velocity }: Pick<SignalData, 'direction' | 'velocity'>): SmoothedData {
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

        this._buffer.push(velocity);
        if (this._buffer.length > this.windowSize) this._buffer.shift();

        const avg = this._buffer.reduce((a, b) => a + b, 0) / this._buffer.length;
        this._smoothedVelocity = avg;
        this._lastDirection = direction;

        return { direction, velocity: this._smoothedVelocity, active: true };
    }

    reset() {
        this._buffer = [];
        this._smoothedVelocity = 0;
        this._lastDirection = null;
    }
}
