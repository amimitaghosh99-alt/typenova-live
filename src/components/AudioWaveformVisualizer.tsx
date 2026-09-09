import { useEffect, useRef, memo } from 'react';
import { getAudioAnalyser } from '@/lib/audioDictationEngine';
import type { Theme } from '@/data/constants';

interface AudioWaveformVisualizerProps {
  isActive: boolean;
  theme: Theme;
  height?: number;
  className?: string;
}

export const AudioWaveformVisualizer = memo(function AudioWaveformVisualizer({
  isActive,
  theme,
  height = 36,
  className = '',
}: AudioWaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const glowPrimary = theme?.glowPrimary || '34, 211, 238';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const analyser = getAudioAnalyser();
    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
    const rect = canvas.getBoundingClientRect();
    const logicalWidth = Math.max(320, Math.round(rect.width || 480));
    canvas.width = logicalWidth * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      const width = logicalWidth;
      const h = height;
      ctx.clearRect(0, 0, width, h);

      const midY = h / 2;

      let energy = 0.3;
      if (isActive && analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        energy = Math.min(1.5, Math.max(0.3, (sum / dataArray.length) / 30));
      } else if (isActive) {
        energy = 0.8;
      } else {
        energy = 0.15;
      }

      phase += isActive ? 0.08 : 0.02;

      // Draw secondary ambient glow wave
      ctx.beginPath();
      ctx.strokeStyle = `rgba(${glowPrimary}, 0.25)`;
      ctx.lineWidth = 1.5;
      for (let x = 0; x < width; x += 4) {
        const norm = x / width;
        const envelope = Math.sin(norm * Math.PI); // tapering envelope at edges
        const y = midY + Math.sin(x * 0.04 - phase * 1.2) * (10 * energy * envelope);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw primary crisp wave
      ctx.beginPath();
      ctx.strokeStyle = `rgb(${glowPrimary})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = `rgb(${glowPrimary})`;
      ctx.shadowBlur = isActive ? 10 : 2;

      for (let x = 0; x < width; x += 3) {
        const norm = x / width;
        const envelope = Math.sin(norm * Math.PI);
        const y = midY + Math.sin(x * 0.05 + phase) * (14 * energy * envelope) + Math.cos(x * 0.02 + phase * 0.5) * (4 * energy * envelope);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Reset shadow blur
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActive, glowPrimary]);

  return (
    <div className={`relative flex items-center justify-center w-full max-w-lg mx-auto ${className}`}>
      <canvas
        ref={canvasRef}
        width={360}
        height={height}
        className="w-full h-9 block rounded-full transition-opacity duration-300 pointer-events-none"
      />
    </div>
  );
});
