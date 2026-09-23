'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AcousticAnalysisData, SpectrogramColorMap } from '@/types';

// カラーパレット変換関数 (Grayscale / Dark Invert / Thermal Color)
function getColorRGB(norm: number, colorMap: SpectrogramColorMap): [number, number, number] {
  if (colorMap === 'dark') {
    const val = Math.round(255 * norm);
    return [val, val, val];
  }
  if (colorMap === 'color') {
    // Thermal / Spectrogram Heatmap スタイル
    if (norm <= 0.05) return [15, 23, 42]; // 濃紺
    if (norm <= 0.35) {
      const t = (norm - 0.05) / 0.3;
      return [
        Math.round(15 + t * (37 - 15)),
        Math.round(23 + t * (99 - 23)),
        Math.round(42 + t * (235 - 42)),
      ];
    }
    if (norm <= 0.7) {
      const t = (norm - 0.35) / 0.35;
      return [
        Math.round(37 + t * (234 - 37)),
        Math.round(99 + t * (179 - 99)),
        Math.round(235 + t * (8 - 235)),
      ];
    }
    const t = (norm - 0.7) / 0.3;
    return [
      Math.round(234 + t * (255 - 234)),
      Math.round(179 + t * (255 - 179)),
      Math.round(8 + t * (255 - 8)),
    ];
  }
  // Default 'grayscale' (Praat標準: 白背景 0 〜 黒 1)
  const val = Math.round(255 * (1.0 - norm));
  return [val, val, val];
}

interface SpectrogramCanvasProps {
  analysisData: AcousticAnalysisData | null;
  duration: number;
  currentTime: number;
  selection: { start: number; end: number } | null;
  viewRange: { start: number; end: number };
  boundaries?: number[];
  hoverTime?: number | null;
  showPitch?: boolean;
  showFormants?: boolean;
  showIntensity?: boolean;
  maxDisplayFreq?: number; // 500 (F0観察用) または 5000 (フォルマント用)
  colorMap?: SpectrogramColorMap;
  onHoverTimeChange?: (time: number | null) => void;
  onSeek?: (time: number) => void;
  onSelectRange?: (range: { start: number; end: number } | null) => void;
  height?: number;
}

