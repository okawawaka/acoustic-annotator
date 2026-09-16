'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { X, Download, User, Check, Layers, BarChart2, List } from 'lucide-react';
import { TextGridData, IntervalEntry, AcousticAnalysisData } from '@/types';
import { computeIntervalMetricsClient } from '@/lib/clientAudioAnalysis';

interface VowelSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  textGridData: TextGridData | null;
  analysisData: AcousticAnalysisData | null;
  initialMaxFormantFreq?: number;
  onSelectInterval?: (start: number, end: number) => void;
  onChangeMaxFormantFreq?: (freq: number) => void;
}

interface VowelPoint {
  id: string;
  label: string;
  vowelGroup: string;
  start: number;
  end: number;
  f1: number;
  f2: number;
  duration_ms: number;
  mean_f0: number | null;
}

interface VowelStat {
  group: string;
  color: string;
  count: number;
  meanF1: number;
  sdF1: number;
  meanF2: number;
  sdF2: number;
  meanF0: number | null;
  meanDur: number;
}

const VOWEL_COLORS: Record<string, { bg: string; text: string; fill: string; border: string }> = {
  i: { bg: '#eff6ff', text: '#1d4ed8', fill: 'rgba(37, 99, 235, 0.75)', border: '#2563eb' },
  e: { bg: '#ecfdf5', text: '#047857', fill: 'rgba(5, 150, 105, 0.75)', border: '#059669' },
  a: { bg: '#fef2f2', text: '#b91c1c', fill: 'rgba(220, 38, 38, 0.75)', border: '#dc2626' },
  o: { bg: '#fffbeb', text: '#b45309', fill: 'rgba(217, 119, 6, 0.75)', border: '#d97706' },
  u: { bg: '#f5f3ff', text: '#6d28d9', fill: 'rgba(124, 58, 237, 0.75)', border: '#7c3aed' },
  other: { bg: '#f8fafc', text: '#475569', fill: 'rgba(100, 116, 139, 0.75)', border: '#64748b' },
};

function normalizeVowel(label: string): { isVowel: boolean; group: string; display: string } {
  const clean = label.trim().toLowerCase().replace(/[:ː\d_]/g, '');
  
  if (['i', 'い', 'イ', 'ii', 'iy', 'ɪ'].includes(clean)) return { isVowel: true, group: 'i', display: '/i/' };
  if (['e', 'え', 'エ', 'ee', 'eh', 'ey', 'ɛ'].includes(clean)) return { isVowel: true, group: 'e', display: '/e/' };
  if (['a', 'あ', 'ア', 'aa', 'ah', 'ɑ', 'æ'].includes(clean)) return { isVowel: true, group: 'a', display: '/a/' };
  if (['o', 'お', 'オ', 'oo', 'ow', 'ɔ', 'ɒ'].includes(clean)) return { isVowel: true, group: 'o', display: '/o/' };
  if (['u', 'う', 'ウ', 'uu', 'uw', 'ɯ', 'ʊ', 'ʉ'].includes(clean)) return { isVowel: true, group: 'u', display: '/u/' };
  if (['ə', 'ʌ', 'ɜ', 'y', 'ø', 'œ'].includes(clean)) return { isVowel: true, group: 'other', display: `/${clean}/` };

  return { isVowel: false, group: 'other', display: label };
}

