/**
 * AirScroll — Gesture Recognizer
 * Converts smooth velocity data into confirmed scroll gestures.
 * Implements direction locking to prevent jitter mid-gesture.
 */

import type { SmoothedData } from '../processing/smoother';

export interface GestureEvent {
    direction: 'up' | 'down';
    speed: number;
    velocity: number;
    raw: { sonarDirection: string };
    timestamp: number;
}

const CONFIRM_FRAMES = 3;

export class GestureRecognizer {
    private onGesture: (g: GestureEvent) => void;
    sensitivity: number;

    private _pendingDirection: string | null = null;
    private _pendingCount = 0;
    private _lockedDirection: string | null = null;
    private _lockTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor({
        onGesture,
        sensitivity = 0.7,
    }: {
        onGesture: (g: GestureEvent) => void;
        sensitivity?: number;
    }) {
        this.onGesture = onGesture;
        this.sensitivity = sensitivity;
    }

    process({ direction, velocity, active }: SmoothedData) {
        if (!active || !direction) {
            this._unlock();
            return;
        }

        if (this._lockedDirection && direction !== this._lockedDirection) return;

        if (direction === this._pendingDirection) {
            this._pendingCount++;
        } else {
            this._pendingDirection = direction;
            this._pendingCount = 1;
        }

        if (this._pendingCount >= CONFIRM_FRAMES) {
            this._lockedDirection = direction;
            this._resetLockTimeout();

            // "toward" (finger moving toward screen) = scroll DOWN
            // "away" (finger moving away)             = scroll UP
            const scrollDirection: 'up' | 'down' = direction === 'toward' ? 'down' : 'up';
            const scrollSpeed = velocity * this.sensitivity * 40;

            this.onGesture({
                direction: scrollDirection,
                speed: scrollSpeed,
                velocity,
                raw: { sonarDirection: direction },
                timestamp: Date.now(),
            });
        }
    }

    private _unlock() {
        this._pendingDirection = null;
        this._pendingCount = 0;
    }

    private _resetLockTimeout() {
        if (this._lockTimeout) clearTimeout(this._lockTimeout);
        this._lockTimeout = setTimeout(() => {
            this._lockedDirection = null;
        }, 300);
    }

    reset() {
        this._pendingDirection = null;
        this._pendingCount = 0;
        this._lockedDirection = null;
        if (this._lockTimeout) clearTimeout(this._lockTimeout);
    }
}
