'use client';

import React, { useRef, useEffect } from 'react';

interface WaveformCanvasProps {
  peaks: number[];
  duration: number;
  currentTime: number;
  selection: { start: number; end: number } | null;
  viewRange: { start: number; end: number };
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<number | null>(null);

  const viewSpan = Math.max(0.001, viewRange.end - viewRange.start);

  // 1. Draw Waveform ONLY when peaks, duration, viewRange, or height change
  // (Never redraw static waveform on currentTime update!)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, width, h);

    // Background: Pure White
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, h);

    // Center Zero Line
    ctx.strokeStyle = '#e2e8f0'; // gray-200
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(width, h / 2);
    ctx.stroke();

    // Draw Waveform bars (Solid black/slate for paper clarity)
    if (peaks && peaks.length > 0 && duration > 0) {
      ctx.fillStyle = '#0f172a'; // slate-900

      const numPoints = peaks.length;
      for (let i = 0; i < width; i++) {
        const timeAtPixel = viewRange.start + (i / width) * viewSpan;
        if (timeAtPixel < 0 || timeAtPixel > duration) continue;

        const peakIdx = Math.min(numPoints - 1, Math.max(0, Math.floor((timeAtPixel / duration) * numPoints)));
        const amp = peaks[peakIdx] || 0;
        const barHeight = Math.max(0.5, amp * (h / 2) * 0.95);

        ctx.fillRect(i, h / 2 - barHeight, 1, barHeight * 2);
      }
    }
  }, [peaks, duration, viewRange, height, viewSpan]);

  // Pointer interaction for seek and range selection
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedTime = Math.max(0, Math.min(duration, viewRange.start + (x / rect.width) * viewSpan));

    isDraggingRef.current = true;
    dragStartRef.current = clickedTime;
    onSeek(clickedTime);
    onSelectRange({ start: clickedTime, end: clickedTime });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || dragStartRef.current === null) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
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

  // Convert time to percentage relative to view
  const timeToPercent = (time: number) => {
    return ((time - viewRange.start) / viewSpan) * 100;
  };

  // Calculate selection style
  const selectionStyle = React.useMemo(() => {
    if (!selection || selection.start === selection.end) return null;
    const selMin = Math.min(selection.start, selection.end);
    const selMax = Math.max(selection.start, selection.end);

    const left = Math.max(0, timeToPercent(selMin));
    const right = Math.min(100, timeToPercent(selMax));
    return {
      left: `${left}%`,
      width: `${Math.max(0.2, right - left)}%`,
    };
  }, [selection, viewRange, viewSpan]);

  const playheadPercent = timeToPercent(currentTime);
  const showPlayhead = currentTime >= viewRange.start && currentTime <= viewRange.end;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden select-none bg-white border-b border-gray-200 cursor-crosshair touch-none"
      style={{ height: `${height}px` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* 1. Static Waveform Canvas (Heavy drawing, isolated) */}
      <canvas
        ref={canvasRef}
        width={1400}
        height={height}
        className="w-full h-full block pointer-events-none"
      />

      {/* 2. Selection Overlay (Ultra-lightweight DOM element) */}
      {selectionStyle && (
        <div
          className="absolute top-0 bottom-0 bg-blue-500/15 border-x border-blue-600 pointer-events-none"
          style={selectionStyle}
        />
      )}

      {/* 3. Playhead (Hardware-accelerated DOM element, 0% CPU cost) */}
      {showPlayhead && (
        <div
          className="absolute top-0 bottom-0 w-[1.5px] bg-red-600 pointer-events-none z-10 will-change-transform"
          style={{ left: `${playheadPercent}%` }}
        >
          <div className="w-2.5 h-2.5 bg-red-600 -ml-[4px] rotate-45 pointer-events-none" />
        </div>
      )}
    </div>
  );
};