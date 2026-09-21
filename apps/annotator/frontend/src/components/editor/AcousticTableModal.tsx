'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  X,
  Download,
  Copy,
  Search,
  Check,
  Play,
  Table as TableIcon,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import { TextGridData, AcousticAnalysisData, IntervalEntry } from '@/types';
import { computeIntervalMetricsClient } from '@/lib/clientAudioAnalysis';
import {
  formatTableRowsToTSV,
  formatTableRowsToCSV,
  downloadBlobFile,
} from '@/lib/exportUtils';

export interface IntervalRowData {
  id: string;
  tierIndex: number;
  tierName: string;
  label: string;
  start: number;
  end: number;
  durationMs: number;
  meanF0: number | null;
  minF0: number | null;
  maxF0: number | null;
  f1: number | null;
  f2: number | null;
  f3: number | null;
  meanIntensity: number | null;
  cog: number | null;
}

interface AcousticTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  textGridData: TextGridData | null;
  analysisData: AcousticAnalysisData | null;
  audioBuffer: AudioBuffer | null;
  onSelectInterval?: (start: number, end: number, label?: string) => void;
  onPlayRange?: (start: number, end: number) => void;
}

export const AcousticTableModal: React.FC<AcousticTableModalProps> = ({
  isOpen,
  onClose,
  textGridData,
  analysisData,
  audioBuffer,
  onSelectInterval,
  onPlayRange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [excludeEmpty, setExcludeEmpty] = useState(true);
  const [selectedTierName, setSelectedTierName] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [sortKey, setSortKey] = useState<keyof IntervalRowData>('start');
  const [sortAsc, setSortAsc] = useState(true);

  // Compute metrics for all interval entries across tiers
  const allRows: IntervalRowData[] = useMemo(() => {
    if (!textGridData || !analysisData || !audioBuffer) return [];

    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const rows: IntervalRowData[] = [];

    textGridData.tiers.forEach((tier, tIdx) => {
      if (tier.tier_type !== 'interval') return;

      (tier.entries as IntervalEntry[]).forEach((entry, eIdx) => {
        const dur = (entry.end - entry.start) * 1000;
        // Compute metrics only if duration > 15ms
        let metrics = null;
        if (entry.end - entry.start >= 0.015) {
          metrics = computeIntervalMetricsClient(
            analysisData,
            entry.start,
            entry.end,
            channelData,
            sampleRate
          );
        }

        rows.push({
          id: `${tIdx}-${eIdx}-${entry.start}`,
          tierIndex: tIdx,
          tierName: tier.name,
          label: entry.label || '',
          start: entry.start,
          end: entry.end,
          durationMs: metrics ? metrics.duration_ms : dur,
          meanF0: metrics?.mean_f0 ?? null,
          minF0: metrics?.min_f0 ?? null,
          maxF0: metrics?.max_f0 ?? null,
          f1: metrics?.f1 ?? null,
          f2: metrics?.f2 ?? null,
          f3: metrics?.f3 ?? null,
          meanIntensity: metrics?.mean_intensity ?? null,
          cog: metrics?.spectral_moments?.cog ?? null,
        });
      });
    });

    return rows;
  }, [textGridData, analysisData, audioBuffer]);

  // Unique tier names for dropdown
  const tierNames = useMemo(() => {
    if (!textGridData) return [];
    return textGridData.tiers
      .filter((t) => t.tier_type === 'interval')
      .map((t) => t.name);
  }, [textGridData]);

  // Filter and sort rows
  const filteredRows = useMemo(() => {
    let list = allRows;

    if (excludeEmpty) {
      list = list.filter((r) => r.label.trim() !== '');
    }

    if (selectedTierName !== 'all') {
      list = list.filter((r) => r.tierName === selectedTierName);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (r) => r.label.toLowerCase().includes(q) || r.tierName.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === null || valA === undefined) return sortAsc ? 1 : -1;
      if (valB === null || valB === undefined) return sortAsc ? -1 : 1;
      if (typeof valA === 'string') {
        return sortAsc
          ? valA.localeCompare(valB as string)
          : (valB as string).localeCompare(valA);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [allRows, excludeEmpty, selectedTierName, searchTerm, sortKey, sortAsc]);

  const handleSort = (key: keyof IntervalRowData) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  // Copy TSV to clipboard
  const handleCopyTSV = async () => {
    const tsv = formatTableRowsToTSV(filteredRows);
    await navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // CSV download
  const handleDownloadCSV = () => {
    const csv = formatTableRowsToCSV(filteredRows);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadBlobFile(csv, `acoustic_metrics_${dateStr}.csv`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4">
      <div className="bg-white border-2 border-[#111111] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-[#111111]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#111111] text-white select-none">
          <div className="flex items-center space-x-2">
            <TableIcon className="w-4 h-4 text-[#E30613]" />
            <span className="font-bold text-sm tracking-wider uppercase">
              全区間 音響データ集計テーブル (Acoustic Metrics Table)
            </span>
            <span className="bg-[#333333] text-gray-300 text-[10px] font-mono px-2 py-0.5 ml-2">
              {filteredRows.length} 区間
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 transition-colors"
            title="閉じる (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#f8f8fa] border-b border-[#111111] text-xs">
          <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ラベルまたはTier名で検索..."
                className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
              />
            </div>

            {/* Tier Select */}
            {tierNames.length > 1 && (
              <select
                value={selectedTierName}
                onChange={(e) => setSelectedTierName(e.target.value)}
                className="px-2 py-1.5 text-xs bg-white border border-[#111111] focus:outline-none"
              >
                <option value="all">すべてのTier ({tierNames.length})</option>
                {tierNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}

            {/* Empty Intervals Toggle */}
            <label className="flex items-center space-x-1.5 cursor-pointer select-none text-[11px] font-medium text-gray-700">
              <input
                type="checkbox"
                checked={excludeEmpty}
                onChange={(e) => setExcludeEmpty(e.target.checked)}
                className="rounded border-[#111111] text-[#111111] focus:ring-0"
              />
              <span>空白区間を除外</span>
            </label>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyTSV}
              disabled={filteredRows.length === 0}
              className="flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-gray-100 border border-[#111111] text-[#111111] font-bold text-xs transition-colors disabled:opacity-30"
              title="スプレッドシート貼り付け用のTSVをコピー"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-green-600">コピー完了</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>TSVコピー</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadCSV}
              disabled={filteredRows.length === 0}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#111111] hover:bg-[#333333] text-white font-bold text-xs transition-colors disabled:opacity-30"
              title="Excel/R用のCSVファイルをダウンロード"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV保存</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto bg-white font-mono text-[11px]">
          {filteredRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400">
              <Filter className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm font-sans">表示可能な区間データがありません</p>
              <p className="text-xs text-gray-400 mt-1">
                検索条件を変更するか、TextGridにインターバルを追加してください
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead className="bg-[#111111] text-white sticky top-0 z-10 select-none text-[10px] tracking-wider uppercase">
                <tr>
                  <th className="py-2 px-2.5 w-10 text-center">#</th>
                  <th
                    className="py-2 px-2 cursor-pointer hover:bg-[#333333]"
                    onClick={() => handleSort('tierName')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Tier</span>
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="py-2 px-2.5 cursor-pointer hover:bg-[#333333]"
                    onClick={() => handleSort('label')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Label</span>
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="py-2 px-2 text-right cursor-pointer hover:bg-[#333333]"
                    onClick={() => handleSort('start')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Start(s)</span>
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                    </div>
                  </th>
                  <th className="py-2 px-2 text-right">End(s)</th>
                  <th
                    className="py-2 px-2 text-right cursor-pointer hover:bg-[#333333]"
                    onClick={() => handleSort('durationMs')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Dur(ms)</span>
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="py-2 px-2 text-right text-[#0066cc] cursor-pointer hover:bg-[#333333]"
                    onClick={() => handleSort('meanF0')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>F0(Hz)</span>
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="py-2 px-2 text-right text-[#cc0000] cursor-pointer hover:bg-[#333333]"
                    onClick={() => handleSort('f1')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>F1</span>
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="py-2 px-2 text-right text-[#cc0000] cursor-pointer hover:bg-[#333333]"
                    onClick={() => handleSort('f2')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>F2</span>
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="py-2 px-2 text-right text-[#cc0000] cursor-pointer hover:bg-[#333333]"
                    onClick={() => handleSort('f3')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>F3</span>
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="py-2 px-2 text-right text-[#009933] cursor-pointer hover:bg-[#333333]"
                    onClick={() => handleSort('meanIntensity')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Int(dB)</span>
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                    </div>
                  </th>
                  <th
                    className="py-2 px-2 text-right cursor-pointer hover:bg-[#333333]"
                    onClick={() => handleSort('cog')}
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>COG(Hz)</span>
                      <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                    </div>
                  </th>
                  <th className="py-2 px-2 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e6]">
                {filteredRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    onClick={() => onSelectInterval?.(row.start, row.end, row.label)}
                    className="hover:bg-[#f0f0f4] cursor-pointer transition-colors group"
                  >
                    <td className="py-1.5 px-2.5 text-center text-gray-400 text-[10px]">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2 text-gray-600 font-sans truncate max-w-[90px]">
                      {row.tierName}
                    </td>
                    <td className="py-1.5 px-2.5 font-bold text-[#111111] font-sans">
                      {row.label || <span className="text-gray-300 italic">empty</span>}
                    </td>
                    <td className="py-1.5 px-2 text-right text-gray-500">
                      {row.start.toFixed(3)}
                    </td>
                    <td className="py-1.5 px-2 text-right text-gray-500">
                      {row.end.toFixed(3)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-medium">
                      {row.durationMs.toFixed(0)}
                    </td>
                    <td className="py-1.5 px-2 text-right text-[#0066cc] font-bold">
                      {row.meanF0 !== null ? row.meanF0.toFixed(1) : '-'}
                    </td>
                    <td className="py-1.5 px-2 text-right text-[#cc0000] font-medium">
                      {row.f1 !== null ? row.f1.toFixed(0) : '-'}
                    </td>
                    <td className="py-1.5 px-2 text-right text-[#cc0000] font-medium">
                      {row.f2 !== null ? row.f2.toFixed(0) : '-'}
                    </td>
                    <td className="py-1.5 px-2 text-right text-[#cc0000] font-medium">
                      {row.f3 !== null ? row.f3.toFixed(0) : '-'}
                    </td>
                    <td className="py-1.5 px-2 text-right text-[#009933]">
                      {row.meanIntensity !== null ? row.meanIntensity.toFixed(1) : '-'}
                    </td>
                    <td className="py-1.5 px-2 text-right text-gray-600">
                      {row.cog !== null ? row.cog.toFixed(0) : '-'}
                    </td>
                    <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onPlayRange?.(row.start, row.end)}
                        className="p-1 hover:bg-[#111111] hover:text-white rounded text-gray-600 transition-colors"
                        title="この区間を再生"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#f0f0f4] border-t border-[#111111] text-xs font-sans text-gray-600">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 bg-[#E30613] rounded-full" />
            <span>行をクリックするとタイムライン上の該当区間へ瞬時にフォーカスします</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-[#111111] text-white hover:bg-[#333333] font-medium transition-colors text-xs"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
