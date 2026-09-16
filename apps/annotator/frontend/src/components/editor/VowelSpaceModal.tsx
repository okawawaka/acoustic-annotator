'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { X, Download, User } from 'lucide-react';
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
  label: string;
  start: number;
  end: number;
  f1: number;
  f2: number;
  duration_ms: number;
  mean_f0: number | null;
}

const VOWEL_COLORS: Record<string, string> = {
  i: '#2563eb', // 青
  e: '#059669', // 緑
  a: '#dc2626', // 赤
  o: '#d97706', // 橙
  u: '#7c3aed', // 紫
};

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

  useEffect(() => {
    setMaxFormantFreq(initialMaxFormantFreq);
  }, [initialMaxFormantFreq]);

  // 母音判定（日本語かな・ローマ字・IPA対応）
  const isVowel = (label: string): boolean => {
    const clean = label.trim().toLowerCase().replace(/[:ː\d_\s\/\[\]]/g, '');
    const vowels = new Set([
      'a', 'i', 'u', 'e', 'o',
      'あ', 'い', 'う', 'え', 'お',
      'ア', 'イ', 'ウ', 'エ', 'オ',
      'ɯ', 'æ', 'ɑ', 'ɒ', 'ɔ', 'ɛ', 'ɜ', 'ɪ', 'ʊ', 'ʌ', 'ə'
    ]);
    return vowels.has(clean);
  };

  const getVowelGroup = (label: string): string => {
    const clean = label.trim().toLowerCase().replace(/[:ː\d_\s\/\[\]]/g, '');
    if (['i', 'い', 'イ', 'ɪ'].includes(clean)) return 'i';
    if (['e', 'え', 'エ', 'ɛ'].includes(clean)) return 'e';
    if (['a', 'あ', 'ア', 'ɑ', 'æ'].includes(clean)) return 'a';
    if (['o', 'お', 'オ', 'ɔ'].includes(clean)) return 'o';
    if (['u', 'う', 'ウ', 'ɯ', 'ʊ'].includes(clean)) return 'u';
    return 'a';
  };

  // 全母音トークンの F1/F2 を抽出
  const points: VowelPoint[] = useMemo(() => {
    if (!textGridData || !analysisData) return [];
    const collected: VowelPoint[] = [];

    for (const tier of textGridData.tiers) {
      if (tier.tier_type !== 'interval') continue;
      for (const entry of tier.entries as IntervalEntry[]) {
        const lbl = entry.label.trim();
        if (lbl && isVowel(lbl)) {
          const metrics = computeIntervalMetricsClient(analysisData, entry.start, entry.end);
          if (metrics.f1 && metrics.f2) {
            // 音声学的物理整合性チェック（非母音・無声音・ノイズ外れ値の排除）
            if (
              metrics.f1 >= 200 &&
              metrics.f1 <= 1250 &&
              metrics.f2 >= 600 &&
              metrics.f2 <= 3200 &&
              metrics.f2 > metrics.f1 + 150
            ) {
              collected.push({
                label: lbl,
                start: entry.start,
                end: entry.end,
                f1: metrics.f1,
                f2: metrics.f2,
                duration_ms: metrics.duration_ms,
                mean_f0: metrics.mean_f0,
              });
            }
          }
        }
      }
    }
    return collected;
  }, [textGridData, analysisData]);

  // モーダルが開いた際およびデータ変更時に確実にキャンバスを描画
  useEffect(() => {
    if (!isOpen) return;

    // DOMマウント直後に確実に描画するため requestAnimationFrame を使用
    const timer = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const cssW = 460;
      const cssH = 400;

      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;

      ctx.scale(dpr, dpr);

      const w = cssW;
      const h = cssH;
      const pad = 44;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      // 母音のF1/F2が収まりきらない問題を解消するため、データに合わせて表示範囲を柔軟に決定
      let minF1 = 200;
      let maxF1 = 1200; // 女性・子供の広母音(開母音)や高F1母音もゆったり収まる1200Hzを基準値に
      let minF2 = 500;
      let maxF2 = 3000;

      if (points.length > 0) {
        const rawMaxF1 = Math.max(...points.map((p) => p.f1));
        const rawMinF1 = Math.min(...points.map((p) => p.f1));
        const rawMaxF2 = Math.max(...points.map((p) => p.f2));
        const rawMinF2 = Math.min(...points.map((p) => p.f2));

        // F1が上限に収まるようにマージンを確保
        if (rawMaxF1 > maxF1 - 100) {
          maxF1 = Math.ceil((rawMaxF1 + 150) / 100) * 100;
        }
        if (rawMinF1 < minF1) {
          minF1 = Math.max(100, Math.floor((rawMinF1 - 50) / 100) * 100);
        }

        // F2もデータが端に寄りすぎないよう調整
        if (rawMaxF2 > maxF2 - 150) {
          maxF2 = Math.ceil((rawMaxF2 + 200) / 500) * 500;
        }
        if (rawMinF2 < minF2) {
          minF2 = Math.max(400, Math.floor((rawMinF2 - 100) / 500) * 500);
        }
      }

      const toX = (f2: number) => pad + ((maxF2 - f2) / (maxF2 - minF2)) * (w - pad * 2);
      const toY = (f1: number) => pad + ((f1 - minF1) / (maxF1 - minF1)) * (h - pad * 2);

      // 外枠
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

      // グリッド線と目盛り
      ctx.font = '10px monospace';
      ctx.fillStyle = '#64748b';

      for (let f2 = Math.ceil((minF2 + 100) / 500) * 500; f2 < maxF2; f2 += 500) {
        const x = toX(f2);
        ctx.beginPath();
        ctx.strokeStyle = '#e2e8f0';
        ctx.setLineDash([2, 2]);
        ctx.moveTo(x, pad);
        ctx.lineTo(x, h - pad);
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillText(String(f2), x, h - pad + 15);
      }

      for (let f1 = Math.ceil((minF1 + 50) / 200) * 200; f1 < maxF1; f1 += 200) {
        const y = toY(f1);
        ctx.beginPath();
        ctx.strokeStyle = '#e2e8f0';
        ctx.setLineDash([2, 2]);
        ctx.moveTo(pad, y);
        ctx.lineTo(w - pad, y);
        ctx.stroke();
        ctx.textAlign = 'right';
        ctx.fillText(String(f1), pad - 6, y + 3);
      }
      ctx.setLineDash([]);

      // 軸ラベル
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.fillText('F2 (Hz) ← 前舌 [Front]   /   後舌 [Back] →', w / 2, h - 8);

      ctx.save();
      ctx.translate(14, h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('F1 (Hz) ← 狭・高母音 [High]   /   広・低母音 [Low] →', 0, 0);
      ctx.restore();

      // 母音プロット（クリッピングして枠外のはみ出しを防止）
      ctx.save();
      ctx.beginPath();
      ctx.rect(pad, pad, w - pad * 2, h - pad * 2);
      ctx.clip();

      if (points.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('母音区間（a, i, u, e, o 等）が未検出です', w / 2, h / 2);
      } else {
        points.forEach((p) => {
          const x = toX(p.f2);
          const y = toY(p.f1);
          const grp = getVowelGroup(p.label);
          const col = VOWEL_COLORS[grp] || '#2563eb';

          ctx.fillStyle = col + '33'; // 半透明
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, 2 * Math.PI);
          ctx.fill();

          ctx.strokeStyle = col;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = col;
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(p.label, x, y + 4);
        });
      }

      ctx.restore();
    });

    return () => cancelAnimationFrame(timer);
  }, [isOpen, points, maxFormantFreq]);

  const handleExportCSV = () => {
    if (points.length === 0) return;
    const headers = ['Label', 'Start(s)', 'End(s)', 'Duration(ms)', 'F1(Hz)', 'F2(Hz)', 'Mean_F0(Hz)', 'LPC_MaxFormant(Hz)'];
    const rows = points.map((p) => [
      p.label,
      p.start.toFixed(3),
      p.end.toFixed(3),
      p.duration_ms.toFixed(1),
      p.f1.toFixed(1),
      p.f2.toFixed(1),
      p.mean_f0 ? p.mean_f0.toFixed(1) : '',
      String(maxFormantFreq),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vowel_formants_${maxFormantFreq}Hz.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-gray-900">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">F1-F2 母音空間プロット (Vowel Space Chart)</h2>
            <p className="text-[11px] text-gray-500">TextGrid内の母音区間からフォルマント中央値を自動抽出し、音響母音四辺形を描画</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto flex flex-col md:flex-row gap-4">
          {/* Chart Canvas */}
          <div className="flex-1 flex flex-col items-center">
            <div className="border border-gray-200 rounded p-2 bg-white shadow-xs">
              <canvas ref={canvasRef} className="block" />
            </div>

            <div className="flex flex-wrap items-center justify-between w-full max-w-[460px] mt-3 gap-2">
              <div className="flex items-center space-x-1.5 border border-gray-300 rounded px-2 py-1 bg-gray-50 text-xs">
                <User className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-gray-600 font-medium">話者設定:</span>
                <select
                  value={maxFormantFreq}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setMaxFormantFreq(val);
                    if (onChangeMaxFormantFreq) onChangeMaxFormantFreq(val);
                  }}
                  className="bg-white px-1.5 py-0.5 rounded border border-gray-300 font-semibold text-gray-900 outline-none cursor-pointer"
                >
                  <option value="5500">成人女性 (5500 Hz)</option>
                  <option value="5000">成人男性 (5000 Hz)</option>
                  <option value="6000">子供 (6000 Hz)</option>
                </select>
              </div>

              <button
                onClick={handleExportCSV}
                disabled={points.length === 0}
                className="flex items-center text-xs px-2.5 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                CSV出力
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="w-full md:w-80 flex flex-col border border-gray-200 rounded overflow-hidden text-xs">
            <div className="bg-gray-50 px-3 py-2 font-semibold text-gray-700 border-b border-gray-200 flex justify-between">
              <span>計測母音一覧 ({points.length}件)</span>
              <span className="font-mono text-[10px] text-gray-500">LPC {maxFormantFreq}Hz</span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px]">
              {points.length > 0 ? (
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 text-gray-500 text-[10px]">
                    <tr>
                      <th className="py-2 px-2 text-left font-sans">音</th>
                      <th className="py-2 px-2 text-right">F1 (Hz)</th>
                      <th className="py-2 px-2 text-right">F2 (Hz)</th>
                      <th className="py-2 px-2 text-right">時間(ms)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {points.map((p, idx) => {
                      const grp = getVowelGroup(p.label);
                      const col = VOWEL_COLORS[grp] || '#2563eb';
                      return (
                        <tr
                          key={idx}
                          className="hover:bg-blue-50 cursor-pointer transition-colors"
                          onClick={() => {
                            if (onSelectInterval) onSelectInterval(p.start, p.end);
                            onClose();
                          }}
                          title="クリックして該当区間に移動"
                        >
                          <td className="py-2 px-2 font-bold font-sans flex items-center space-x-1">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: col }} />
                            <span>/{p.label}/</span>
                          </td>
                          <td className="py-2 px-2 text-right text-gray-900 font-medium">{p.f1.toFixed(0)}</td>
                          <td className="py-2 px-2 text-right text-gray-900 font-medium">{p.f2.toFixed(0)}</td>
                          <td className="py-2 px-2 text-right text-gray-500">{p.duration_ms.toFixed(0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-gray-400 text-xs">
                  母音区間（a, i, u, e, o など）が検出されませんでした。
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
