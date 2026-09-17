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
  FileText,
  Activity,
  User,
  Sliders,
} from 'lucide-react';

interface ControlToolbarProps {
  isPlaying: boolean;
  playbackRate: number;
  isLooping: boolean;
  currentTime: number;
  duration: number;
  selection: { start: number; end: number } | null;
  hasAudio: boolean;
  showPitch: boolean;
  showFormants: boolean;
  maxDisplayFreq: number;
  maxFormantFreq: number;
  onTogglePlay: () => void;
  onPlaySelection: () => void;
  onToggleLoop: () => void;
  onChangePlaybackRate: (rate: number) => void;
  onChangeMaxFormantFreq: (freq: number) => void;
  onChangeDisplayFreq: (freq: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onInsertBoundary: () => void;
  onOpenASRModal: () => void;
  onOpenCustomTextModal: () => void;
  onOpenVowelSpaceModal: () => void;
  onTogglePitch: () => void;
  onToggleFormants: () => void;
  onExportTextGrid: () => void;
}

export const ControlToolbar: React.FC<ControlToolbarProps> = ({
  isPlaying,
  playbackRate,
  isLooping,
  currentTime,
  duration,
  selection,
  hasAudio,
  showPitch,
  showFormants,
  maxDisplayFreq,
  maxFormantFreq,
  onTogglePlay,
  onPlaySelection,
  onToggleLoop,
  onChangePlaybackRate,
  onChangeMaxFormantFreq,
  onChangeDisplayFreq,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onInsertBoundary,
  onOpenASRModal,
  onOpenCustomTextModal,
  onOpenVowelSpaceModal,
  onTogglePitch,
  onToggleFormants,
  onExportTextGrid,
}) => {
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = (time % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  const selectionDuration =
    selection && selection.start !== selection.end
      ? Math.abs(selection.end - selection.start).toFixed(3)
      : null;

  return (
    <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-white border-b border-gray-200 text-xs text-gray-800 gap-2">
      {/* Playback Controls */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={onTogglePlay}
          disabled={!hasAudio}
          className="flex items-center justify-center w-7 h-7 rounded border border-gray-300 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-900 disabled:opacity-30 transition-colors"
          title="再生 / 一時停止 (Space)"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        <button
          onClick={onPlaySelection}
          disabled={!hasAudio || !selection}
          className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-30"
          title="選択区間を再生 (Tab)"
        >
          区間再生 [Tab]
        </button>

        <button
          onClick={onToggleLoop}
          className={`p-1 rounded border transition-colors ${
            isLooping ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
          title="ループ再生"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <select
          value={playbackRate}
          onChange={(e) => onChangePlaybackRate(parseFloat(e.target.value))}
          className="bg-white text-gray-700 px-1.5 py-1 rounded border border-gray-300 outline-none cursor-pointer"
        >
          <option value="0.5">0.5x</option>
          <option value="0.75">0.75x</option>
          <option value="1">1.0x</option>
          <option value="1.25">1.25x</option>
          <option value="1.5">1.5x</option>
        </select>

        <div className="font-mono text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {selectionDuration && (
          <div className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200" title="選択区間の長さ">
            選択: {selectionDuration}s
          </div>
        )}
      </div>

      {/* Editing, Speaker, Frequency Range & Overlays */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={onInsertBoundary}
          disabled={!hasAudio}
          className="flex items-center px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 disabled:opacity-30"
          title="現在位置に境界を挿入 (Enter)"
        >
          <SplitSquareVertical className="w-3.5 h-3.5 mr-1 text-gray-600" />
          境界挿入 [Enter]
        </button>

        {/* 話者設定 */}
        <div className="flex items-center space-x-1 border border-gray-300 rounded px-1.5 py-0.5 bg-white text-[11px]" title="話者の声道長に応じたLPCフォルマント上限周波数（女性: 5500Hz / 男性: 5000Hz）">
          <User className="w-3 h-3 text-gray-500" />
          <span className="text-gray-500">話者:</span>
          <select
            value={maxFormantFreq}
            onChange={(e) => onChangeMaxFormantFreq(parseFloat(e.target.value))}
            className="bg-transparent font-medium text-gray-800 outline-none cursor-pointer"
          >
            <option value="5500">女性 (5500Hz)</option>
            <option value="5000">男性 (5000Hz)</option>
            <option value="6000">子供 (6000Hz)</option>
          </select>
        </div>

        {/* 縦軸周波数レンジの手動切り替えセレクター */}
        <div className="flex items-center space-x-1 border border-gray-300 rounded px-1.5 py-0.5 bg-white text-[11px]" title="音響キャンバスの縦軸上限周波数を手動設定（F0単体観察時は500Hz、フォルマント時は5000Hz等）">
          <Sliders className="w-3 h-3 text-gray-500" />
          <span className="text-gray-500">縦軸:</span>
          <select
            value={maxDisplayFreq}
            onChange={(e) => onChangeDisplayFreq(parseFloat(e.target.value))}
            className="bg-transparent font-medium text-gray-800 outline-none cursor-pointer"
          >
            <option value="500">0 - 500 Hz (F0/ピッチ拡大)</option>
            <option value="800">0 - 800 Hz (高F0/女性ピッチ)</option>
            <option value="3000">0 - 3000 Hz (F1-F2母音帯)</option>
            <option value="5000">0 - 5000 Hz (標準広帯域/F1-3)</option>
            <option value="8000">0 - 8000 Hz (子音・高周波)</option>
          </select>
        </div>

        {/* Pitch / Formant Toggles (単なる表示ON/OFFトグル) */}
        <div className="flex items-center border border-gray-300 rounded bg-white overflow-hidden text-[11px]">
          <button
            onClick={onTogglePitch}
            className={`px-2 py-1 font-mono transition-colors ${
              showPitch ? 'bg-blue-50 text-blue-700 font-bold border-r border-blue-200' : 'text-gray-500 hover:bg-gray-50 border-r border-gray-300'
            }`}
            title="基本周波数 (F0) の青色実線表示切替"
          >
            F0
          </button>
          <button
            onClick={onToggleFormants}
            className={`px-2 py-1 font-mono transition-colors ${
              showFormants ? 'bg-red-50 text-red-700 font-bold' : 'text-gray-500 hover:bg-gray-50'
            }`}
            title="フォルマント (F1-3) の赤点表示切替"
          >
            F1-3
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center border border-gray-300 rounded bg-white overflow-hidden">
          <button
            onClick={onZoomIn}
            className="p-1 text-gray-600 hover:bg-gray-100 border-r border-gray-300"
            title="時間軸の拡大"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onZoomOut}
            className="p-1 text-gray-600 hover:bg-gray-100 border-r border-gray-300"
            title="時間軸の縮小"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetZoom}
            className="p-1 text-gray-600 hover:bg-gray-100"
            title="時間軸全体表示"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Analysis Tools & Export */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={onOpenVowelSpaceModal}
          disabled={!hasAudio}
          className="flex items-center px-2 py-1 rounded border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-blue-800 font-medium disabled:opacity-30 transition-colors"
          title="F1-F2音響母音四辺形マップを描画"
        >
          <Activity className="w-3.5 h-3.5 mr-1 text-blue-700" />
          母音空間 (F1-F2)
        </button>

        <button
          onClick={onOpenCustomTextModal}
          disabled={!hasAudio}
          className="flex items-center px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 disabled:opacity-30 transition-colors"
          title="既存のテキスト（台本）から自動で区間を配置"
        >
          <FileText className="w-3.5 h-3.5 mr-1 text-gray-600" />
          台本配置
        </button>

        <button
          onClick={onOpenASRModal}
          disabled={!hasAudio}
          className="flex items-center px-2.5 py-1 rounded border border-gray-800 bg-gray-900 hover:bg-gray-800 text-white font-medium disabled:opacity-30 transition-colors"
          title="Praat同様の無音自動検出(VAD)またはAI自動文字起こし"
        >
          <Mic className="w-3.5 h-3.5 mr-1" />
          自動区間分割 / 文字起こし
        </button>

        <button
          onClick={onExportTextGrid}
          className="flex items-center px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
          title="Praat TextGrid形式で保存"
        >
          <Download className="w-3.5 h-3.5 mr-1 text-gray-600" />
          TextGrid保存
        </button>
      </div>
    </div>
  );
};
