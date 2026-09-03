'use client';

import React, { useRef, useEffect } from 'react';

interface OverviewMinimapProps {
  peaks: number[];
  duration: number;
  currentTime: number;
  viewRange: { start: number; end: number };
  onRangeChange: (range: { start: number; end: number }) => void;
  onSeek: (time: number) => void;
  height?: number;
}

export const OverviewMinimap: React.FC<OverviewMinimapProps> = ({
  peaks,
  duration,
  currentTime,
  viewRange,
  onRangeChange,
  onSeek,
  height = 32,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingWindowRef = useRef(false);
  const dragStartMouseXRef = useRef(0);
  const dragStartRangeRef = useRef({ start: 0, end: 0 });

  // Draw full audio overview peaks
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, width, h);

    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, h);

    // Center Line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(width, h / 2);
    ctx.stroke();

    if (peaks && peaks.length > 0 && duration > 0) {
      ctx.fillStyle = '#94a3b8'; // Muted slate

      const numPoints = peaks.length;
      for (let i = 0; i < width; i++) {
        const peakIdx = Math.min(numPoints - 1, Math.floor((i / width) * numPoints));
        const amp = peaks[peakIdx] || 0;
        const barH = Math.max(0.5, amp * (h / 2) * 0.9);
        ctx.fillRect(i, h / 2 - barH, 1, barH * 2);
      }
    }
  }, [peaks, duration, height]);

  // Calculations for current visible window
  const windowLeftPct = duration > 0 ? (viewRange.start / duration) * 100 : 0;
  const windowWidthPct = duration > 0 ? ((viewRange.end - viewRange.start) / duration) * 100 : 100;
  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Dragging visible window to scroll through long audio
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || duration <= 0) return;
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickTime = (clickX / rect.width) * duration;

    // Check if clicked inside window
    const windowSpan = viewRange.end - viewRange.start;
    if (clickTime >= viewRange.start && clickTime <= viewRange.end) {
      isDraggingWindowRef.current = true;
      dragStartMouseXRef.current = e.clientX;
      dragStartRangeRef.current = { ...viewRange };
    } else {
      // Jump window center to click position
      const newStart = Math.max(0, Math.min(duration - windowSpan, clickTime - windowSpan / 2));
      const newEnd = Math.min(duration, newStart + windowSpan);
      onRangeChange({ start: newStart, end: newEnd });
      onSeek(clickTime);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingWindowRef.current) return;
    const container = containerRef.current;
    if (!container || duration <= 0) return;
    const rect = container.getBoundingClientRect();
    const deltaX = e.clientX - dragStartMouseXRef.current;
    const deltaTime = (deltaX / rect.width) * duration;
    const span = dragStartRangeRef.current.end - dragStartRangeRef.current.start;

    let newStart = dragStartRangeRef.current.start + deltaTime;
    newStart = Math.max(0, Math.min(duration - span, newStart));
    const newEnd = newStart + span;

    onRangeChange({ start: newStart, end: newEnd });
  };

  const handlePointerUp = () => {
    isDraggingWindowRef.current = false;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden select-none bg-gray-50 border-b border-gray-200 cursor-pointer touch-none"
      style={{ height: `${height}px` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      title="全体ミニマップ: ドラッグして表示位置を移動"
    >
      <canvas
        ref={canvasRef}
        width={1400}
        height={height}
        className="w-full h-full block pointer-events-none"
      />

      {/* Visible Range Window */}
      <div
        className="absolute top-0 bottom-0 border-2 border-gray-600 bg-black/10 cursor-grab active:cursor-grabbing pointer-events-none"
        style={{
          left: `${windowLeftPct}%`,
          width: `${Math.max(1, windowWidthPct)}%`,
        }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-600/50" />
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-600/50" />
      </div>

      {/* Playhead Marker */}
      <div
        className="absolute top-0 bottom-0 w-[1.5px] bg-red-600 pointer-events-none"
        style={{ left: `${playheadPct}%` }}
      />
    </div>
  );
};