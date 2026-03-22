/**
 * AirScroll — useAirScroll Hook
 * The single public-facing API for the entire library.
 *
 * Usage:
 *   const { isListening, mode, status, gesture } = useAirScroll({
 *     target: myScrollRef,
 *     mode: "sonar",       // "sonar" | "vision" | "auto"
 *     sensitivity: 0.7,
 *     onGesture: (g) => console.log(g),
 *   });
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { SonarSignal } from "../signals/sonar.js";
import { VisionSignal } from "../signals/vision.js";
import { Smoother } from "../processing/smoother.js";
import { GestureRecognizer } from "../gestures/recognizer.js";
import { ScrollInjector } from "../injection/scroll.js";

export function useAirScroll({
  target = null,
  mode = "sonar",
  sensitivity = 0.7,
  onGesture = null,
  deadZone = 0.08,
  smoothingWindow = 8,
} = {}) {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | calibrating | listening | error
  const [gesture, setGesture] = useState(null);
  const [activeMode, setActiveMode] = useState(mode);

  const signalRef = useRef(null);
  const smootherRef = useRef(null);
  const recognizerRef = useRef(null);
  const injectorRef = useRef(null);

  const handleGesture = useCallback(
    (g) => {
      setGesture(g);
      onGesture?.(g);
      injectorRef.current?.inject(g);
    },
    [onGesture]
  );

  const start = useCallback(async () => {
    if (isListening) return;

    try {
      setStatus("calibrating");

      // Determine which signal source to use
      let resolvedMode = mode;
      if (mode === "auto") {
        resolvedMode = "sonar"; // sonar preferred, vision as fallback
      }
      setActiveMode(resolvedMode);

      // Build the pipeline
      smootherRef.current = new Smoother({
        windowSize: smoothingWindow,
        deadZone,
      });

      recognizerRef.current = new GestureRecognizer({
        sensitivity,
        onGesture: handleGesture,
      });

      injectorRef.current = new ScrollInjector({ target });

      const onSignalData = (raw) => {
        const smoothed = smootherRef.current.process(raw);
        recognizerRef.current.process(smoothed);
      };

      if (resolvedMode === "sonar") {
        signalRef.current = new SonarSignal({ onData: onSignalData });
      } else {
        signalRef.current = new VisionSignal({ onData: onSignalData });
      }

      await signalRef.current.start();

      setIsListening(true);
      // Sonar needs ~1.5s to calibrate baseline before it's reliable
      setTimeout(() => setStatus("listening"), 1500);
    } catch (err) {
      setStatus("error");
      console.error("AirScroll error:", err);

      // Auto-fallback: if sonar fails, try vision
      if (mode === "auto" && activeMode === "sonar") {
        setActiveMode("vision");
        // retry with vision...
      }
    }
  }, [isListening, mode, sensitivity, target, deadZone, smoothingWindow, handleGesture, activeMode]);

  const stop = useCallback(() => {
    signalRef.current?.stop();
    injectorRef.current?.stop();
    smootherRef.current?.reset();
    recognizerRef.current?.reset();

    signalRef.current = null;
    setIsListening(false);
    setStatus("idle");
    setGesture(null);
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      signalRef.current?.stop();
      injectorRef.current?.stop();
    };
  }, []);

  // Update injector target when ref changes
  useEffect(() => {
    if (injectorRef.current && target) {
      injectorRef.current.setTarget(target);
    }
  }, [target]);

  return {
    isListening,
    status,           // "idle" | "calibrating" | "listening" | "error"
    gesture,          // latest gesture object { direction, speed, velocity }
    mode: activeMode, // which mode is actually running
    start,
    stop,
    toggle,
  };
}
