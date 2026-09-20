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
    <div className="w-64 flex-shrink-0 border-l-2 border-[#111111] bg-white flex flex-col h-full overflow-y-auto text-[#111111]">
      <div className="h-10 px-3 border-b-2 border-[#111111] flex items-center justify-between bg-white flex-shrink-0">
        <div className="flex items-center space-x-2 font-bold text-xs uppercase tracking-wider text-[#111111]">
          <Activity className="w-3.5 h-3.5" />
          <span>Acoustic Inspector</span>
        </div>
        {isLoading && (
          <span className="text-[10px] text-[#E30613] font-bold font-mono tracking-wider">CALC...</span>
        )}
      </div>

      <div className="p-3 space-y-3.5 flex-1">
        {/* Selected Interval Card */}
        <div className="p-3 border-2 border-[#111111] bg-white">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#777780] mb-1">
            Target Interval
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-extrabold text-[#111111] font-mono tracking-tight">
              {selectedLabel !== null && selectedLabel !== '' ? '/' + selectedLabel + '/' : (selectedRange ? '(無名区間)' : '未選択')}
            </span>
            {selectedRange && (
              <span className="text-[10px] text-[#777780] font-mono font-medium">
                {selectedRange.start.toFixed(3)} - {selectedRange.end.toFixed(3)}s
              </span>
            )}
          </div>
        </div>

        {selectedRange ? (
          <>
            {/* Duration */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#777780]">
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1 text-[#111111]" />
                  Duration
                </span>
                <span className="text-[9px] text-[#aaaaaf]">分節長</span>
              </div>
              <div className="flex items-baseline justify-between px-2.5 py-1.5 bg-[#f0f0f4] border border-[#e0e0e6] font-mono">
                <span className="text-sm font-bold text-[#111111]">
                  {metrics ? metrics.duration_ms.toFixed(1) + ' ms' : ((selectedRange.end - selectedRange.start) * 1000).toFixed(1) + ' ms'}
                </span>
                <span className="text-[10px] text-[#777780]">
                  {metrics ? (metrics.duration_ms / 1000).toFixed(3) + ' s' : (selectedRange.end - selectedRange.start).toFixed(3) + ' s'}
                </span>
              </div>
            </div>

            {/* F0 / Pitch */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#777780]">
                <span className="flex items-center">
                  <Zap className="w-3 h-3 mr-1 text-[#111111]" />
                  Fundamental (F0)
                </span>
                <span className="text-[9px] text-[#aaaaaf]">基本周波数</span>
              </div>
              <div className="p-2.5 bg-white border border-[#e0e0e6] font-mono space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-[#777780] uppercase tracking-wider">Mean:</span>
                  <span className="text-sm font-extrabold text-[#111111]">
                    {metrics?.mean_f0 ? metrics.mean_f0.toFixed(1) + ' Hz' : '--'}
                  </span>
                </div>
                {metrics?.min_f0 && metrics?.max_f0 && (
                  <div className="flex justify-between text-[10px] text-[#777780] border-t border-[#e0e0e6] pt-1 font-medium">
                    <span>Min: {metrics.min_f0.toFixed(1)} Hz</span>
                    <span>Max: {metrics.max_f0.toFixed(1)} Hz</span>
                  </div>
                )}
              </div>
            </div>

            {/* Formants */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#777780]">
                <span className="flex items-center">
                  <BarChart2 className="w-3 h-3 mr-1 text-[#E30613]" />
                  Formants (20-80%)
                </span>
                <span className="text-[9px] text-[#aaaaaf]">定常部共鳴</span>
              </div>
              <div className="p-2.5 bg-white border border-[#e0e0e6] font-mono space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#777780] uppercase tracking-wider font-semibold">F1 (舌高):</span>
                  <span className="font-extrabold text-[#E30613]">
                    {metrics?.f1 ? metrics.f1.toFixed(0) + ' Hz' : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#777780] uppercase tracking-wider font-semibold">F2 (舌前後):</span>
                  <span className="font-extrabold text-[#E30613]">
                    {metrics?.f2 ? metrics.f2.toFixed(0) + ' Hz' : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-[#f0f0f4] pt-1">
                  <span className="text-[#777780] uppercase tracking-wider font-semibold">F3:</span>
                  <span className="font-bold text-[#111111]">
                    {metrics?.f3 ? metrics.f3.toFixed(0) + ' Hz' : '--'}
                  </span>
                </div>
              </div>
            </div>

            {/* Intensity */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#777780]">
                <span className="flex items-center">
                  <Volume2 className="w-3 h-3 mr-1 text-[#111111]" />
                  Intensity
                </span>
                <span className="text-[9px] text-[#aaaaaf]">音圧強度</span>
              </div>
              <div className="flex items-baseline justify-between px-2.5 py-1.5 bg-[#f0f0f4] border border-[#e0e0e6] font-mono">
                <span className="text-sm font-bold text-[#111111]">
                  {metrics?.mean_intensity ? metrics.mean_intensity.toFixed(1) + ' dB' : '--'}
                </span>
                <span className="text-[10px] text-[#777780]">Mean Power</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-left py-8 px-2 text-[#777780] text-xs font-mono leading-relaxed border border-dashed border-[#e0e0e6] p-4">
            Select an interval or drag over the waveform to inspect acoustic metrics (F0, Formants F1-F3, Duration).
          </div>
        )}
      </div>

      <div className="p-2.5 border-t border-[#e0e0e6] text-[10px] text-[#777780] bg-[#f0f0f4] flex justify-between items-center font-mono uppercase tracking-wider">
        <span>Praat Burg / AC</span>
        <span>Standard Spec</span>
      </div>
    </div>
  );
};
