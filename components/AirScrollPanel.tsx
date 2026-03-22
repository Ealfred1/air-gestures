'use client';

import { useState, type FC } from 'react';
import { useAirScroll, type AirScrollMode } from '@/lib/airscroll';
import FrequencyVisualizer from './FrequencyVisualizer';
import GestureLog from './GestureLog';

const MODES: { value: AirScrollMode; label: string; icon: string; desc: string }[] = [
    { value: 'sonar', label: 'Sonar', icon: '📡', desc: '20kHz ultrasonic echo — works in the dark' },
    { value: 'vision', label: 'Vision', icon: '👁️', desc: 'MediaPipe hand tracking via camera' },
    { value: 'auto', label: 'Auto', icon: '⚡', desc: 'Sonar preferred, vision as fallback' },
];

const STATUS_CONFIG = {
    idle: { color: 'bg-white/20', text: 'text-white/50', label: 'Idle', dot: 'bg-white/30' },
    calibrating: { color: 'bg-amber-500/20', text: 'text-amber-400', label: 'Calibrating…', dot: 'bg-amber-400 animate-pulse' },
    listening: { color: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Listening', dot: 'bg-emerald-400 animate-pulse' },
    error: { color: 'bg-red-500/20', text: 'text-red-400', label: 'Error', dot: 'bg-red-400' },
};

interface AirScrollPanelProps {
    scrollTargetRef: React.RefObject<HTMLDivElement | null>;
}

const AirScrollPanel: FC<AirScrollPanelProps> = ({ scrollTargetRef }) => {
    const [selectedMode, setSelectedMode] = useState<AirScrollMode>('sonar');
    const [sensitivity, setSensitivity] = useState(0.7);

    const { isListening, status, mode, sonarAnalyser, start, stop, gesture } = useAirScroll({
        target: scrollTargetRef,
        mode: selectedMode,
        sensitivity,
    });

    const statusCfg = STATUS_CONFIG[status];

    return (
        <div className="flex flex-col gap-5 h-full">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">AirScroll</h2>
                    <p className="text-xs text-white/40 mt-0.5">Scroll anything — touch-free</p>
                </div>
                {/* Status Badge */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusCfg.color}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                    <span className={`text-xs font-medium ${statusCfg.text}`}>{statusCfg.label}</span>
                </div>
            </div>

            {/* Mode Selector */}
            <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-2 block">Mode</label>
                <div className="grid grid-cols-3 gap-2">
                    {MODES.map((m) => (
                        <button
                            key={m.value}
                            onClick={() => !isListening && setSelectedMode(m.value)}
                            disabled={isListening}
                            title={m.desc}
                            className={`
                relative flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium
                transition-all duration-200
                ${selectedMode === m.value
                                    ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-300 shadow-[0_0_20px_rgba(0,229,255,0.15)]'
                                    : 'border-white/8 bg-white/3 text-white/40 hover:text-white/60 hover:border-white/15'
                                }
                ${isListening ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
                        >
                            <span className="text-base">{m.icon}</span>
                            <span>{m.label}</span>
                            {selectedMode === m.value && (
                                <span className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-cyan-400" />
                            )}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-white/25 mt-2 text-center">
                    {MODES.find(m => m.value === selectedMode)?.desc}
                </p>
            </div>

            {/* Sensitivity Slider */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-white/40">Sensitivity</label>
                    <span className="text-xs font-mono text-cyan-400">{sensitivity.toFixed(1)}</span>
                </div>
                <input
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    value={sensitivity}
                    onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-cyan-400"
                    style={{
                        background: `linear-gradient(to right, #00e5ff ${sensitivity * 100}%, rgba(255,255,255,0.1) ${sensitivity * 100}%)`
                    }}
                />
            </div>

            {/* Start / Stop Button */}
            <button
                onClick={isListening ? stop : start}
                className={`
          w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all duration-300
          ${isListening
                        ? 'bg-red-500/20 border border-red-400/40 text-red-300 hover:bg-red-500/30 hover:shadow-[0_0_25px_rgba(248,113,113,0.2)]'
                        : 'bg-cyan-400/15 border border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/25 hover:shadow-[0_0_30px_rgba(0,229,255,0.25)]'
                    }
          active:scale-[0.98]
        `}
            >
                {isListening ? '⏹ Stop Listening' : '🎙 Start Listening'}
            </button>

            {/* Active mode indicator */}
            {isListening && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/3 border border-white/5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs text-white/50 font-mono">
                        Active: <span className="text-emerald-400 font-semibold">{mode}</span> mode
                        {status === 'calibrating' && <span className="text-amber-400 ml-2">— calibrating baseline (~1.5s)</span>}
                    </span>
                </div>
            )}

            {/* Frequency Visualizer */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-widest text-white/40">Doppler Visualizer</label>
                    <span className="text-xs text-white/20 font-mono">18–22kHz window</span>
                </div>
                <FrequencyVisualizer analyser={sonarAnalyser} isActive={isListening && mode === 'sonar'} />
            </div>

            {/* Gesture Log */}
            <GestureLog gesture={gesture} />

            {/* Tip */}
            <div className="mt-auto px-3 py-2.5 rounded-lg bg-cyan-950/30 border border-cyan-900/20">
                <p className="text-xs text-cyan-400/60 leading-relaxed">
                    <span className="text-cyan-400 font-semibold">💡 Tip:</span>{' '}
                    {mode === 'sonar' || mode === 'auto'
                        ? 'Slowly move your hand toward or away from the screen. The 20kHz tone calibrates first — wait for "Listening" status.'
                        : 'Hold your index finger up in front of the camera. Move it up or down to scroll.'
                    }
                </p>
            </div>
        </div>
    );
};

export default AirScrollPanel;
