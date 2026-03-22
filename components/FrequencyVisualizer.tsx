'use client';

import { useRef, useEffect, type FC } from 'react';

interface FrequencyVisualizerProps {
    analyser: AnalyserNode | null;
    isActive: boolean;
}

const FrequencyVisualizer: FC<FrequencyVisualizerProps> = ({ analyser, isActive }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = () => {
            frameRef.current = requestAnimationFrame(draw);
            const W = canvas.width;
            const H = canvas.height;

            // Background fade
            ctx.fillStyle = 'rgba(5, 5, 15, 0.75)';
            ctx.fillRect(0, 0, W, H);

            if (!analyser || !isActive) {
                // Idle state — subtle flat line with glow
                ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, H / 2);
                ctx.lineTo(W, H / 2);
                ctx.stroke();
                return;
            }

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Float32Array(bufferLength);
            analyser.getFloatFrequencyData(dataArray);

            // Only show bins ~18kHz–22kHz (the Doppler window) for focus
            const sampleRate = 48000;
            const nyquist = sampleRate / 2;
            const startHz = 17500;
            const endHz = 22500;
            const startBin = Math.floor((startHz / nyquist) * bufferLength);
            const endBin = Math.ceil((endHz / nyquist) * bufferLength);
            const visibleBins = endBin - startBin;

            const barWidth = W / visibleBins;

            for (let i = 0; i < visibleBins; i++) {
                const bin = startBin + i;
                const dbValue = dataArray[bin]; // -160 to 0
                const normalized = Math.max(0, (dbValue + 100) / 60); // map -100...-40dB to 0..1

                const barH = normalized * H;
                const x = i * barWidth;

                // Color: cyan base with hot white peak
                const r = Math.floor(normalized * 80);
                const g = Math.floor(180 + normalized * 75);
                const b = 255;
                const alpha = 0.4 + normalized * 0.6;

                ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
                ctx.fillRect(x, H - barH, barWidth - 1, barH);

                // Glow bleed for high bars
                if (normalized > 0.5) {
                    ctx.fillStyle = `rgba(0, 229, 255, ${(normalized - 0.5) * 0.3})`;
                    ctx.fillRect(x - 1, H - barH - 4, barWidth + 2, barH + 4);
                }
            }

            // Center frequency marker (20kHz)
            const center20kHz = Math.floor(((20000 / nyquist) * bufferLength - startBin) / visibleBins * W);
            ctx.strokeStyle = 'rgba(255, 80, 80, 0.6)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(center20kHz, 0);
            ctx.lineTo(center20kHz, H);
            ctx.stroke();
            ctx.setLineDash([]);

            // Labels
            ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
            ctx.font = '9px monospace';
            ctx.fillText('18kHz', 2, H - 3);
            ctx.fillText('20kHz', center20kHz - 14, 10);
            ctx.fillText('22kHz', W - 36, H - 3);
        };

        frameRef.current = requestAnimationFrame(draw);
        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [analyser, isActive]);

    return (
        <canvas
            ref={canvasRef}
            width={560}
            height={120}
            className="w-full rounded-lg border border-cyan-900/30"
            style={{ background: 'rgba(5,5,15,0.8)' }}
        />
    );
};

export default FrequencyVisualizer;
