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

  // Draw Static Waveform & Time Ruler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, width, h);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, h);

    // Waveform drawing area (leave 18px at bottom for time ruler)
    const waveHeight = h - 20;

    // Zero line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, waveHeight / 2);
    ctx.lineTo(width, waveHeight / 2);
    ctx.stroke();

    // Waveform bars
    if (peaks && peaks.length > 0 && duration > 0) {
      ctx.fillStyle = '#0f172a'; // Deep slate/black

      const numPoints = peaks.length;
      for (let i = 0; i < width; i++) {
        const timeAtPixel = viewRange.start + (i / width) * viewSpan;
        if (timeAtPixel < 0 || timeAtPixel > duration) continue;

        const peakIdx = Math.min(numPoints - 1, Math.max(0, Math.floor((timeAtPixel / duration) * numPoints)));
        const amp = peaks[peakIdx] || 0;
        const barH = Math.max(0.5, amp * (waveHeight / 2) * 0.95);

        ctx.fillRect(i, waveHeight / 2 - barH, 1, barH * 2);
      }
    }

    // Time Ruler bottom border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, waveHeight);
    ctx.lineTo(width, waveHeight);
    ctx.stroke();

    // Time Ruler Tick Marks & Labels
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';

    // Determine nice tick step based on viewSpan
    let tickStep = 1.0;
    if (viewSpan < 0.5) tickStep = 0.05;
    else if (viewSpan < 1.5) tickStep = 0.1;
    else if (viewSpan < 4) tickStep = 0.5;
    else if (viewSpan < 10) tickStep = 1.0;
    else if (viewSpan < 30) tickStep = 2.0;
    else tickStep = 5.0;

    const firstTick = Math.ceil(viewRange.start / tickStep) * tickStep;
    for (let t = firstTick; t <= viewRange.end; t += tickStep) {
      const x = ((t - viewRange.start) / viewSpan) * width;
      if (x < 0 || x > width) continue;

      ctx.beginPath();
      ctx.moveTo(x, waveHeight);
      ctx.lineTo(x, waveHeight + 4);
      ctx.stroke();

      const label = t.toFixed(tickStep < 0.1 ? 2 : tickStep < 1 ? 1 : 0) + 's';
      ctx.fillText(label, x, h - 4);
    }
  }, [peaks, duration, viewRange, height, viewSpan]);

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

  // Selection overlay calculation
  const selectionStyle = React.useMemo(() => {
    if (!selection || selection.start === selection.end) return null;
    const selMin = Math.min(selection.start, selection.end);
    const selMax = Math.max(selection.start, selection.end);

    const left = ((selMin - viewRange.start) / viewSpan) * 100;
    const width = ((selMax - selMin) / viewSpan) * 100;
    return {
      left: `${left}%`,
      width: `${Math.max(0.1, width)}%`,
    };
  }, [selection, viewRange, viewSpan]);

  const playheadPercent = ((currentTime - viewRange.start) / viewSpan) * 100;
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
      <canvas
        ref={canvasRef}
        width={1400}
        height={height}
        className="w-full h-full block pointer-events-none"
      />

      {selectionStyle && (
        <div
          className="absolute top-0 bottom-[20px] bg-blue-500/15 border-x border-blue-600 pointer-events-none"
          style={selectionStyle}
        />
      )}

      {showPlayhead && (
        <div
          className="absolute top-0 bottom-[20px] w-[1.5px] bg-red-600 pointer-events-none z-10 will-change-transform"
          style={{ left: `${playheadPercent}%` }}
        >
          <div className="w-2.5 h-2.5 bg-red-600 -ml-[4px] rotate-45 pointer-events-none" />
        </div>
      )}
    </div>
  );
};