'use client';

import React, { useRef, useEffect } from 'react';

interface WaveformCanvasProps {
  peaks: number[];
  duration: number;
  currentTime: number;
  selection: { start: number; end: number } | null;
  viewRange: { start: number; end: number }; // In seconds
  onSeek: (time: number) => void;
  onSelectRange: (range: { start: number; end: number } | null) => void;
  height?: number;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  peaks,
  duration,
  currentTime,
  selection,
  viewRange,
  onSeek,
  onSelectRange,
  height = 140,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<number | null>(null);

  // Redraw canvas on prop changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, width, h);

    // Background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, h);

    // Center line
    ctx.strokeStyle = '#334155'; // slate-700
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(width, h / 2);
    ctx.stroke();

    const viewSpan = Math.max(0.001, viewRange.end - viewRange.start);

    // Draw Waveform peaks
    if (peaks && peaks.length > 0 && duration > 0) {
      ctx.fillStyle = '#38bdf8'; // sky-400

      const numPoints = peaks.length;
      for (let i = 0; i < width; i++) {
        // Map pixel X to time
        const timeAtPixel = viewRange.start + (i / width) * viewSpan;
        if (timeAtPixel < 0 || timeAtPixel > duration) continue;

        // Peak index
        const peakIdx = Math.min(numPoints - 1, Math.max(0, Math.floor((timeAtPixel / duration) * numPoints)));
        const amp = peaks[peakIdx] || 0;
        const barHeight = Math.max(1, amp * (h / 2) * 0.95);

        ctx.fillRect(i, h / 2 - barHeight, 1, barHeight * 2);
      }
    }

    // Selection Highlight
    if (selection && selection.start !== selection.end) {
      const selMin = Math.min(selection.start, selection.end);
      const selMax = Math.max(selection.start, selection.end);

      const x1 = ((selMin - viewRange.start) / viewSpan) * width;
      const x2 = ((selMax - viewRange.start) / viewSpan) * width;

      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)'; // Sky translucent
      ctx.fillRect(x1, 0, Math.max(2, x2 - x1), h);

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, 0);
      ctx.lineTo(x1, h);
      ctx.moveTo(x2, 0);
      ctx.lineTo(x2, h);
      ctx.stroke();
    }

    // Playhead Line
    if (currentTime >= viewRange.start && currentTime <= viewRange.end) {
      const playheadX = ((currentTime - viewRange.start) / viewSpan) * width;
      ctx.strokeStyle = '#ef4444'; // red-500
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();

      // Playhead top triangle
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX, 8);
      ctx.closePath();
      ctx.fill();
    }
  }, [peaks, duration, currentTime, selection, viewRange, height]);

  // Handle pointer down (mouse / touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const viewSpan = viewRange.end - viewRange.start;
    const clickedTime = Math.max(0, Math.min(duration, viewRange.start + (x / rect.width) * viewSpan));

    isDraggingRef.current = true;
    dragStartRef.current = clickedTime;
    onSeek(clickedTime);
    onSelectRange({ start: clickedTime, end: clickedTime });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || dragStartRef.current === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const viewSpan = viewRange.end - viewRange.start;
    const currentTimeAtPointer = Math.max(0, Math.min(duration, viewRange.start + (x / rect.width) * viewSpan));

    onSelectRange({
      start: dragStartRef.current,
      end: currentTimeAtPointer,
    });
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
  };

  return (
    <div className="relative w-full overflow-hidden select-none border-b border-slate-800">
      <canvas
        ref={canvasRef}
        width={1400}
        height={height}
        className="w-full h-[140px] cursor-crosshair block touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  );
};