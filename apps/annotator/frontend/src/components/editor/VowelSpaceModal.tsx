'use client';

import React, { useRef, useEffect, useState } from 'react';
import { X, Download, RefreshCw, User } from 'lucide-react';
import { TextGridData, IntervalEntry } from '@/types';
import { fetchIntervalMetrics } from '@/lib/api';

interface VowelSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioId: string | null;
  textGridData: TextGridData | null;
  initialMaxFormantFreq?: number;
  onSelectInterval?: (start: number, end: number) => void;
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

export const VowelSpaceModal: React.FC<VowelSpaceModalProps> = ({
  isOpen,
  onClose,
  audioId,
  textGridData,
  initialMaxFormantFreq = 5500,
  onSelectInterval,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [points, setPoints] = useState<VowelPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [maxFormantFreq, setMaxFormantFreq] = useState<number>(initialMaxFormantFreq);

  useEffect(() => {
    setMaxFormantFreq(initialMaxFormantFreq);
  }, [initialMaxFormantFreq]);

  const isVowel = (label: string): boolean => {
    const clean = label.trim().toLowerCase();
    const vowels = new Set([
      'a', 'i', 'u', 'e', 'o',
      'あ', 'い', 'う', 'え', 'お',
      'ア', 'イ', 'ウ', 'エ', 'オ',
      'æ', 'ɑ', 'ɒ', 'ɔ', 'ɛ', 'ɜ', 'ɪ', 'i:', 'u:', 'ʊ', 'ʌ', 'ə'
    ]);
    return vowels.has(clean);
  };

  const extractAllVowels = async (freq = maxFormantFreq) => {
    if (!audioId || !textGridData) return;
    setIsLoading(true);
    const collected: VowelPoint[] = [];

    for (const tier of textGridData.tiers) {
      if (tier.tier_type !== 'interval') continue;
      for (const entry of tier.entries as IntervalEntry[]) {
        const lbl = entry.label.trim();
        if (lbl && isVowel(lbl)) {
          try {
            const metrics = await fetchIntervalMetrics(audioId, entry.start, entry.end, freq);
            if (metrics.f1 && metrics.f2) {
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
          } catch (e) {
            console.warn('Failed to extract metrics for', lbl, e);
          }
        }
      }
    }

    setPoints(collected);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen && audioId && textGridData) {
      extractAllVowels(maxFormantFreq);
    }
  }, [isOpen, audioId, textGridData, maxFormantFreq]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const pad = 45;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const minF1 = 200, maxF1 = 1000;
    const minF2 = 500, maxF2 = 3000;

    const toX = (f2: number) => pad + ((maxF2 - f2) / (maxF2 - minF2)) * (w - pad * 2);
    const toY = (f1: number) => pad + ((f1 - minF1) / (maxF1 - minF1)) * (h - pad * 2);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';

    for (let f2 = 1000; f2 <= 2500; f2 += 500) {
      const x = toX(f2);
      ctx.beginPath();
      ctx.setLineDash([2, 2]);
      ctx.moveTo(x, pad);
      ctx.lineTo(x, h - pad);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(String(f2), x, h - pad + 15);
    }

    for (let f1 = 300; f1 <= 900; f1 += 200) {
      const y = toY(f1);
      ctx.beginPath();
      ctx.setLineDash([2, 2]);
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(String(f1), pad - 6, y + 3);
    }
    ctx.setLineDash([]);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.fillText('F2 (Hz) ← 前舌 [Front]   /   後舌 [Back] →', w / 2, h - 8);

    ctx.save();
    ctx.translate(14, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('F1 (Hz) ← 狭・高母音 [High]   /   広・低母音 [Low] →', 0, 0);
    ctx.restore();

    points.forEach((p) => {
      const x = toX(p.f2);
      const y = toY(p.f1);

      ctx.fillStyle = 'rgba(37, 99, 235, 0.2)';
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, x, y + 4);
    });
  }, [points]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-900">F1-F2 母音空間プロット (Vowel Space Chart)</h2>
            <p className="text-[11px] text-gray-500">TextGrid内の母音区間からフォルマント中央値を自動抽出し、音響母音四辺形を描画</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex flex-col items-center">
            <div className="border border-gray-200 rounded p-2 bg-white shadow-sm">
              <canvas ref={canvasRef} width={460} height={380} className="block" />
            </div>

            {/* Controls Toolbar under Canvas */}
            <div className="flex flex-wrap items-center justify-between w-full max-w-[460px] mt-3 gap-2">
              {/* 話者・声道長プリセット切替 */}
              <div className="flex items-center space-x-1.5 border border-gray-300 rounded px-2 py-1 bg-gray-50 text-xs">
                <User className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-gray-600 font-medium">話者設定:</span>
                <select
                  value={maxFormantFreq}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setMaxFormantFreq(val);
                    extractAllVowels(val);
                  }}
                  className="bg-white px-1.5 py-0.5 rounded border border-gray-300 font-semibold text-gray-900 outline-none cursor-pointer"
                >
                  <option value="5500">成人女性 (5500 Hz)</option>
                  <option value="5000">成人男性 (5000 Hz)</option>
                  <option value="6000">子供 (6000 Hz)</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => extractAllVowels(maxFormantFreq)}
                  disabled={isLoading}
                  className="flex items-center text-xs px-2.5 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  再計算
                </button>
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
          </div>

          <div className="w-full md:w-72 flex flex-col border border-gray-200 rounded overflow-hidden text-xs">
            <div className="bg-gray-50 px-3 py-2 font-semibold text-gray-700 border-b border-gray-200 flex justify-between">
              <span>計測母音一覧 ({points.length}件)</span>
              <span className="font-mono text-[10px] text-gray-500">LPC {maxFormantFreq}Hz</span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[380px]">
              {points.length > 0 ? (
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 text-gray-500">
                    <tr>
                      <th className="p-1.5">音</th>
                      <th className="p-1.5">F1</th>
                      <th className="p-1.5">F2</th>
                      <th className="p-1.5">ms</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {points.map((p, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-blue-50 cursor-pointer"
                        onClick={() => {
                          if (onSelectInterval) onSelectInterval(p.start, p.end);
                          onClose();
                        }}
                        title="クリックして該当区間に移動"
                      >
                        <td className="p-1.5 font-bold text-blue-700">/{p.label}/</td>
                        <td className="p-1.5">{p.f1.toFixed(0)}</td>
                        <td className="p-1.5">{p.f2.toFixed(0)}</td>
                        <td className="p-1.5">{p.duration_ms.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center text-gray-400 text-xs">
                  {isLoading ? '解析中...' : '母音区間（a, i, u, e, o など）が検出されませんでした。'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
