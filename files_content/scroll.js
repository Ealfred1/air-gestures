/**
 * AirScroll — Scroll Injector
 * Injects native WheelEvents into a target DOM element.
 * Uses requestAnimationFrame for smooth, frame-synced scrolling.
 */

export class ScrollInjector {
  constructor({ target } = {}) {
    this.target = target || document.documentElement;
    this._frameId = null;
    this._pendingScroll = { direction: null, speed: 0 };
    this._isScrolling = false;
  }

  setTarget(el) {
    this.target = el;
  }

  inject({ direction, speed }) {
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

  _loop() {
    if (!this._isScrolling) return;

    const { direction, speed } = this._pendingScroll;

    if (direction && speed > 0.5) {
      const deltaY = direction === "down" ? speed : -speed;

      // Dispatch a native WheelEvent — works on any scrollable element
      const event = new WheelEvent("wheel", {
        deltaY,
        deltaMode: 0,         // pixel mode
        bubbles: true,
        cancelable: true,
      });

      const el = this._resolveTarget();
      el?.dispatchEvent(event);

      // Also directly scroll as fallback
      el?.scrollBy({ top: deltaY, behavior: "auto" });
    }

    this._frameId = requestAnimationFrame(() => this._loop());
  }

  _resolveTarget() {
    if (!this.target) return document.documentElement;
    if (typeof this.target === "function") return this.target();
    if (this.target.current) return this.target.current; // React ref
    return this.target;
  }
}
