'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { X, Activity, Download, Layers, Crosshair } from 'lucide-react';
import { computeSpectralSlice, SpectralSliceData } from '@/lib/clientAudioAnalysis';

interface SpectralSliceModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelData: Float32Array | null;
  sampleRate: number | null;
  targetTime: number; // 分析対象時刻 (秒)
  selectedRange?: { start: number; end: number } | null;
  selectedLabel?: string | null;
}

export const SpectralSliceModal: React.FC<SpectralSliceModalProps> = ({
  isOpen,
  onClose,
  channelData,
  sampleRate,
  targetTime,
  selectedRange,
  selectedLabel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [maxFreq, setMaxFreq] = useState<number>(5000);
  const [lpcOrder, setLpcOrder] = useState<number>(16);
  const [showFft, setShowFft] = useState<boolean>(true);
  const [showLpc, setShowLpc] = useState<boolean>(true);
  const [hoverCoord, setHoverCoord] = useState<{ freq: number; db: number; x: number; y: number } | null>(null);

  // スペクトルスライス計算
  const sliceData: SpectralSliceData | null = useMemo(() => {
    if (!channelData || !sampleRate || !isOpen) return null;
    const time = selectedRange ? (selectedRange.start + selectedRange.end) / 2 : targetTime;
    return computeSpectralSlice(channelData, sampleRate, time, maxFreq, lpcOrder);
  }, [channelData, sampleRate, targetTime, selectedRange, maxFreq, lpcOrder, isOpen]);

  // 描画関数
  const renderSlice = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sliceData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // 背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const padding = { top: 24, right: 30, bottom: 35, left: 50 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    const minDb = -75;
    const maxDb = 5;
    const dbRange = maxDb - minDb;

    const freqToX = (f: number) => padding.left + (f / maxFreq) * plotW;
    const dbToY = (db: number) => padding.top + ((maxDb - Math.max(minDb, Math.min(maxDb, db))) / dbRange) * plotH;

    // 1. グリッド線と軸目盛り
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);

    // dB 軸 (横線)
    ctx.fillStyle = '#777780';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    for (let db = 0; db >= minDb; db -= 15) {
      const y = dbToY(db);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(`${db} dB`, padding.left - 6, y + 3);
    }

    // 周波数軸 (縦線)
    ctx.textAlign = 'center';
    const fStep = maxFreq <= 5000 ? 1000 : 2000;
    for (let f = 0; f <= maxFreq; f += fStep) {
      const x = freqToX(f);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
      ctx.fillText(`${f >= 1000 ? f / 1000 + 'k' : f}Hz`, x, height - padding.bottom + 14);
    }
    ctx.setLineDash([]);

    // 枠線
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(padding.left, padding.top, plotW, plotH);

    // 2. FFT パワースペクトル (暗灰色・細線)
    if (showFft && sliceData.frequencies.length > 0) {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let i = 0; i < sliceData.frequencies.length; i++) {
        const x = freqToX(sliceData.frequencies[i]);
        const y = dbToY(sliceData.fftDb[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 3. LPC Burg スペクトル包絡線 (赤色太線・Praat Envelope)
    if (showLpc && sliceData.frequencies.length > 0) {
      ctx.strokeStyle = '#E30613';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let i = 0; i < sliceData.frequencies.length; i++) {
        const x = freqToX(sliceData.frequencies[i]);
        const y = dbToY(sliceData.lpcDb[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // フォルマント極大値マーカー
      for (let i = 0; i < sliceData.formants.length; i++) {
        const form = sliceData.formants[i];
        if (form.freq <= maxFreq) {
          const fx = freqToX(form.freq);
          const fy = dbToY(form.db);

          ctx.fillStyle = '#E30613';
          ctx.beginPath();
          ctx.arc(fx, fy, 3.5, 0, 2 * Math.PI);
          ctx.fill();

          // ラベル
          ctx.fillStyle = '#111111';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`F${i + 1}:${Math.round(form.freq)}`, fx, Math.max(padding.top + 10, fy - 8));
        }
      }
    }

    // 4. マウスホバー・クロスヘア
    if (hoverCoord && hoverCoord.x >= padding.left && hoverCoord.x <= width - padding.right) {
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);

      // 縦線
      ctx.beginPath();
      ctx.moveTo(hoverCoord.x, padding.top);
      ctx.lineTo(hoverCoord.x, height - padding.bottom);
      ctx.stroke();

      // 横線
      ctx.beginPath();
      ctx.moveTo(padding.left, hoverCoord.y);
      ctx.lineTo(width - padding.right, hoverCoord.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [sliceData, maxFreq, showFft, showLpc, hoverCoord]);

  // コンテナの寸法確定と連動したキャンバスのリサイズ & レンダリング
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsReady(false);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // 初回即時設定
    const updateCanvasSize = (w: number, h: number) => {
      const canvas = canvasRef.current;
      if (!canvas || w <= 0 || h <= 0) return;
      const targetW = Math.floor(w);
      const targetH = Math.floor(h);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      renderSlice();
      setIsReady(true);
    };

    if (container.clientWidth > 0 && container.clientHeight > 0) {
      updateCanvasSize(container.clientWidth, container.clientHeight);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          updateCanvasSize(width, height);
        }
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [isOpen, renderSlice]);

  useEffect(() => {
    if (isOpen && isReady) {
      renderSlice();
    }
  }, [isOpen, isReady, renderSlice]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = { top: 24, right: 30, bottom: 35, left: 50 };
    const plotW = canvas.width - padding.left - padding.right;
    const plotH = canvas.height - padding.top - padding.bottom;

    if (x >= padding.left && x <= canvas.width - padding.right && y >= padding.top && y <= canvas.height - padding.bottom) {
      const freq = ((x - padding.left) / plotW) * maxFreq;
      const db = 5 - ((y - padding.top) / plotH) * 80;
      setHoverCoord({ freq: Math.round(freq), db: Math.round(db * 10) / 10, x, y });
    } else {
      setHoverCoord(null);
    }
  };

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `spectral-slice-${sliceData?.time.toFixed(3) || 'analysis'}s.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/70 backdrop-blur-none p-4">
      <div className="bg-white border-2 border-[#111111] max-w-4xl w-full flex flex-col shadow-none overflow-hidden max-h-[92vh] text-[#111111]">
        {/* Header */}
        <div className="h-12 border-b-2 border-[#111111] px-4 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-3">
            <Activity className="w-4 h-4 text-[#E30613]" />
            <h3 className="font-extrabold text-sm uppercase tracking-tight text-[#111111]">
              Spectral Slice / スペクトル断面分析 (Praat Burg & FFT)
            </h3>
            <span className="text-[10px] font-mono bg-[#111111] text-white px-2 py-0.5 font-bold uppercase tracking-wider">
              {sliceData ? `${sliceData.time.toFixed(3)}s` : '--'}
            </span>
            {selectedLabel && (
              <span className="text-xs font-mono font-bold text-[#E30613] bg-[#E30613]/10 px-2 py-0.5 border border-[#E30613]/20">
                /{selectedLabel}/
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadPng}
              className="flex items-center px-2.5 py-1 border border-[#111111] hover:bg-[#111111] hover:text-white text-xs font-mono uppercase tracking-wider font-bold transition-colors"
              title="グラフ画像を PNG で保存"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              PNG
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#111111] hover:text-white transition-colors border border-transparent hover:border-[#111111]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="px-4 py-2 border-b border-[#e0e0e6] bg-[#f9f9fb] flex flex-wrap items-center justify-between text-xs font-mono gap-2">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-[#64748b]">
              <input
                type="checkbox"
                checked={showFft}
                onChange={(e) => setShowFft(e.target.checked)}
                className="accent-[#64748b]"
              />
              <span>FFT Spectrum (倍音)</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-[#E30613]">
              <input
                type="checkbox"
                checked={showLpc}
                onChange={(e) => setShowLpc(e.target.checked)}
                className="accent-[#E30613]"
              />
              <span>LPC Envelope (声道共鳴)</span>
            </label>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            <div className="flex items-center space-x-1">
              <span className="text-[#777780]">Max Freq:</span>
              <select
                value={maxFreq}
                onChange={(e) => setMaxFreq(Number(e.target.value))}
                className="border border-[#111111] bg-white px-2 py-0.5 font-bold"
              >
                <option value={5000}>5000 Hz (母音標準)</option>
                <option value={8000}>8000 Hz (子音・摩擦音)</option>
                <option value={10000}>10000 Hz (広帯域全域)</option>
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-[#777780]">LPC Order:</span>
              <select
                value={lpcOrder}
                onChange={(e) => setLpcOrder(Number(e.target.value))}
                className="border border-[#111111] bg-white px-2 py-0.5 font-bold"
              >
                <option value={12}>12 (6極)</option>
                <option value={16}>16 (Praat標準 8極)</option>
                <option value={20}>20 (10極 高精細)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Canvas Plot */}
        <div ref={containerRef} className="flex-1 min-h-[360px] h-[380px] bg-white relative p-2 overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverCoord(null)}
            className={`cursor-crosshair block transition-opacity duration-100 ${
              isReady ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ width: '100%', height: '100%' }}
          />
          {hoverCoord && (
            <div
              className="absolute pointer-events-none bg-[#111111] text-white text-[10px] font-mono px-2 py-1 font-bold shadow"
              style={{
                left: Math.min(hoverCoord.x + 12, (containerRef.current?.clientWidth || 400) - 130),
                top: Math.max(hoverCoord.y - 25, 30),
              }}
            >
              {hoverCoord.freq} Hz / {hoverCoord.db} dB
            </div>
          )}
        </div>

        {/* Spectral Moments & Formants Footer */}
        <div className="p-3 border-t-2 border-[#111111] bg-[#f0f0f4] text-xs font-mono flex flex-wrap items-center justify-between gap-3">
          {sliceData?.moments ? (
            <div className="flex items-center space-x-4">
              <span className="font-bold text-[#111111] uppercase tracking-wider text-[10px]">
                Spectral Moments:
              </span>
              <span title="Centre of Gravity (重心周波数)">
                <span className="text-[#777780]">COG:</span>{' '}
                <strong className="text-[#111111]">{sliceData.moments.cog} Hz</strong>
              </span>
              <span title="Standard Deviation (標準偏差)">
                <span className="text-[#777780]">SD:</span>{' '}
                <strong className="text-[#111111]">{sliceData.moments.sd} Hz</strong>
              </span>
              <span title="Skewness (歪度)">
                <span className="text-[#777780]">Skew:</span>{' '}
                <strong className="text-[#111111]">{sliceData.moments.skewness}</strong>
              </span>
              <span title="Kurtosis (尖度)">
                <span className="text-[#777780]">Kurt:</span>{' '}
                <strong className="text-[#111111]">{sliceData.moments.kurtosis}</strong>
              </span>
            </div>
          ) : (
            <span className="text-[#777780] text-[11px]">
              カーソル位置の声道共鳴ピーク（フォルマント）と倍音構造
            </span>
          )}

          <div className="text-[10px] text-[#777780]">
            Praat-compatible Burg algorithm with FFT power spectrum
          </div>
        </div>
      </div>
    </div>
  );
};