export const SpectrogramCanvas: React.FC<SpectrogramCanvasProps> = ({
  analysisData,
  duration,
  currentTime,
  selection,
  viewRange,
  boundaries = [],
  hoverTime = null,
  showPitch = true,
  showFormants = true,
  showIntensity = true,
  maxDisplayFreq = 5000,
  colorMap = 'grayscale',
  onHoverTimeChange,
  onSeek,
  onSelectRange,
  height = 160,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<number | null>(null);

  // 全体スペクトログラムのビットマップキャッシュ（パン・ズーム・スクロール時の超高速GPUハードウェア描画）
  const [cachedCanvas, setCachedCanvas] = useState<HTMLCanvasElement | null>(null);
  const cacheKeyRef = useRef<string>('');

  useEffect(() => {
    if (!analysisData || !analysisData.spectrogram || analysisData.spectrogram.length === 0) {
      setCachedCanvas(null);
      cacheKeyRef.current = '';
      return;
    }

    const { spectrogram } = analysisData;
    const numFreqs = spectrogram.length;
    const numTimes = spectrogram[0].length;
    const key = `${numTimes}_${numFreqs}_${analysisData.duration}_${colorMap}`;

    if (cacheKeyRef.current === key) {
      return;
    }

    const offscreen = document.createElement('canvas');
    offscreen.width = numTimes;
    offscreen.height = numFreqs;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const imgData = offCtx.createImageData(numTimes, numFreqs);
    const buf32 = new Uint32Array(imgData.data.buffer);

    for (let bin = 0; bin < numFreqs; bin++) {
      // Canvas 上部 (y=0) が最高周波数、Canvas 下部 (y=numFreqs-1) が 0Hz
      const py = numFreqs - 1 - bin;
      for (let timeIdx = 0; timeIdx < numTimes; timeIdx++) {
        const val = spectrogram[bin][timeIdx];
        // 0〜100 の正規化強度
        const norm = Math.max(0, Math.min(1, val <= 1 ? val : val / 100));
        const [r, g, b] = getColorRGB(norm, colorMap);

        // 32-bit リトルエンディアン (0xAABBGGRR)
        buf32[py * numTimes + timeIdx] = (255 << 24) | (b << 16) | (g << 8) | r;
      }
    }

    offCtx.putImageData(imgData, 0, 0);
    setCachedCanvas(offscreen);
    cacheKeyRef.current = key;
  }, [analysisData, colorMap]);

  const renderSpectrogram = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, width, h);

    const isDark = colorMap === 'dark';
    ctx.fillStyle = isDark ? '#09090b' : colorMap === 'color' ? '#0f172a' : '#ffffff';
    ctx.fillRect(0, 0, width, h);

    const span = viewRange.end - viewRange.start;
    if (span <= 0) return;

    const currentMaxFreq = maxDisplayFreq; // 500Hz または 5000Hz, 8000Hz等

    // 1. スペクトログラムの超高速スライス描画 (GPU ハードウェア補間転送 & 厳密時間/周波数軸配置)
    if (analysisData && cachedCanvas && duration > 0) {
      const numTimes = cachedCanvas.width;
      const numFreqs = cachedCanvas.height;
      const maxFreq = analysisData.max_frequency || 5000;

      // 時間軸 (X軸) の厳密なマッピング:
      // 表示範囲 [viewRange.start, viewRange.end] と音声区間 [0, duration] の重なりを算出
      const visStart = Math.max(0, Math.min(duration, viewRange.start));
      const visEnd = Math.max(0, Math.min(duration, viewRange.end));

      if (visEnd > visStart) {
        // ソース側の時間範囲 (cachedCanvas の X 座標)
        const sx = (visStart / duration) * numTimes;
        const sw = ((visEnd - visStart) / duration) * numTimes;

        // スクリーン Canvas における配置先 X 座標・幅
        const dx = ((visStart - viewRange.start) / span) * width;
        const dw = ((visEnd - visStart) / span) * width;

        // 周波数軸 (Y軸) の厳密なマッピング:
        // 画面上部が currentMaxFreq、画面下部が 0Hz
        // cachedCanvas の上部が maxFreq、下部が 0Hz
        const visMaxFreq = Math.min(currentMaxFreq, maxFreq);
        const sy = (1.0 - visMaxFreq / maxFreq) * numFreqs;
        const sh = (visMaxFreq / maxFreq) * numFreqs;

        const dy = (1.0 - visMaxFreq / currentMaxFreq) * h;
        const dh = (visMaxFreq / currentMaxFreq) * h;

        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(cachedCanvas, sx, sy, sw, sh, dx, dy, dw, dh);
        ctx.restore();
      }
    } else if (!analysisData) {
      ctx.fillStyle = isDark ? '#1e1e24' : '#f8fafc';
      ctx.fillRect(0, 0, width, h);
      ctx.fillStyle = isDark ? '#71717a' : '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('音声を読み込むと音響データが描画されます', width / 2, h / 2);
    }

    // 周波数グリッド線と目盛りラベル
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.fillStyle = isDark ? '#a1a1aa' : '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';

    if (currentMaxFreq <= 1000) {
      // F0 拡大モード (0 - 500 Hz): 100Hz 刻み
      for (let f = 100; f < currentMaxFreq; f += 100) {
        const y = h - (f / currentMaxFreq) * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.fillText(f + 'Hz', width - 4, y - 2);
      }
    } else {
      // 広帯域モード (0 - 5000 Hz): 1000Hz 刻み
      for (let f = 1000; f < currentMaxFreq; f += 1000) {
        const y = h - (f / currentMaxFreq) * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.fillText((f / 1000) + 'k', width - 4, y - 2);
      }
    }
    ctx.setLineDash([]);

    // 2. フォルマント (F1, F2, F3) 重畳描画 (赤点)
    if (showFormants && analysisData?.formants) {
      const { times, f1, f2, f3 } = analysisData.formants;
      const pointRadius = 1.8;

      for (let i = 0; i < times.length; i++) {
        const t = times[i];
        if (t < viewRange.start || t > viewRange.end) continue;
        const x = ((t - viewRange.start) / span) * width;

        const formants = [f1[i], f2[i], f3[i]];
        for (const freq of formants) {
          if (freq && freq > 0 && freq <= currentMaxFreq) {
            const y = h - (freq / currentMaxFreq) * h;
            ctx.fillStyle = 'rgba(220, 38, 38, 0.85)';
            ctx.beginPath();
            ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
    }

    // 3. F0 (Pitch) 重畳描画 (青線)
    if (showPitch && analysisData?.pitch) {
      const { times, values } = analysisData.pitch;
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = currentMaxFreq <= 1000 ? 2.5 : 1.8; // 拡大時は線を太くして視認性アップ
      ctx.beginPath();
      let started = false;

      for (let i = 0; i < times.length; i++) {
        const t = times[i];
        if (t < viewRange.start || t > viewRange.end) continue;
        const x = ((t - viewRange.start) / span) * width;
        const pitchHz = values[i];

        if (pitchHz && pitchHz > 0 && pitchHz <= currentMaxFreq) {
          const y = h - (pitchHz / currentMaxFreq) * h;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        } else {
          started = false;
        }
      }
      ctx.stroke();
    }

    // 4. Intensity (音圧曲線) 重畳描画 (Praat 緑線 #10b981)
    if (showIntensity && analysisData?.intensity) {
      const { times, values } = analysisData.intensity;
      const minDb = 40;
      const maxDb = 95;
      const dbSpan = maxDb - minDb;

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      let started = false;

      for (let i = 0; i < times.length; i++) {
        const t = times[i];
        if (t < viewRange.start || t > viewRange.end) continue;
        const x = ((t - viewRange.start) / span) * width;
        const val = values[i];

        if (val !== null && val > minDb) {
          const normDb = Math.max(0, Math.min(1, (val - minDb) / dbSpan));
          const y = h - normDb * h;
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        } else {
          started = false;
        }
      }
      ctx.stroke();

      // 右端の dB 目盛りラベル (緑色)
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 8.5px monospace';
      ctx.textAlign = 'right';
      for (let db = 50; db <= 90; db += 20) {
        const y = h - ((db - minDb) / dbSpan) * h;
        ctx.fillText(db + 'dB', width - 36, y - 2);
      }
    }

    // 5. TextGrid境界線（点線）
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (const b of boundaries) {
      if (b >= viewRange.start && b <= viewRange.end) {
        const bx = ((b - viewRange.start) / span) * width;
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.lineTo(bx, h);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
  }, [analysisData, viewRange, boundaries, showPitch, showFormants, showIntensity, maxDisplayFreq, colorMap, duration, cachedCanvas]);

  useEffect(() => {
    const updateSize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = height;
      renderSpectrogram();
    };

    updateSize();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          updateSize();
        }
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [renderSpectrogram, height]);

  const viewSpan = Math.max(0.001, viewRange.end - viewRange.start);

  const getTimeFromX = (clientX: number) => {
    const container = containerRef.current;
    if (!container) return 0;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    return viewRange.start + (x / rect.width) * viewSpan;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const time = getTimeFromX(e.clientX);
    isDraggingRef.current = true;
    dragStartRef.current = time;
    if (onSeek) onSeek(time);
    if (onSelectRange) onSelectRange({ start: time, end: time });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const time = getTimeFromX(e.clientX);
    if (onHoverTimeChange) onHoverTimeChange(time);

    if (isDraggingRef.current && dragStartRef.current !== null) {
      if (onSelectRange) {
        onSelectRange({
          start: Math.min(dragStartRef.current, time),
          end: Math.max(dragStartRef.current, time),
        });
      }
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    dragStartRef.current = null;
  };

  // Selection Edge Resize Handler (drag left or right boundary)
  const handleStartResize = (edge: 'start' | 'end', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selection) return;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const initialSel = {
      start: Math.min(selection.start, selection.end),
      end: Math.max(selection.start, selection.end),
    };

    const onMove = (moveEv: MouseEvent) => {
      const x = moveEv.clientX - rect.left;
      const t = Math.max(0, Math.min(duration, viewRange.start + (x / rect.width) * viewSpan));
      const roundedT = Math.round(t * 1000) / 1000;

      if (edge === 'start') {
        const newStart = Math.min(roundedT, initialSel.end - 0.005);
        onSelectRange?.({ start: newStart, end: initialSel.end });
      } else {
        const newEnd = Math.max(roundedT, initialSel.start + 0.005);
        onSelectRange?.({ start: initialSel.start, end: newEnd });
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
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

  const isPitchScale = maxDisplayFreq <= 1000;

  return (
    <div className="flex w-full border-b border-[#e0e0e6] bg-white select-none">
      {/* Track Label Header (w-32) */}
      <div className="w-32 flex-shrink-0 flex flex-col justify-between p-2 border-r border-[#e0e0e6] bg-[#fafafc] text-xs">
        <div>
          <div className="font-bold text-[#111111] text-[11px] leading-tight uppercase tracking-tight">
            {isPitchScale ? 'Pitch (F0)' : 'Spectrogram'}
          </div>
          <div className="text-[10px] text-[#777780] font-mono">
            {isPitchScale ? '0 - 500 Hz' : `0 - ${(maxDisplayFreq / 1000).toFixed(1)} kHz`}
          </div>
        </div>

        <div className="space-y-1 mt-2">
          {showPitch && (
            <div className="flex items-center text-[10px] text-[#2563eb] font-mono font-bold">
              <span className="w-2.5 h-0.5 bg-[#2563eb] inline-block mr-1"></span>
              F0
            </div>
          )}
          {showFormants && (
            <div className="flex items-center text-[10px] text-[#E30613] font-mono font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E30613] inline-block mr-1"></span>
              F1-3
            </div>
          )}
          {showIntensity && (
            <div className="flex items-center text-[10px] text-[#10b981] font-mono font-bold">
              <span className="w-2.5 h-0.5 bg-[#10b981] inline-block mr-1"></span>
              Int
            </div>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative cursor-crosshair overflow-hidden"
        style={{ height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          isDraggingRef.current = false;
          if (onHoverTimeChange) onHoverTimeChange(null);
        }}
      >
        <canvas ref={canvasRef} className="block w-full h-full pointer-events-none" />

        {/* Selection Highlight Overlay with Resizing Handles */}
        {selectionStyle && (
          <div
            className="absolute top-0 bottom-0 bg-[#111111]/10 border-x-2 border-[#111111] z-10 select-none"
            style={selectionStyle}
          >
            {/* Left Edge Resize Handle */}
            <div
              onMouseDown={(e) => handleStartResize('start', e)}
              className="absolute left-0 top-0 bottom-0 w-3 -translate-x-1/2 cursor-ew-resize hover:bg-[#E30613]/50 transition-colors z-20 group flex items-center justify-center"
              title="ドラッグして開始位置を微調整"
            >
              <div className="w-[2px] h-3 bg-[#111111] group-hover:bg-[#E30613]" />
            </div>

            {/* Right Edge Resize Handle */}
            <div
              onMouseDown={(e) => handleStartResize('end', e)}
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
            className="absolute top-0 bottom-0 w-[1px] bg-[#aaaaaf] pointer-events-none z-10"
            style={{ left: `${hoverPercent}%` }}
          />
        )}

        {/* Playhead */}
        {showPlayhead && (
          <div
            className="absolute top-0 bottom-0 w-[1.5px] bg-[#E30613] pointer-events-none z-20 will-change-transform"
            style={{ left: `${playheadPercent}%` }}
          />
        )}
      </div>
    </div>
  );
};
