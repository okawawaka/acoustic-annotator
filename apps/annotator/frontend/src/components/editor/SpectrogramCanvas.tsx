'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { AcousticAnalysisData } from '@/types';

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
  onHoverTimeChange,
  onSeek,
  onSelectRange,
  height = 160,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<number | null>(null);

  const renderSpectrogram = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, width, h);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, h);

    const span = viewRange.end - viewRange.start;
    if (span <= 0) return;

    const currentMaxFreq = maxDisplayFreq; // 500Hz または 5000Hz

    // 1. スペクトログラムの描画
    if (analysisData && analysisData.spectrogram.length > 0) {
      const { spectrogram, max_frequency } = analysisData;
      const numFreqs = spectrogram.length;
      const numTimes = spectrogram[0].length;

      const imgData = ctx.createImageData(width, h);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }

      const dt = analysisData.time_step || 0.01;
      const df = max_frequency / numFreqs;

      for (let px = 0; px < width; px++) {
        const t = viewRange.start + (px / width) * span;
        const timeIdx = Math.floor(t / dt);
        if (timeIdx < 0 || timeIdx >= numTimes) continue;

        for (let py = 0; py < h; py++) {
          // 現在の縦軸上限周波数 (currentMaxFreq) に基づいて周波数を計算
          const f = (1.0 - py / h) * currentMaxFreq;
          const freqIdx = Math.floor(f / df);
          if (freqIdx < 0 || freqIdx >= numFreqs) continue;

          const db = spectrogram[freqIdx][timeIdx];
          const norm = Math.max(0, Math.min(1, (db - 15) / 55));
          const gray = Math.round(255 * (1.0 - norm));

          const pixelIdx = (py * width + px) * 4;
          data[pixelIdx] = gray;
          data[pixelIdx + 1] = gray;
          data[pixelIdx + 2] = gray;
          data[pixelIdx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    } else {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, h);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('音声を読み込むと音響データが描画されます', width / 2, h / 2);
    }

    // 周波数グリッド線と目盛りラベル
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.fillStyle = '#64748b';
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

    // 5. 選択範囲ハイライト
    if (selection && selection.start !== selection.end) {
      const selStart = Math.min(selection.start, selection.end);
      const selEnd = Math.max(selection.start, selection.end);
      const x1 = Math.max(0, ((selStart - viewRange.start) / span) * width);
      const x2 = Math.min(width, ((selEnd - viewRange.start) / span) * width);

      if (x2 > x1) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
        ctx.fillRect(x1, 0, x2 - x1, h);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x1, 0, x2 - x1, h);
      }
    }

    // 6. ホバーインジケータ
    if (hoverTime !== null && hoverTime >= viewRange.start && hoverTime <= viewRange.end) {
      const hx = ((hoverTime - viewRange.start) / span) * width;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx, 0);
      ctx.lineTo(hx, h);
      ctx.stroke();
    }

    // 7. 再生位置カーソル (赤線)
    if (currentTime >= viewRange.start && currentTime <= viewRange.end) {
      const cx = ((currentTime - viewRange.start) / span) * width;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();
    }
  }, [analysisData, currentTime, selection, viewRange, boundaries, hoverTime, showPitch, showFormants, showIntensity, maxDisplayFreq]);

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
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [height, renderSpectrogram]);

  useEffect(() => {
    renderSpectrogram();
  }, [renderSpectrogram]);

  const getTimeFromX = (clientX: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvas.width, clientX - rect.left));
    const span = viewRange.end - viewRange.start;
    return viewRange.start + (x / canvas.width) * span;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const time = getTimeFromX(e.clientX);
    isDraggingRef.current = true;
    dragStartRef.current = time;
    if (onSelectRange) onSelectRange(null);
    if (onSeek) onSeek(time);
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
  };

  const isPitchScale = maxDisplayFreq <= 1000;

  return (
    <div className="flex w-full border-b border-gray-200 bg-white select-none">
      {/* Track Label Header (w-32) */}
      <div className="w-32 flex-shrink-0 flex flex-col justify-between p-2 border-r border-gray-200 bg-gray-50/50 text-xs">
        <div>
          <div className="font-semibold text-gray-800 text-[11px] leading-tight">
            {isPitchScale ? 'Pitch (F0)' : 'Spectrogram'}
          </div>
          <div className="text-[10px] text-gray-500 font-mono">
            {isPitchScale ? '0 - 500 Hz' : '0 - 5.0 kHz'}
          </div>
        </div>

        <div className="space-y-1 mt-2">
          {showPitch && (
            <div className="flex items-center text-[10px] text-blue-700 font-mono font-medium">
              <span className="w-2.5 h-0.5 bg-blue-600 inline-block mr-1"></span>
              F0 (Pitch)
            </div>
          )}
          {showFormants && (
            <div className="flex items-center text-[10px] text-red-600 font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block mr-1"></span>
              Formants
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
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>
    </div>
  );
};
