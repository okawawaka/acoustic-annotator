'use client';

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  SplitSquareVertical,
  Mic,
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
    <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-white border-b border-gray-200 text-xs text-gray-800 gap-2">
      {/* Playback Controls */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={onTogglePlay}
          disabled={!hasAudio}
          className="flex items-center justify-center w-8 h-8 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-900 disabled:opacity-30 transition-colors"
          title="再生 / 一時停止 (Space)"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <button
          onClick={onPlaySelection}
          disabled={!hasAudio}
          className="px-2.5 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-30"
          title="選択区間を再生 (Tab)"
        >
          区間再生 [Tab]
        </button>

        <button
          onClick={onToggleLoop}
          className={`p-1.5 rounded border transition-colors ${
            isLooping ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
          title="ループ再生"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <select
          value={playbackRate}
          onChange={(e) => onChangePlaybackRate(parseFloat(e.target.value))}
          className="bg-white text-gray-700 px-2 py-1 rounded border border-gray-300 outline-none cursor-pointer"
        >
          <option value="0.5">0.5x</option>
          <option value="0.75">0.75x</option>
          <option value="1">1.0x</option>
          <option value="1.25">1.25x</option>
          <option value="1.5">1.5x</option>
        </select>

        <div className="font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Editing & Zoom */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={onInsertBoundary}
          disabled={!hasAudio}
          className="flex items-center px-2.5 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 disabled:opacity-30"
          title="現在位置に境界を挿入 (Enter)"
        >
          <SplitSquareVertical className="w-3.5 h-3.5 mr-1 text-gray-600" />
          境界挿入 [Enter]
        </button>

        <div className="flex items-center border border-gray-300 rounded bg-white overflow-hidden">
          <button
            onClick={onZoomIn}
            className="p-1 text-gray-600 hover:bg-gray-100 border-r border-gray-300"
            title="拡大"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onZoomOut}
            className="p-1 text-gray-600 hover:bg-gray-100 border-r border-gray-300"
            title="縮小"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetZoom}
            className="p-1 text-gray-600 hover:bg-gray-100"
            title="全体表示"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={onOpenASRModal}
          disabled={!hasAudio}
          className="flex items-center px-3 py-1.5 rounded border border-gray-800 bg-gray-900 hover:bg-gray-800 text-white font-medium disabled:opacity-30 transition-colors"
        >
          <Mic className="w-3.5 h-3.5 mr-1" />
          自動文字起こし
        </button>

        <button
          onClick={onExportTextGrid}
          className="flex items-center px-2.5 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
          title="Praat TextGrid形式で保存"
        >
          <Download className="w-3.5 h-3.5 mr-1 text-gray-600" />
          TextGrid保存
        </button>
      </div>
    </div>
  );
};