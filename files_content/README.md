# AirScroll 🖐️

> Make any screen scrollable with mid-air gestures — no touch required.

AirScroll is a JavaScript library that uses your device's built-in sensors to detect hand gestures and translate them into real scroll events on any DOM element or app screen.

---

## How It Works

```
👆 Finger moves in air
       ↓
[Signal Layer]    — Sonar (20kHz Doppler) or Vision (MediaPipe)
       ↓
[Processing]      — FFT analysis, velocity smoothing, dead zone
       ↓
[Gesture Layer]   — Intent detection, direction locking
       ↓
[Injection]       — Native WheelEvent / ScrollBy on target element
```

---

## Detection Modes

### 🔊 Sonar (Default, Recommended)
- Speaker emits an inaudible 20kHz tone
- Microphone captures the echo
- Finger movement shifts the echo frequency (Doppler Effect)
- Works in the dark, no camera required

### 📷 Vision
- Front-facing camera + MediaPipe Hands
- Tracks index fingertip (landmark 8)
- Y-axis delta between frames drives scroll
- More spatially precise for complex gestures

---

## Installation

```bash
npm install airscroll  # (coming soon — currently in alpha)
```

Or drop the `src/` folder into your project directly.

---

## Usage

```jsx
import { useAirScroll } from './src/hooks/useAirScroll';

function MyApp() {
  const scrollRef = useRef(null);

  const { isListening, status, gesture, toggle } = useAirScroll({
    target: scrollRef,     // ref to your scrollable element
    mode: 'sonar',         // 'sonar' | 'vision' | 'auto'
    sensitivity: 0.7,      // 0.0 – 1.0
    onGesture: (g) => {
      console.log(g); // { direction: 'up'|'down', speed, velocity }
    },
  });

  return (
    <div>
      <button onClick={toggle}>
        {isListening ? 'Stop' : 'Start'} AirScroll
      </button>
      <div ref={scrollRef} style={{ overflowY: 'scroll', height: '80vh' }}>
        {/* your content */}
      </div>
    </div>
  );
}
```

---

## Architecture

```
airscroll/
├── src/
│   ├── signals/
│   │   ├── sonar.js        # Web Audio API — 20kHz Doppler detection
│   │   └── vision.js       # WebRTC + MediaPipe hand tracking
│   ├── processing/
│   │   └── smoother.js     # Rolling average + dead zone + decay
│   ├── gestures/
│   │   └── recognizer.js   # Intent detection + direction locking
│   ├── injection/
│   │   └── scroll.js       # Native WheelEvent injector
│   └── hooks/
│       └── useAirScroll.js # Public React hook API
├── demo/
│   └── index.html          # Interactive demo
└── README.md
```

---

## Roadmap

- [x] Sonar signal layer (Web Audio API + FFT)
- [x] Vision signal layer (MediaPipe Hands)
- [x] Velocity smoothing + dead zone
- [x] Gesture intent recognition
- [x] Scroll injection (WheelEvent)
- [x] `useAirScroll` React hook
- [x] Interactive demo
- [ ] React Native port (Phase 2)
- [ ] Android Accessibility Service (system-wide scroll)
- [ ] Multi-gesture support (pinch, swipe, tap)
- [ ] npm package publish

---

## Browser Requirements

- Chrome / Edge (Web Audio API + getUserMedia)
- Firefox (partial — AudioContext smoothing differs)
- Requires microphone permission for Sonar mode
- Requires camera permission for Vision mode

---

## License

MIT
