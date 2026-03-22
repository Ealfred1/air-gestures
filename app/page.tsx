'use client';

import { useRef } from 'react';
import AirScrollPanel from '@/components/AirScrollPanel';

const DEMO_PARAGRAPHS = [
  "AirScroll transforms the space between you and your screen into an interactive layer. Using ultrasonic sonar pulses emitted at 20kHz — beyond the threshold of human hearing — your device becomes a radar system, detecting the faint Doppler echoes of your moving hand.",
  "When your finger approaches the screen, it compresses the reflected sound wave, shifting the frequency upward. When it retreats, the frequency drops. An FFT (Fast Fourier Transform) analyzes this shift 60 times per second, translating subtle acoustic changes into precise scroll velocity data.",
  "The processing pipeline applies a rolling average smoother with configurable window size (default: 8 frames) and a dead zone threshold to eliminate noise. A direction lock mechanism prevents jitter — once a scroll direction is confirmed across three consecutive frames, it commits to that direction for at least 300ms.",
  "Vision mode uses MediaPipe Hands — a machine learning model trained on 30,000 hand images — to track 21 three-dimensional landmarks on your hand at 30fps. The index fingertip (landmark 8) Y-coordinate delta drives the scroll, normalized to a 0–1 velocity scale.",
  "The Scroll Injector dispatches native WheelEvents and scrollBy calls on any target DOM element. Because it speaks the language of the browser's scroll engine, it works seamlessly with every CSS overflow container, virtual list, and smooth scroll implementation on the web.",
  "The architecture is four clean layers: Signal (raw sensor data) → Processing (noise reduction + smoothing) → Gesture (direction lock + confirmation) → Injection (DOM events). Each layer is independently swappable, testable, and extensible.",
  "This is phase one — the web prototype. Phase two ports the proven logic to React Native with Android NDK for native sonar processing, and an Accessibility Service that can inject gestures into any app system-wide. Not just your app — any app.",
  "The sonar approach has a unique advantage over camera-based solutions: it works in complete darkness, requires no visual line-of-sight, and adds zero perceptible latency to the screen since it runs on a separate audio thread from the UI.",
  "Sensitivity controls the mapping between physical gesture velocity and scroll speed. At 0.1, even fast movements produce gentle scrolling. At 1.0, small, precise movements trigger full-speed scroll — ideal for rapid document navigation.",
  "Calibration takes 60 frames (~1.5 seconds) to establish a frequency baseline. This baseline represents the acoustic 'silence' of your specific environment — the ambient resonance of your room, device, and table surface. All Doppler shifts are measured relative to this baseline.",
  "The library exposes a single React hook: useAirScroll. Pass it a ref to any scrollable element, choose your mode, and start. The hook manages the full lifecycle — calibration, detection, scrolling, and cleanup on unmount. No setup, no boilerplate.",
  "Future directions: multi-gesture recognition (pinch to zoom, horizontal swipe for carousels), wrist rotation detection via gyroscope fusion, and predictive smoothing using a Kalman filter for sub-pixel accuracy at low velocities.",
  "AirScroll is designed for accessibility-first interaction. Users with motor impairments who cannot reliably tap or swipe small targets gain precise, effortless scroll control. Medical devices with touch-restricted surfaces gain a clean navigation layer.",
  "The 20kHz tone is inaudible to humans over 25 — research shows frequencies above 18kHz become imperceptible as the cochlea's high-frequency hair cells naturally attenuate with age. Dogs and cats can hear it; your coworkers cannot.",
  "Built for the next generation of ambient computing — where screens are surfaces, gestures are commands, and the air itself becomes an interface.",
];

export default function HomePage() {
  const scrollTargetRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen flex" style={{ background: '#07070f' }}>

      {/* Left Panel – Controls */}
      <div
        className="fixed left-0 top-0 h-screen w-[380px] overflow-y-auto p-6 z-10"
        style={{
          background: 'rgba(8, 8, 18, 0.95)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <AirScrollPanel scrollTargetRef={scrollTargetRef} />
      </div>

      {/* Right Panel — Scrollable content */}
      <div className="ml-[380px] flex-1 flex flex-col">

        {/* Sticky header */}
        <div
          className="sticky top-0 z-10 px-10 py-4 flex items-center justify-between"
          style={{
            background: 'rgba(7,7,15,0.85)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-sm font-semibold text-white/70 tracking-wide">Scroll Target</span>
          </div>
          <span className="text-xs text-white/25 font-mono">
            wave your hand to scroll this panel →
          </span>
        </div>

        {/* Scroll container */}
        <div
          ref={scrollTargetRef}
          className="flex-1 overflow-y-auto px-10 py-12"
          style={{ height: 'calc(100vh - 57px)' }}
        >
          {/* Hero */}
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-400/20 bg-cyan-400/5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span className="text-xs text-cyan-400 font-mono tracking-wider">AirScroll v0.1.0</span>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tight leading-tight mb-6">
              Touch-free scrolling
              <span className="block bg-linear-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                via ultrasonic sonar
              </span>
            </h1>
            <p className="text-lg text-white/40 max-w-xl leading-relaxed">
              Your phone emits a 20kHz tone. Your finger shifts its echo. The Doppler effect scrolls this page.
            </p>
          </div>

          {/* Architecture diagram */}
          <div className="mb-12 p-6 rounded-2xl border border-white/5 bg-white/2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-5">Signal Pipeline</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: 'Signal', sub: 'Sonar / Vision', color: 'border-cyan-400/40 text-cyan-300 bg-cyan-400/5' },
                { label: '→', sub: '', color: 'border-none text-white/20 bg-transparent' },
                { label: 'Processing', sub: 'FFT + Smoother', color: 'border-violet-400/40 text-violet-300 bg-violet-400/5' },
                { label: '→', sub: '', color: 'border-none text-white/20 bg-transparent' },
                { label: 'Gesture', sub: 'Recognizer', color: 'border-amber-400/40 text-amber-300 bg-amber-400/5' },
                { label: '→', sub: '', color: 'border-none text-white/20 bg-transparent' },
                { label: 'Injection', sub: 'WheelEvent', color: 'border-emerald-400/40 text-emerald-300 bg-emerald-400/5' },
              ].map((step, i) => (
                <div key={i} className={`px-4 py-2 rounded-xl border text-sm font-semibold ${step.color}`}>
                  {step.label}
                  {step.sub && <div className="text-xs font-normal opacity-60 mt-0.5">{step.sub}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Content paragraphs */}
          <div className="max-w-2xl space-y-8">
            {DEMO_PARAGRAPHS.map((para, i) => (
              <div key={i} className="group">
                <div className="flex gap-4">
                  <span className="text-xs font-mono text-white/10 w-6 pt-1 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-white/55 leading-relaxed text-[15px] group-hover:text-white/75 transition-colors duration-300">
                    {para}
                  </p>
                </div>
                {(i + 1) % 5 === 0 && (
                  <div className="mt-8 border-t border-white/5" />
                )}
              </div>
            ))}
          </div>

          {/* Bottom spacer */}
          <div className="h-32 flex items-center justify-center mt-16">
            <p className="text-white/15 text-sm font-mono">— end of demo content —</p>
          </div>
        </div>
      </div>
    </div>
  );
}
