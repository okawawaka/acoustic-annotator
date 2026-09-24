'use client';

import React from 'react';
import { Play } from 'lucide-react';

interface PlayBarsProps {
  duration: number;
  viewRange: { start: number; end: number };
  selection: { start: number; end: number } | null;
  onPlayRange: (start: number, end: number) => void;
  onPlaySelection?: () => void;
}

export const PlayBars: React.FC<PlayBarsProps> = ({
  duration,
  viewRange,
  selection,
  onPlayRange,
  onPlaySelection,
}) => {
  const windowSpan = Math.max(0, viewRange.end - viewRange.start);
  const selSpan = selection ? Math.abs(selection.end - selection.start) : 0;
  const hasSelection = selection !== null && selSpan > 0.005;

  const handleSelectionClick = () => {
    if (!selection) return;
    if (onPlaySelection) {
      onPlaySelection();
    } else {
      onPlayRange(selection.start, selection.end);
    }
  };

  return (
    <div className="h-7 border-b border-[#e0e0e6] bg-[#f0f0f4] flex items-stretch text-[11px] font-mono select-none">
      {/* Play Visible Window */}
      <button
        onClick={() => onPlayRange(viewRange.start, viewRange.end)}
        className="flex-1 flex items-center justify-center space-x-1 sm:space-x-1.5 px-1.5 sm:px-3 bg-white hover:bg-[#111111] hover:text-white border-r border-[#e0e0e6] text-[#111111] transition-colors group"
        title="表示中の時間範囲を再生"
      >
        <Play className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 fill-current" />
        <span className="font-bold text-[8px] sm:text-[10px] text-[#777780] group-hover:text-white/70 uppercase">
          Window:
        </span>
        <span className="font-bold">{windowSpan.toFixed(3)}s</span>
      </button>

      {/* Play Active Selection */}
      <button
        onClick={handleSelectionClick}
        disabled={!hasSelection}
        className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-1.5 px-1.5 sm:px-3 border-r border-[#e0e0e6] transition-colors group ${
          hasSelection
            ? 'bg-[#E30613]/10 hover:bg-[#E30613] text-[#E30613] hover:text-white border-[#E30613]/30 cursor-pointer'
            : 'bg-white text-[#aaaaaf] cursor-not-allowed opacity-50'
        }`}
        title="選択中の区間を再生 (Tab)"
      >
        <Play className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 fill-current" />
        <span
          className={`font-bold text-[8px] sm:text-[10px] uppercase ${
            hasSelection ? 'text-[#E30613] group-hover:text-white' : 'text-[#aaaaaf]'
          }`}
        >
          Selection:
        </span>
        <span className="font-bold">
          {hasSelection ? `${selSpan.toFixed(3)}s` : '---'}
        </span>
      </button>

      {/* Play Entire File */}
      <button
        onClick={() => onPlayRange(0, duration)}
        className="flex-1 flex items-center justify-center space-x-1 sm:space-x-1.5 px-1.5 sm:px-3 bg-white hover:bg-[#111111] hover:text-white text-[#111111] transition-colors group"
        title="音声全体を再生"
      >
        <Play className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 fill-current" />
        <span className="font-bold text-[8px] sm:text-[10px] text-[#777780] group-hover:text-white/70 uppercase">
          Total:
        </span>
        <span className="font-bold">{duration.toFixed(3)}s</span>
      </button>
    </div>
  );
};
