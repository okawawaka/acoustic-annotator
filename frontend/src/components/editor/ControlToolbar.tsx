'use client';

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Download,
  SplitSquareVertical,
} from 'lucide-react';

interface ControlToolbarProps {
  isPlaying: boolean;
  playbackRate: number;
  isLooping: boolean;
  currentTime: number;
  duration: number;
  hasAudio: boolean;
  onTogglePlay: () => void;
  onPlaySelection: () => void;
  onToggleLoop: () => void;
  onChangePlaybackRate: (rate: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onInsertBoundary: () => void;
  onOpenASRModal: () => void;
  onExportTextGrid: () => void;
  onImportClick: () => void;
}

export const ControlToolbar: React.FC<ControlToolbarProps> = ({
  isPlaying,
  playbackRate,
  isLooping,
  currentTime,
  duration,
  hasAudio,
  onTogglePlay,
  onPlaySelection,
  onToggleLoop,
  onChangePlaybackRate,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onInsertBoundary,
  onOpenASRModal,
  onExportTextGrid,
}) => {
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = (time % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  return (
    <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-sm gap-2">
      {/* Playback Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onTogglePlay}
          disabled={!hasAudio}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-sky-500 hover:bg-sky-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md transition-all"
          title="再生 / 一時停止 (Space)"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <button
          onClick={onPlaySelection}
          disabled={!hasAudio}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs text-slate-200 disabled:opacity-40"
          title="選択区間を再生 (Tab)"
        >
          区間再生 [Tab]
        </button>

        <button
          onClick={onToggleLoop}
          className={`p-2 rounded-lg text-xs transition-colors ${
            isLooping ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
          title="ループ再生切替"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Speed Selector */}
        <select
          value={playbackRate}
          onChange={(e) => onChangePlaybackRate(parseFloat(e.target.value))}
          className="bg-slate-800 text-slate-300 text-xs px-2 py-1.5 rounded-lg outline-none cursor-pointer border border-slate-700"
        >
          <option value="0.5">0.5x</option>
          <option value="0.75">0.75x</option>
          <option value="1">1.0x (標準)</option>
          <option value="1.25">1.25x</option>
          <option value="1.5">1.5x</option>
        </select>

        {/* Time display */}
        <div className="font-mono text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Editing & Zoom Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onInsertBoundary}
          disabled={!hasAudio}
          className="flex items-center px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 hover:bg-amber-500/30 text-amber-300 text-xs active:scale-95 transition-all"
          title="現在位置に境界を挿入 (Enter)"
        >
          <SplitSquareVertical className="w-4 h-4 mr-1" />
          境界挿入 [Enter]
        </button>

        <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
          <button
            onClick={onZoomIn}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded"
            title="ズームイン"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={onZoomOut}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded"
            title="ズームアウト"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={onResetZoom}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded"
            title="全体表示に戻す"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Actions: AI & Export */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenASRModal}
          disabled={!hasAudio}
          className="flex items-center px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-95 text-white font-medium text-xs shadow-md transition-all disabled:opacity-40"
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          AI自動文字起こし
        </button>

        <button
          onClick={onExportTextGrid}
          className="flex items-center px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors"
          title="Praat TextGrid形式でエクスポート"
        >
          <Download className="w-4 h-4 mr-1.5" />
          TextGrid保存
        </button>
      </div>
    </div>
  );
};