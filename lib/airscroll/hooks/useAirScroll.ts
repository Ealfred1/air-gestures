'use client';

/**
 * AirScroll — useAirScroll Hook
 * The single public-facing API for the entire library.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { SonarSignal } from '../signals/sonar';
import { VisionSignal } from '../signals/vision';
import { Smoother } from '../processing/smoother';
import { GestureRecognizer, type GestureEvent } from '../gestures/recognizer';
import { ScrollInjector } from '../injection/scroll';
import type { RefObject } from 'react';
import type { SignalData } from '../signals/sonar';

export type AirScrollMode = 'sonar' | 'vision' | 'auto';
export type AirScrollStatus = 'idle' | 'calibrating' | 'listening' | 'error';

export interface UseAirScrollOptions {
    target?: RefObject<HTMLElement | null> | null;
    mode?: AirScrollMode;
    sensitivity?: number;
    onGesture?: (g: GestureEvent) => void;
    deadZone?: number;
    smoothingWindow?: number;
}

export interface UseAirScrollReturn {
    isListening: boolean;
    status: AirScrollStatus;
    gesture: GestureEvent | null;
    mode: AirScrollMode;
    sonarAnalyser: AnalyserNode | null;
    start: () => Promise<void>;
    stop: () => void;
    toggle: () => void;
}

export function useAirScroll({
    target = null,
    mode = 'sonar',
    sensitivity = 0.7,
    onGesture = undefined,
    deadZone = 0.08,
    smoothingWindow = 8,
}: UseAirScrollOptions = {}): UseAirScrollReturn {
    const [isListening, setIsListening] = useState(false);
    const [status, setStatus] = useState<AirScrollStatus>('idle');
    const [gesture, setGesture] = useState<GestureEvent | null>(null);
    const [activeMode, setActiveMode] = useState<AirScrollMode>(mode);
    const [sonarAnalyser, setSonarAnalyser] = useState<AnalyserNode | null>(null);

    const signalRef = useRef<SonarSignal | VisionSignal | null>(null);
    const smootherRef = useRef<Smoother | null>(null);
    const recognizerRef = useRef<GestureRecognizer | null>(null);
    const injectorRef = useRef<ScrollInjector | null>(null);
    const onGestureRef = useRef(onGesture);
    useEffect(() => { onGestureRef.current = onGesture; }, [onGesture]);

    const handleGesture = useCallback((g: GestureEvent) => {
        setGesture(g);
        onGestureRef.current?.(g);
        injectorRef.current?.inject(g);
    }, []);

    const start = useCallback(async () => {
        if (isListening) return;

        try {
            setStatus('calibrating');

            const resolvedMode: AirScrollMode = mode === 'auto' ? 'sonar' : mode;
            setActiveMode(resolvedMode);

            smootherRef.current = new Smoother({ windowSize: smoothingWindow, deadZone });
            recognizerRef.current = new GestureRecognizer({ sensitivity, onGesture: handleGesture });
            injectorRef.current = new ScrollInjector({ target: target ?? undefined });

            const onSignalData = (raw: SignalData) => {
                const smoothed = smootherRef.current!.process(raw);
                recognizerRef.current!.process(smoothed);
            };

            if (resolvedMode === 'sonar') {
                const sonar = new SonarSignal({ onData: onSignalData });
                signalRef.current = sonar;
                await sonar.start();
                setSonarAnalyser(sonar.analyser);
            } else {
                signalRef.current = new VisionSignal({ onData: onSignalData });
                await signalRef.current.start();
                setSonarAnalyser(null);
            }

            setIsListening(true);
            setTimeout(() => setStatus('listening'), 1500);
        } catch (err) {
            setStatus('error');
            console.error('AirScroll error:', err);
        }
    }, [isListening, mode, sensitivity, target, deadZone, smoothingWindow, handleGesture]);

    const stop = useCallback(() => {
        signalRef.current?.stop();
        injectorRef.current?.stop();
        smootherRef.current?.reset();
        recognizerRef.current?.reset();
        signalRef.current = null;
        setSonarAnalyser(null);
        setIsListening(false);
        setStatus('idle');
        setGesture(null);
    }, []);

    const toggle = useCallback(() => {
        if (isListening) stop();
        else start();
    }, [isListening, start, stop]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            signalRef.current?.stop();
            injectorRef.current?.stop();
        };
    }, []);

    // Sync target when ref changes
    useEffect(() => {
        if (injectorRef.current && target) {
            injectorRef.current.setTarget(target);
        }
    }, [target]);

    return { isListening, status, gesture, mode: activeMode, sonarAnalyser, start, stop, toggle };
}
