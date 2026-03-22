/**
 * AirScroll — Scroll Injector
 * Injects native WheelEvents into a target DOM element.
 * Uses requestAnimationFrame for smooth, frame-synced scrolling.
 */

import type { GestureEvent } from '../gestures/recognizer';
import type { RefObject } from 'react';

type ScrollTarget = RefObject<HTMLElement | null> | HTMLElement | null;

export class ScrollInjector {
    private target: ScrollTarget;
    private _frameId: number | null = null;
    private _pendingScroll: { direction: 'up' | 'down' | null; speed: number } = {
        direction: null,
        speed: 0,
    };
    private _isScrolling = false;

    constructor({ target }: { target?: ScrollTarget } = {}) {
        this.target = target ?? null;
    }

    setTarget(el: ScrollTarget) {
        this.target = el;
    }

    inject({ direction, speed }: Pick<GestureEvent, 'direction' | 'speed'>) {
        this._pendingScroll = { direction, speed };
        if (!this._isScrolling) {
            this._isScrolling = true;
            this._loop();
        }
    }

    stop() {
        this._isScrolling = false;
        this._pendingScroll = { direction: null, speed: 0 };
        if (this._frameId) cancelAnimationFrame(this._frameId);
    }

    private _loop() {
        if (!this._isScrolling) return;

        const { direction, speed } = this._pendingScroll;

        if (direction && speed > 0.5) {
            const deltaY = direction === 'down' ? speed : -speed;

            const event = new WheelEvent('wheel', {
                deltaY,
                deltaMode: 0,
                bubbles: true,
                cancelable: true,
            });

            const el = this._resolveTarget();
            el?.dispatchEvent(event);
            el?.scrollBy({ top: deltaY, behavior: 'auto' });
        }

        this._frameId = requestAnimationFrame(() => this._loop());
    }

    private _resolveTarget(): HTMLElement | null {
        if (typeof window === 'undefined') return null;
        if (!this.target) return document.documentElement;
        if ('current' in this.target) return this.target.current;
        return this.target;
    }
}
