'use client';

import React, { useRef, useEffect } from 'react';

interface WaveformCanvasProps {
  peaks: number[];
  duration: number;
  currentTime: number;
  selection: { start: number; end: number } | null;
  viewRange: { start: number; end: number };
  boundaries?: number[]; // Projected boundaries from TextGrid tiers
  hoverTime: number | null;
  onHoverTimeChange: (time: number | null) => void;
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
  boundaries = [],
  hoverTime,
  onHoverTimeChange,
  onSeek,
  onSelectRange,
  height = 140,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<number | null>(null);

  const viewSpan = Math.max(0.001, viewRange.end - viewRange.start);

  // Draw Static Waveform, Time Ruler & Projected Boundaries
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

    const waveHeight = h - 20;

    // Zero line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, waveHeight / 2);
    ctx.lineTo(width, waveHeight / 2);
    ctx.stroke();

    // Projected Boundary Lines (Dashed Gray Lines showing TextGrid alignment)
    if (boundaries && boundaries.length > 0) {
      ctx.strokeStyle = '#cbd5e1'; // gray-300
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      for (const bTime of boundaries) {
        if (bTime >= viewRange.start && bTime <= viewRange.end) {
          const bx = ((bTime - viewRange.start) / viewSpan) * width;
          ctx.beginPath();
          ctx.moveTo(bx, 0);
          ctx.lineTo(bx, waveHeight);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]); // Reset line dash
    }

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

    // Time Ruler bottom line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, waveHeight);
    ctx.lineTo(width, waveHeight);
    ctx.stroke();

    // Time Ruler Tick Marks & Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';

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
  }, [peaks, duration, viewRange, height, viewSpan, boundaries]);

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
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const currentTimeAtPointer = Math.max(0, Math.min(duration, viewRange.start + (x / rect.width) * viewSpan));

    onHoverTimeChange(currentTimeAtPointer);

    if (isDraggingRef.current && dragStartRef.current !== null) {
      onSelectRange({
        start: dragStartRef.current,
        end: currentTimeAtPointer,
      });
    }
  };

  const handlePointerLeave = () => {
    onHoverTimeChange(null);
    isDraggingRef.current = false;
    dragStartRef.current = null;
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
  };

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

  const hoverPercent = hoverTime !== null ? ((hoverTime - viewRange.start) / viewSpan) * 100 : null;
  const showHover = hoverTime !== null && hoverTime >= viewRange.start && hoverTime <= viewRange.end;

  return (
    <div
      className="flex w-full overflow-hidden select-none bg-white border-b border-gray-200"
      style={{ height: `${height}px` }}
    >
      {/* Audio Left Header (Matches TextGrid Timeline Header) */}
      <div className="w-32 flex-shrink-0 bg-gray-50 border-r border-gray-200 px-2 py-1.5 flex flex-col justify-between select-none z-10">
        <div>
          <span className="font-semibold text-xs text-gray-800">Audio (波形)</span>
          <div className="text-[10px] text-gray-500 mt-0.5">Mono</div>
        </div>

        <div className="text-[9px] text-gray-400 font-mono flex flex-col justify-between py-1" style={{ height: `${height - 55}px` }}>
          <span>+1.0</span>
          <span> 0.0</span>
          <span>-1.0</span>
        </div>

        <div className="text-[9px] text-gray-400">
          {(duration || 0).toFixed(1)}s
        </div>
      </div>

      {/* Waveform Track (Perfect 1-to-1 pixel alignment with TextGrid tracks) */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden select-none bg-white cursor-crosshair touch-none h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerUp}
      >
        <canvas
          ref={canvasRef}
          width={1400}
          height={height}
          className="w-full h-full block pointer-events-none"
        />

        {/* Selection Highlight Overlay */}
        {selectionStyle && (
          <div
            className="absolute top-0 bottom-[20px] bg-blue-500/15 border-x border-blue-600 pointer-events-none"
            style={selectionStyle}
          />
        )}

        {/* Synchronized Hover Hairline */}
        {showHover && hoverPercent !== null && (
          <div
            className="absolute top-0 bottom-[20px] w-[1px] bg-gray-400 pointer-events-none z-10"
            style={{ left: `${hoverPercent}%` }}
          >
            <div className="absolute top-1 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1 py-0.2 rounded pointer-events-none font-mono">
              {hoverTime.toFixed(3)}s
            </div>
          </div>
        )}

        {/* Playhead */}
        {showPlayhead && (
          <div
            className="absolute top-0 bottom-[20px] w-[1.5px] bg-red-600 pointer-events-none z-20 will-change-transform"
            style={{ left: `${playheadPercent}%` }}
          >
            <div className="w-2.5 h-2.5 bg-red-600 -ml-[4px] rotate-45 pointer-events-none" />
          </div>
        )}
      </div>
    </div>
  );
};