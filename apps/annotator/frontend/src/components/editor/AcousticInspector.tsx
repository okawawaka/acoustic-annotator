'use client';

import React from 'react';
import { IntervalMetrics } from '@/types';
import { Activity, Clock, Zap, Volume2, BarChart2 } from 'lucide-react';

interface AcousticInspectorProps {
  metrics: IntervalMetrics | null;
  selectedLabel: string | null;
  selectedRange: { start: number; end: number } | null;
  isLoading: boolean;
}

export const AcousticInspector: React.FC<AcousticInspectorProps> = ({
  metrics,
  selectedLabel,
  selectedRange,
  isLoading,
}) => {
  return (
    <div className="w-64 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col h-full overflow-y-auto text-gray-800">
      <div className="h-10 px-3 border-b border-gray-200 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
        <div className="flex items-center space-x-1.5 font-semibold text-xs text-gray-900 tracking-tight">
          <Activity className="w-3.5 h-3.5 text-gray-700" />
          <span>Acoustic Inspector</span>
        </div>
        {isLoading && (
          <span className="text-[10px] text-blue-600 animate-pulse font-mono">計測中...</span>
        )}
      </div>

      <div className="p-3 space-y-4 flex-1">
        <div className="p-2.5 rounded border border-gray-200 bg-gray-50/40">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Selected Interval
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold text-gray-900 font-mono">
              {selectedLabel !== null && selectedLabel !== '' ? '/' + selectedLabel + '/' : (selectedRange ? '(無名区間)' : '未選択')}
            </span>
            {selectedRange && (
              <span className="text-[10px] text-gray-500 font-mono">
                {selectedRange.start.toFixed(3)} - {selectedRange.end.toFixed(3)} s
              </span>
            )}
          </div>
        </div>

        {selectedRange ? (
          <>
            <div className="space-y-1">
              <div className="flex items-center text-xs font-medium text-gray-700">
                <Clock className="w-3.5 h-3.5 mr-1 text-gray-500" />
                <span>Duration (継続時間)</span>
              </div>
              <div className="flex items-baseline justify-between px-2 py-1.5 bg-gray-50 rounded border border-gray-100 font-mono">
                <span className="text-sm font-semibold text-gray-900">
                  {metrics ? metrics.duration_ms.toFixed(1) + ' ms' : ((selectedRange.end - selectedRange.start) * 1000).toFixed(1) + ' ms'}
                </span>
                <span className="text-[10px] text-gray-400">分節長</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center text-xs font-medium text-gray-700">
                <Zap className="w-3.5 h-3.5 mr-1 text-blue-600" />
                <span>F0 / Pitch (基本周波数)</span>
              </div>
              <div className="p-2 bg-blue-50/30 rounded border border-blue-100 font-mono space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-600">Mean F0:</span>
                  <span className="text-sm font-bold text-blue-700">
                    {metrics?.mean_f0 ? metrics.mean_f0.toFixed(1) + ' Hz' : '--'}
                  </span>
                </div>
                {metrics?.min_f0 && metrics?.max_f0 && (
                  <div className="flex justify-between text-[10px] text-gray-500 border-t border-blue-100/60 pt-1">
                    <span>Min: {metrics.min_f0.toFixed(1)} Hz</span>
                    <span>Max: {metrics.max_f0.toFixed(1)} Hz</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center text-xs font-medium text-gray-700">
                <BarChart2 className="w-3.5 h-3.5 mr-1 text-red-600" />
                <span>Formants (定常部 20-80%)</span>
              </div>
              <div className="p-2 bg-red-50/20 rounded border border-red-100 font-mono space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 font-medium">F1 (舌高 / 狭広):</span>
                  <span className="font-bold text-red-700">
                    {metrics?.f1 ? metrics.f1.toFixed(0) + ' Hz' : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 font-medium">F2 (舌前後):</span>
                  <span className="font-bold text-red-700">
                    {metrics?.f2 ? metrics.f2.toFixed(0) + ' Hz' : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 font-medium">F3:</span>
                  <span className="font-bold text-gray-700">
                    {metrics?.f3 ? metrics.f3.toFixed(0) + ' Hz' : '--'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center text-xs font-medium text-gray-700">
                <Volume2 className="w-3.5 h-3.5 mr-1 text-amber-600" />
                <span>Intensity (音圧強度)</span>
              </div>
              <div className="flex items-baseline justify-between px-2 py-1.5 bg-gray-50 rounded border border-gray-100 font-mono">
                <span className="text-sm font-semibold text-gray-900">
                  {metrics?.mean_intensity ? metrics.mean_intensity.toFixed(1) + ' dB' : '--'}
                </span>
                <span className="text-[10px] text-gray-400">平均エネルギー</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-10 px-2 text-gray-400 text-xs leading-relaxed">
            タイムライン上の区間または波形をドラッグ選択すると、該当区間の音響特徴量（F0, F1-F3, 継続時間）が自動計算されます。
          </div>
        )}
      </div>

      <div className="p-2.5 border-t border-gray-100 text-[10px] text-gray-400 bg-gray-50/50 flex justify-between items-center">
        <span>Praat Burg / AC 法準拠</span>
        <span className="font-mono">F0/LPC</span>
      </div>
    </div>
  );
};
