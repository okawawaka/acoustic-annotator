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
  const [containerWidth, setContainerWidth] = React.useState<number>(1000);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<number | null>(null);

  const viewSpan = Math.max(0.001, viewRange.end - viewRange.start);

  // Synchronize canvas buffer width with actual DOM client width to avoid stretch/distortion
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const w = container.clientWidth;
      if (w > 0) setContainerWidth(w);
    };
    updateWidth();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.round(entry.contentRect.width));
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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

    // Waveform envelope path (単一パス一括レンダリングで描画APIコールを激減・高速化)
    if (peaks && peaks.length > 0 && duration > 0) {
      ctx.fillStyle = '#0f172a'; // Deep slate/black

      const numPoints = peaks.length;
      const midY = waveHeight / 2;
      const maxH = midY * 0.95;

      ctx.beginPath();
      let started = false;
      for (let i = 0; i < width; i++) {
        const timeAtPixel = viewRange.start + (i / width) * viewSpan;
        if (timeAtPixel < 0 || timeAtPixel > duration) continue;

        const peakIdx = Math.min(numPoints - 1, Math.max(0, Math.floor((timeAtPixel / duration) * numPoints)));
        const amp = peaks[peakIdx] || 0;
        const barH = Math.max(0.5, amp * maxH);

        if (!started) {
          ctx.moveTo(i, midY - barH);
          started = true;
        } else {
          ctx.lineTo(i, midY - barH);
        }
      }

      for (let i = width - 1; i >= 0; i--) {
        const timeAtPixel = viewRange.start + (i / width) * viewSpan;
        if (timeAtPixel < 0 || timeAtPixel > duration) continue;

        const peakIdx = Math.min(numPoints - 1, Math.max(0, Math.floor((timeAtPixel / duration) * numPoints)));
        const amp = peaks[peakIdx] || 0;
        const barH = Math.max(0.5, amp * maxH);

        ctx.lineTo(i, midY + barH);
      }

      ctx.closePath();
      ctx.fill();
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
  }, [peaks, duration, viewRange, height, viewSpan, boundaries, containerWidth]);

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
        start: Math.min(dragStartRef.current, currentTimeAtPointer),
        end: Math.max(dragStartRef.current, currentTimeAtPointer),
      });
    }
  };

  const handlePointerLeave = () => {
    onHoverTimeChange(null);
    if (!isDraggingRef.current) {
      dragStartRef.current = null;
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
  };

  // Selection Edge Resize Handler (drag left or right boundary)
  const handleStartResize = (edge: 'start' | 'end', e: React.PointerEvent) => {
    e.stopPropagation();
    if (!selection) return;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const initialSel = {
      start: Math.min(selection.start, selection.end),
      end: Math.max(selection.start, selection.end),
    };

    const onMove = (moveEv: PointerEvent) => {
      const x = moveEv.clientX - rect.left;
      const t = Math.max(0, Math.min(duration, viewRange.start + (x / rect.width) * viewSpan));
      const roundedT = Math.round(t * 1000) / 1000;

      if (edge === 'start') {
        const newStart = Math.min(roundedT, initialSel.end - 0.005);
        onSelectRange({ start: newStart, end: initialSel.end });
      } else {
        const newEnd = Math.max(roundedT, initialSel.start + 0.005);
        onSelectRange({ start: initialSel.start, end: newEnd });
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
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
      className="flex w-full overflow-hidden select-none bg-white border-b border-[#e0e0e6]"
      style={{ height: `${height}px` }}
    >
      {/* Audio Left Header (Matches TextGrid Timeline Header) */}
      <div className="w-32 flex-shrink-0 bg-[#fafafc] border-r border-[#e0e0e6] px-2 py-1.5 flex flex-col justify-between select-none z-10 text-[#111111]">
        <div>
          <span className="font-bold text-xs text-[#111111] uppercase tracking-tight">Audio (波形)</span>
          <div className="text-[10px] text-[#777780] font-mono mt-0.5">Mono</div>
        </div>

        <div className="text-[9px] text-[#777780] font-mono flex flex-col justify-between py-1" style={{ height: `${height - 55}px` }}>
          <span>+1.0</span>
          <span> 0.0</span>
          <span>-1.0</span>
        </div>

        <div className="text-[9px] text-[#777780] font-mono">
          {(duration || 0).toFixed(2)}s
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
          width={containerWidth}
          height={height}
          className="w-full h-full block pointer-events-none"
        />

        {/* Selection Highlight Overlay with Resizing Handles */}
        {selectionStyle && (
          <div
            className="absolute top-0 bottom-[20px] bg-[#111111]/10 border-x-2 border-[#111111] z-10 select-none"
            style={selectionStyle}
          >
            {/* Left Edge Resize Handle */}
            <div
              onPointerDown={(e) => handleStartResize('start', e)}
              className="absolute left-0 top-0 bottom-0 w-3 -translate-x-1/2 cursor-ew-resize hover:bg-[#E30613]/50 transition-colors z-20 group flex items-center justify-center"
              title="ドラッグして開始位置を微調整"
            >
              <div className="w-[2px] h-3 bg-[#111111] group-hover:bg-[#E30613]" />
            </div>

            {/* Right Edge Resize Handle */}
            <div
              onPointerDown={(e) => handleStartResize('end', e)}
              className="absolute right-0 top-0 bottom-0 w-3 translate-x-1/2 cursor-ew-resize hover:bg-[#E30613]/50 transition-colors z-20 group flex items-center justify-center"
              title="ドラッグして終了位置を微調整"
            >
              <div className="w-[2px] h-3 bg-[#111111] group-hover:bg-[#E30613]" />
            </div>
          </div>
        )}

        {/* Synchronized Hover Hairline */}
        {showHover && hoverPercent !== null && (
          <div
            className="absolute top-0 bottom-[20px] w-[1px] bg-[#aaaaaf] pointer-events-none z-10"
            style={{ left: `${hoverPercent}%` }}
          >
            <div className="absolute top-1 -translate-x-1/2 bg-[#111111] text-white text-[9px] px-1 py-0.2 pointer-events-none font-mono font-bold">
              {hoverTime.toFixed(3)}s
            </div>
          </div>
        )}

        {/* Playhead */}
        {showPlayhead && (
          <div
            className="absolute top-0 bottom-[20px] w-[1.5px] bg-[#E30613] pointer-events-none z-20 will-change-transform"
            style={{ left: `${playheadPercent}%` }}
          >
            <div className="w-2.5 h-2.5 bg-[#E30613] -ml-[4.5px] rotate-45 pointer-events-none" />
          </div>
        )}
      </div>
    </div>
  );
};