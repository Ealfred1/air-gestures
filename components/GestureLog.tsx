'use client';

import { useEffect, useRef, useState, type FC } from 'react';
import type { GestureEvent } from '@/lib/airscroll';

interface GestureLogProps {
    gesture: GestureEvent | null;
}

const MAX_ENTRIES = 12;

const GestureLog: FC<GestureLogProps> = ({ gesture }) => {
    const [entries, setEntries] = useState<GestureEvent[]>([]);
    const prevGestureRef = useRef<GestureEvent | null>(null);

    useEffect(() => {
        // Guard: only add if it's genuinely a new gesture (by timestamp)
        if (!gesture) return;
        if (prevGestureRef.current?.timestamp === gesture.timestamp) return;
        prevGestureRef.current = gesture;
        setEntries((prev) => [gesture, ...prev].slice(0, MAX_ENTRIES));
    }, [gesture]);

    return (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">Gesture Log</h3>
                <span className="text-xs text-white/20 font-mono">last {MAX_ENTRIES}</span>
            </div>

            {entries.length === 0 ? (
                <p className="text-center text-white/20 text-xs mt-8 mb-8 font-mono">
                    No gestures yet — start listening
                </p>
            ) : (
                <div className="space-y-0.5">
                    {entries.map((g, i) => {
                        const opacity = 1 - i * 0.06;
                        const isDown = g.direction === 'down';
                        const icon = isDown ? '↓' : '↑';
                        const dirColor = isDown ? 'text-cyan-400' : 'text-violet-400';
                        const time = new Date(g.timestamp).toLocaleTimeString('en', { hour12: false });

                        return (
                            <div
                                key={g.timestamp}
                                style={{ opacity }}
                                className="flex items-center gap-2.5 py-1.5 border-b border-white/[0.03]"
                            >
                                <span className={`text-sm w-4 shrink-0 ${dirColor}`}>{icon}</span>
                                <span className="flex-1 text-xs font-mono text-white/60">
                                    <span className={`font-semibold ${dirColor}`}>{g.direction.toUpperCase()}</span>
                                    <span className="text-white/30 mx-1">·</span>
                                    spd: <span className="text-amber-400">{g.speed.toFixed(1)}</span>
                                    <span className="text-white/30 mx-1">·</span>
                                    vel: <span className="text-emerald-400">{g.velocity.toFixed(3)}</span>
                                </span>
                                <span className="text-xs font-mono text-white/25 shrink-0">{time}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default GestureLog;