export const VowelSpaceModal: React.FC<VowelSpaceModalProps> = ({
  isOpen,
  onClose,
  textGridData,
  analysisData,
  initialMaxFormantFreq = 5500,
  onSelectInterval,
  onChangeMaxFormantFreq,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [maxFormantFreq, setMaxFormantFreq] = useState<number>(initialMaxFormantFreq);
  const [activeTab, setActiveTab] = useState<'summary' | 'tokens'>('summary');
  const [showPolygon, setShowPolygon] = useState(true);
  const [showTokens, setShowTokens] = useState(true);
  const [showCentroids, setShowCentroids] = useState(true);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  useEffect(() => {
    setMaxFormantFreq(initialMaxFormantFreq);
  }, [initialMaxFormantFreq]);

  // 全母音トークンの F1/F2/F0 を抽出
  const points: VowelPoint[] = useMemo(() => {
    if (!textGridData || !analysisData) return [];
    const collected: VowelPoint[] = [];

    textGridData.tiers.forEach((tier, tierIdx) => {
      if (tier.tier_type !== 'interval') return;
      (tier.entries as IntervalEntry[]).forEach((entry, entryIdx) => {
        const norm = normalizeVowel(entry.label);
        if (norm.isVowel) {
          const metrics = computeIntervalMetricsClient(analysisData, entry.start, entry.end);
          if (metrics.f1 && metrics.f2 && metrics.f1 > 100 && metrics.f2 > 300) {
            collected.push({
              id: `${tierIdx}_${entryIdx}_${entry.start}`,
              label: entry.label.trim(),
              vowelGroup: norm.group,
              start: entry.start,
              end: entry.end,
              f1: metrics.f1,
              f2: metrics.f2,
              duration_ms: metrics.duration_ms,
              mean_f0: metrics.mean_f0,
            });
          }
        }
      });
    });

    return collected;
  }, [textGridData, analysisData]);

  // 母音ごとの統計量（平均、標準偏差、トークン数）の集計
  const stats: VowelStat[] = useMemo(() => {
    const groups: Record<string, VowelPoint[]> = {};
    for (const p of points) {
      if (!groups[p.vowelGroup]) groups[p.vowelGroup] = [];
      groups[p.vowelGroup].push(p);
    }

    const order = ['i', 'e', 'a', 'o', 'u', 'other'];
    const result: VowelStat[] = [];

    for (const grp of order) {
      const list = groups[grp];
      if (!list || list.length === 0) continue;

      const count = list.length;
      const f1Sum = list.reduce((a, b) => a + b.f1, 0);
      const f2Sum = list.reduce((a, b) => a + b.f2, 0);
      const meanF1 = f1Sum / count;
      const meanF2 = f2Sum / count;

      const varF1 = list.reduce((a, b) => a + Math.pow(b.f1 - meanF1, 2), 0) / count;
      const varF2 = list.reduce((a, b) => a + Math.pow(b.f2 - meanF2, 2), 0) / count;
      const sdF1 = Math.sqrt(varF1);
      const sdF2 = Math.sqrt(varF2);

      const f0List = list.filter((p) => p.mean_f0 !== null).map((p) => p.mean_f0!);
      const meanF0 = f0List.length > 0 ? f0List.reduce((a, b) => a + b, 0) / f0List.length : null;

      const durSum = list.reduce((a, b) => a + b.duration_ms, 0);
      const meanDur = durSum / count;

      result.push({
        group: grp,
        color: VOWEL_COLORS[grp]?.border || '#64748b',
        count,
        meanF1: Math.round(meanF1 * 10) / 10,
        sdF1: Math.round(sdF1 * 10) / 10,
        meanF2: Math.round(meanF2 * 10) / 10,
        sdF2: Math.round(sdF2 * 10) / 10,
        meanF0: meanF0 ? Math.round(meanF0 * 10) / 10 : null,
        meanDur: Math.round(meanDur * 10) / 10,
      });
    }

    return result;
  }, [points]);

  // 高解像度 (Retina / 4K) キャンバス描画
  const renderChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = 480;
    const cssHeight = 400;

    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    ctx.scale(dpr, dpr);

    const w = cssWidth;
    const h = cssHeight;
    const padLeft = 52;
    const padRight = 24;
    const padTop = 24;
    const padBottom = 45;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // 音声学の標準軸範囲
    const minF1 = 150;
    const maxF1 = 1100;
    const minF2 = 600;
    const maxF2 = 3000;

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // F2: 左側が高周波数 (3000Hz 前舌) → 右側が低周波数 (600Hz 後舌)
    const toX = (f2: number) => padLeft + ((maxF2 - f2) / (maxF2 - minF2)) * plotW;
    // F1: 上側が低周波数 (150Hz 狭母音) → 下側が高周波数 (1100Hz 広母音)
    const toY = (f1: number) => padTop + ((f1 - minF1) / (maxF1 - minF1)) * plotH;

    // 1. 背景グリッドと目盛り
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;

    // F2 vertical grid lines
    for (let f2 = 1000; f2 <= 2500; f2 += 500) {
      const x = toX(f2);
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.stroke();

      ctx.font = '10px monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.fillText(String(f2), x, padTop + plotH + 16);
    }

    // F1 horizontal grid lines
    for (let f1 = 300; f1 <= 900; f1 += 200) {
      const y = toY(f1);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();

      ctx.font = '10px monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(String(f1), padLeft - 8, y + 3);
    }

    // 外枠
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    // 軸ラベル
    ctx.font = '500 11px sans-serif';
    ctx.fillStyle = '#334155';
    ctx.textAlign = 'center';
    ctx.fillText('F2 (Hz)  ← 前舌 [Front]       後舌 [Back] →', padLeft + plotW / 2, h - 10);

    ctx.save();
    ctx.translate(16, padTop + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('F1 (Hz)  ← 高・狭 [High]       低・広 [Low] →', 0, 0);
    ctx.restore();

    // クリッピング領域を設定（枠外への描画はみ出し防止）
    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop, plotW, plotH);
    ctx.clip();

    // 2. 母音四辺形 / 多角形 (Vowel Quadrilateral Polygon)
    if (showPolygon) {
      const centroidMap: Record<string, { x: number; y: number }> = {};
      stats.forEach((st) => {
        if (['i', 'e', 'a', 'o', 'u'].includes(st.group)) {
          centroidMap[st.group] = { x: toX(st.meanF2), y: toY(st.meanF1) };
        }
      });

      const order = ['i', 'e', 'a', 'o', 'u'];
      const validPoints = order.map((g) => centroidMap[g]).filter(Boolean);

      if (validPoints.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(validPoints[0].x, validPoints[0].y);
        for (let i = 1; i < validPoints.length; i++) {
          ctx.lineTo(validPoints[i].x, validPoints[i].y);
        }
        ctx.closePath();

        ctx.fillStyle = 'rgba(59, 130, 246, 0.06)';
        ctx.fill();

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 3. 個別トークンプロット
    if (showTokens) {
      points.forEach((p) => {
        const x = toX(p.f2);
        const y = toY(p.f1);
        const col = VOWEL_COLORS[p.vowelGroup] || VOWEL_COLORS.other;
        const isHovered = p.id === hoveredPointId;

        ctx.beginPath();
        ctx.arc(x, y, isHovered ? 6 : 4, 0, 2 * Math.PI);
        ctx.fillStyle = isHovered ? '#1e40af' : col.fill;
        ctx.fill();

        ctx.strokeStyle = isHovered ? '#ffffff' : col.border;
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();
      });
    }

    // 4. 母音中心点 (Centroids / Means)
    if (showCentroids) {
      stats.forEach((st) => {
        const x = toX(st.meanF2);
        const y = toY(st.meanF1);
        const col = VOWEL_COLORS[st.group] || VOWEL_COLORS.other;

        // 中心バッジ
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, 2 * Math.PI);
        ctx.fillStyle = col.border;
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(st.group.toUpperCase(), x, y + 3.5);
      });
    }

    ctx.restore(); // クリッピング解除
  }, [points, stats, showPolygon, showTokens, showCentroids, hoveredPointId]);

  useEffect(() => {
    if (isOpen) {
      renderChart();
    }
  }, [isOpen, renderChart]);

  // CSV エクスポート
  const handleExportCSV = () => {
    if (points.length === 0) return;

    let csvContent = '=== VOWEL SUMMARY STATISTICS ===\n';
    csvContent += 'Vowel,Count,Mean_F1(Hz),SD_F1(Hz),Mean_F2(Hz),SD_F2(Hz),Mean_F0(Hz),Mean_Duration(ms)\n';
    stats.forEach((st) => {
      csvContent += `${st.group.toUpperCase()},${st.count},${st.meanF1},${st.sdF1},${st.meanF2},${st.sdF2},${st.meanF0 || ''},${st.meanDur}\n`;
    });

    csvContent += '\n=== ALL TOKEN MEASUREMENTS ===\n';
    csvContent += 'ID,Label,VowelGroup,Start(s),End(s),Duration(ms),F1(Hz),F2(Hz),Mean_F0(Hz),LPC_MaxFormant(Hz)\n';
    points.forEach((p, idx) => {
      csvContent += `${idx + 1},${p.label},${p.vowelGroup},${p.start.toFixed(3)},${p.end.toFixed(3)},${p.duration_ms.toFixed(1)},${p.f1.toFixed(1)},${p.f2.toFixed(1)},${p.mean_f0 ? p.mean_f0.toFixed(1) : ''},${maxFormantFreq}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vowel_space_metrics_${maxFormantFreq}Hz.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-300 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-gray-900">
        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-white flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
              <span>F1-F2 母音空間プロット & 音響統計</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono font-normal">
                {points.length} トークン検出
              </span>
            </h2>
            <p className="text-[11px] text-gray-500">
              TextGrid内の各母音区間からフォルマント中央値を自動抽出し、音響母音四辺形および統計表を生成
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex-1 overflow-y-auto flex flex-col lg:flex-row gap-5">
          {/* Left: Publication Quality Chart */}
          <div className="flex-1 flex flex-col items-center">
            <div className="border border-gray-200 rounded-lg p-2 bg-white shadow-xs">
              <canvas ref={canvasRef} className="block" />
            </div>

            {/* Chart Display Controls */}
            <div className="flex flex-wrap items-center justify-between w-full max-w-[480px] mt-3 gap-2 text-xs">
              <div className="flex items-center space-x-3 bg-gray-50 px-2.5 py-1.5 rounded border border-gray-200">
                <label className="flex items-center space-x-1 cursor-pointer text-gray-700">
                  <input
                    type="checkbox"
                    checked={showPolygon}
                    onChange={(e) => setShowPolygon(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-0"
                  />
                  <span className="text-[11px] font-medium">母音四辺形</span>
                </label>
                <label className="flex items-center space-x-1 cursor-pointer text-gray-700">
                  <input
                    type="checkbox"
                    checked={showCentroids}
                    onChange={(e) => setShowCentroids(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-0"
                  />
                  <span className="text-[11px] font-medium">平均中心点</span>
                </label>
                <label className="flex items-center space-x-1 cursor-pointer text-gray-700">
                  <input
                    type="checkbox"
                    checked={showTokens}
                    onChange={(e) => setShowTokens(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-0"
                  />
                  <span className="text-[11px] font-medium">個別点</span>
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                  <select
                    value={maxFormantFreq}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setMaxFormantFreq(val);
                      if (onChangeMaxFormantFreq) onChangeMaxFormantFreq(val);
                    }}
                    className="bg-transparent text-[11px] font-semibold text-gray-800 outline-none cursor-pointer"
                  >
                    <option value="5500">成人女性 (5500 Hz)</option>
                    <option value="5000">成人男性 (5000 Hz)</option>
                    <option value="6000">子供 (6000 Hz)</option>
                  </select>
                </div>

                <button
                  onClick={handleExportCSV}
                  disabled={points.length === 0}
                  className="flex items-center text-[11px] px-2.5 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium disabled:opacity-40 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  CSV出力
                </button>
              </div>
            </div>
          </div>

          {/* Right: Clean, Structured Tabular Data Panel */}
          <div className="w-full lg:w-[420px] flex flex-col border border-gray-200 rounded-lg overflow-hidden text-xs bg-white shadow-xs">
            {/* Table Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/80 px-2 pt-1.5 flex-shrink-0">
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('summary')}
                  className={`flex items-center space-x-1 py-1.5 px-3 rounded-t text-xs font-semibold border-t border-l border-r transition-colors ${
                    activeTab === 'summary'
                      ? 'bg-white border-gray-200 text-blue-700 -mb-px'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>母音別要約 ({stats.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tokens')}
                  className={`flex items-center space-x-1 py-1.5 px-3 rounded-t text-xs font-semibold border-t border-l border-r transition-colors ${
                    activeTab === 'tokens'
                      ? 'bg-white border-gray-200 text-blue-700 -mb-px'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>全トークン ({points.length})</span>
                </button>
              </div>
              <span className="font-mono text-[10px] text-gray-500 pb-1 pr-1">
                LPC {maxFormantFreq}Hz
              </span>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto max-h-[440px] p-2 bg-white">
              {activeTab === 'summary' ? (
                /* Tab 1: Summary Table */
                stats.length > 0 ? (
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 text-[11px] text-gray-500 font-medium">
                        <th className="py-2 px-2 text-left">母音</th>
                        <th className="py-2 px-1 text-right">数(N)</th>
                        <th className="py-2 px-2 text-right">F1 平均 (SD)</th>
                        <th className="py-2 px-2 text-right">F2 平均 (SD)</th>
                        <th className="py-2 px-1 text-right">F0</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                      {stats.map((st) => {
                        const col = VOWEL_COLORS[st.group] || VOWEL_COLORS.other;
                        return (
                          <tr key={st.group} className="hover:bg-gray-50 transition-colors">
                            <td className="py-2 px-2 font-sans font-bold flex items-center space-x-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: col.border }}
                              />
                              <span className="text-gray-900">/{st.group.toUpperCase()}/</span>
                            </td>
                            <td className="py-2 px-1 text-right text-gray-600">{st.count}</td>
                            <td className="py-2 px-2 text-right text-gray-900">
                              <span className="font-semibold">{st.meanF1.toFixed(0)}</span>
                              <span className="text-[10px] text-gray-600 ml-1">±{st.sdF1.toFixed(0)}</span>
                            </td>
                            <td className="py-2 px-2 text-right text-gray-900">
                              <span className="font-semibold">{st.meanF2.toFixed(0)}</span>
                              <span className="text-[10px] text-gray-600 ml-1">±{st.sdF2.toFixed(0)}</span>
                            </td>
                            <td className="py-2 px-1 text-right text-gray-600">
                              {st.meanF0 ? st.meanF0.toFixed(0) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 font-semibold text-[11px] text-gray-700 bg-gray-50/50">
                        <td className="py-2 px-2">合計</td>
                        <td className="py-2 px-1 text-right font-mono">{points.length}</td>
                        <td colSpan={3} className="py-2 px-2 text-right font-sans text-[10px] text-gray-600">
                          単位: Hz (周波数)
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <div className="p-8 text-center text-gray-600 text-xs">
                    母音区間（a, i, u, e, o など）が検出されませんでした。
                  </div>
                )
              ) : (
                /* Tab 2: Individual Token Table */
                points.length > 0 ? (
                  <table className="w-full border-collapse font-mono text-[11px]">
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 text-gray-600 text-[10px]">
                      <tr>
                        <th className="py-1.5 px-1.5 text-left font-sans">音</th>
                        <th className="py-1.5 px-1 text-right">F1</th>
                        <th className="py-1.5 px-1 text-right">F2</th>
                        <th className="py-1.5 px-1 text-right">F0</th>
                        <th className="py-1.5 px-1 text-right">ms</th>
                        <th className="py-1.5 px-1 text-right">区間(s)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {points.map((p, idx) => {
                        const isHovered = p.id === hoveredPointId;
                        return (
                          <tr
                            key={p.id}
                            onMouseEnter={() => setHoveredPointId(p.id)}
                            onMouseLeave={() => setHoveredPointId(null)}
                            onClick={() => {
                              if (onSelectInterval) onSelectInterval(p.start, p.end);
                              onClose();
                            }}
                            className={`cursor-pointer transition-colors ${
                              isHovered ? 'bg-blue-100/70 text-blue-900' : 'hover:bg-blue-50'
                            }`}
                            title="クリックしてエディタでこの区間に移動"
                          >
                            <td className="py-1.5 px-1.5 font-bold text-gray-900 font-sans">
                              /{p.label}/
                            </td>
                            <td className="py-1.5 px-1 text-right font-medium text-gray-900">
                              {p.f1.toFixed(0)}
                            </td>
                            <td className="py-1.5 px-1 text-right font-medium text-gray-900">
                              {p.f2.toFixed(0)}
                            </td>
                            <td className="py-1.5 px-1 text-right text-gray-600">
                              {p.mean_f0 ? p.mean_f0.toFixed(0) : '-'}
                            </td>
                            <td className="py-1.5 px-1 text-right text-gray-600">
                              {p.duration_ms.toFixed(0)}
                            </td>
                            <td className="py-1.5 px-1 text-right text-gray-600 text-[10px]">
                              {p.start.toFixed(2)}-{p.end.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-gray-600 text-xs">
                    母音区間がありません。
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
