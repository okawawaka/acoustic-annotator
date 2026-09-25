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
  Undo2,
  Redo2,
  Layers,
  HelpCircle,
  Terminal,
  Table,
  Languages,
  Palette,
} from 'lucide-react';
import { SpectrogramColorMap } from '@/types';

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
  showIntensity: boolean;
  showIpaBar?: boolean;
  maxDisplayFreq: number;
  maxFormantFreq: number;
  colorMap?: SpectrogramColorMap;
  onChangeColorMap?: (map: SpectrogramColorMap) => void;
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
  onDeleteBoundary?: () => void;
  onOpenASRModal: () => void;
  onOpenCustomTextModal: () => void;
  onOpenVowelSpaceModal: () => void;
  onOpenSpectralSliceModal: () => void;
  onOpenAnalysisSettingsModal: () => void;
  onOpenAcousticTable?: () => void;
  onToggleIpaBar?: () => void;
  onOpenShortcutsModal?: () => void;
  onOpenCommandPalette?: () => void;
  onTogglePitch: () => void;
  onToggleFormants: () => void;
  onToggleIntensity: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onExportTextGrid: () => void;
  onExportSelectedAudio?: () => void;
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
  showIntensity,
  maxDisplayFreq,
  maxFormantFreq,
  colorMap = 'grayscale',
  onChangeColorMap,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
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
  onDeleteBoundary,
  onOpenASRModal,
  onOpenCustomTextModal,
  onOpenVowelSpaceModal,
  onOpenSpectralSliceModal,
  onOpenAnalysisSettingsModal,
  onOpenAcousticTable,
  onToggleIpaBar,
  showIpaBar = false,
  onOpenShortcutsModal,
  onOpenCommandPalette,
  onTogglePitch,
  onToggleFormants,
  onToggleIntensity,
  onExportTextGrid,
  onExportSelectedAudio,
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
    <div className="flex flex-wrap items-center justify-between px-3 py-1 bg-white border-b border-[#e0e0e6] text-xs text-[#111111] gap-y-1.5 gap-x-2">
      {/* Group 1: Playback Controls */}
      <div className="flex items-center space-x-1.5 pr-2 border-r border-[#e0e0e6]">
        <button
          onClick={onTogglePlay}
          disabled={!hasAudio}
          className="flex items-center justify-center w-7 h-7 border border-[#111111] bg-white hover:bg-[#111111] hover:text-white active:bg-[#444448] text-[#111111] disabled:opacity-20 transition-colors"
          title="再生 / 一時停止 (Space)"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        <button
          onClick={onPlaySelection}
          disabled={!hasAudio || !selection}
          className="px-2 py-1 border border-[#111111] bg-white hover:bg-[#111111] hover:text-white text-[#111111] disabled:opacity-20 font-medium transition-colors text-[11px]"
          title="選択区間を再生 (Tab)"
        >
          区間再生 [Tab]
        </button>

        <button
          onClick={onToggleLoop}
          className={`p-1 border transition-colors ${
            isLooping
              ? 'bg-[#111111] border-[#111111] text-white'
              : 'bg-white border-[#e0e0e6] text-[#777780] hover:border-[#111111] hover:text-[#111111]'
          }`}
          title="ループ再生"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <select
          value={playbackRate}
          onChange={(e) => onChangePlaybackRate(parseFloat(e.target.value))}
          className="bg-white text-[#111111] px-1 py-1 border border-[#e0e0e6] hover:border-[#111111] outline-none cursor-pointer font-mono text-[11px]"
          title="再生速度"
        >
          <option value="0.5">0.5x</option>
          <option value="0.75">0.75x</option>
          <option value="1">1.0x</option>
          <option value="1.25">1.25x</option>
          <option value="1.5">1.5x</option>
        </select>

        <div className="font-mono text-[#444448] bg-[#f0f0f4] px-1.5 py-1 border border-[#e0e0e6] text-[11px] whitespace-nowrap">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {selectionDuration && (
          <div className="font-mono text-[#E30613] bg-[#E30613]/10 px-1.5 py-1 border border-[#E30613]/30 text-[11px] font-semibold whitespace-nowrap" title="選択区間の長さ">
            SEL: {selectionDuration}s
          </div>
        )}
      </div>

      {/* Group 2: Editing Controls */}
      <div className="flex items-center space-x-1.5 pr-2 border-r border-[#e0e0e6]">
        <button
          onClick={onInsertBoundary}
          disabled={!hasAudio}
          className="flex items-center px-2 py-1 border border-[#111111] bg-white hover:bg-[#111111] hover:text-white text-[#111111] disabled:opacity-20 font-medium transition-colors text-[11px]"
          title="現在位置に境界を挿入 (Enter)"
        >
          <SplitSquareVertical className="w-3.5 h-3.5 mr-1" />
          境界挿入 [Enter]
        </button>

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center px-1.5 py-1 border border-[#e0e0e6] hover:border-[#111111] bg-white hover:bg-[#f0f0f4] text-[#111111] disabled:opacity-20 transition-colors text-[11px]"
          title="元に戻す (Ctrl+Z)"
        >
          <Undo2 className="w-3 h-3 mr-0.5" />
          戻す
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="flex items-center px-1.5 py-1 border border-[#e0e0e6] hover:border-[#111111] bg-white hover:bg-[#f0f0f4] text-[#111111] disabled:opacity-20 transition-colors text-[11px]"
          title="やり直す (Ctrl+Y / Ctrl+Shift+Z)"
        >
          <Redo2 className="w-3 h-3 mr-0.5" />
          進む
        </button>
      </div>

      {/* Group 3: Overlays & Frequency Display Controls */}
      <div className="flex items-center space-x-1.5 pr-2 border-r border-[#e0e0e6]">
        {/* 話者設定 */}
        <div className="flex items-center space-x-1 border border-[#e0e0e6] px-1.5 py-0.5 bg-white text-[11px]" title="話者の声道長に応じたLPCフォルマント上限周波数（女性: 5500Hz / 男性: 5000Hz）">
          <User className="w-3 h-3 text-[#777780]" />
          <span className="text-[#777780] font-mono uppercase text-[10px]">LPC:</span>
          <select
            value={maxFormantFreq}
            onChange={(e) => onChangeMaxFormantFreq(parseFloat(e.target.value))}
            className="bg-transparent font-semibold text-[#111111] outline-none cursor-pointer text-[11px]"
          >
            <option value="5500">女性 (5500Hz)</option>
            <option value="5000">男性 (5000Hz)</option>
            <option value="6000">子供 (6000Hz)</option>
          </select>
        </div>

        {/* 縦軸周波数レンジの手動切り替えセレクター */}
        <div className="flex items-center space-x-1 border border-[#e0e0e6] px-1.5 py-0.5 bg-white text-[11px]" title="音響キャンバスの縦軸上限周波数を手動設定（F0単体観察時は500Hz、フォルマント時は5000Hz等）">
          <Sliders className="w-3 h-3 text-[#777780]" />
          <span className="text-[#777780] font-mono uppercase text-[10px]">Freq:</span>
          <select
            value={maxDisplayFreq}
            onChange={(e) => onChangeDisplayFreq(parseFloat(e.target.value))}
            className="bg-transparent font-semibold text-[#111111] outline-none cursor-pointer text-[11px]"
          >
            <option value="500">0 - 500 Hz (F0)</option>
            <option value="800">0 - 800 Hz (高F0)</option>
            <option value="3000">0 - 3000 Hz (F1-F2)</option>
            <option value="5000">0 - 5000 Hz (標準広帯域)</option>
            <option value="8000">0 - 8000 Hz (子音)</option>
          </select>
        </div>

        {/* スペクトログラム配色切り替え */}
        {onChangeColorMap && (
          <div className="flex items-center space-x-1 border border-[#e0e0e6] px-1.5 py-0.5 bg-white text-[11px]" title="スペクトログラム配色（Praat白黒 / Dark暗色反転 / Thermal熱分布）">
            <Palette className="w-3 h-3 text-[#777780]" />
            <span className="text-[#777780] font-mono uppercase text-[10px]">Color:</span>
            <select
              value={colorMap}
              onChange={(e) => onChangeColorMap(e.target.value as SpectrogramColorMap)}
              className="bg-transparent font-semibold text-[#111111] outline-none cursor-pointer text-[11px]"
            >
              <option value="grayscale">Praat白黒</option>
              <option value="dark">Dark反転</option>
              <option value="color">Thermal熱分布</option>
            </select>
          </div>
        )}

        {/* Pitch / Formant / Intensity Toggles with Color Status Indicators */}
        <div className="flex items-center border border-[#e0e0e6] bg-white overflow-hidden text-[11px]">
          <button
            onClick={onTogglePitch}
            className={`px-2 py-1 font-mono transition-colors ${
              showPitch
                ? 'bg-[#111111] text-white font-bold'
                : 'text-[#777780] hover:bg-[#f0f0f4]'
            }`}
            title="基本周波数 (F0) の青色実線表示切替"
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${showPitch ? 'bg-[#2563eb]' : 'bg-[#aaaaaf]'}`} />
            F0
          </button>
          <button
            onClick={onToggleFormants}
            className={`px-2 py-1 font-mono transition-colors border-l border-[#e0e0e6] ${
              showFormants
                ? 'bg-[#111111] text-white font-bold'
                : 'text-[#777780] hover:bg-[#f0f0f4]'
            }`}
            title="フォルマント (F1-3) の赤点表示切替"
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${showFormants ? 'bg-[#E30613]' : 'bg-[#aaaaaf]'}`} />
            F1-3
          </button>
          <button
            onClick={onToggleIntensity}
            className={`px-2 py-1 font-mono transition-colors border-l border-[#e0e0e6] ${
              showIntensity
                ? 'bg-[#111111] text-white font-bold'
                : 'text-[#777780] hover:bg-[#f0f0f4]'
            }`}
            title="音圧曲線 (Intensity dB) の緑色実線表示切替"
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${showIntensity ? 'bg-[#10b981]' : 'bg-[#aaaaaf]'}`} />
            Int
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center border border-[#e0e0e6] bg-white">
          <button
            onClick={onZoomIn}
            className="p-1 text-[#111111] hover:bg-[#f0f0f4] border-r border-[#e0e0e6] transition-colors"
            title="時間軸の拡大"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onZoomOut}
            className="p-1 text-[#111111] hover:bg-[#f0f0f4] border-r border-[#e0e0e6] transition-colors"
            title="時間軸の縮小"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetZoom}
            className="p-1 text-[#111111] hover:bg-[#f0f0f4] transition-colors"
            title="時間軸全体表示"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Group 4: Analysis Tools, Export & Help */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={onOpenSpectralSliceModal}
          disabled={!hasAudio}
          className="flex items-center px-2 py-1 border border-[#111111] bg-white hover:bg-[#111111] hover:text-white text-[#111111] font-medium disabled:opacity-20 transition-colors text-[11px]"
          title="カーソル位置・選択区間のスペクトル断面 (FFT/LPC包絡線) を表示"
        >
          <Layers className="w-3.5 h-3.5 mr-1 text-[#E30613]" />
          断面
        </button>

        <button
          onClick={onOpenVowelSpaceModal}
          disabled={!hasAudio}
          className="flex items-center px-2 py-1 border border-[#111111] bg-white hover:bg-[#111111] hover:text-white text-[#111111] font-medium disabled:opacity-20 transition-colors text-[11px]"
          title="F1-F2音響母音四辺形マップを描画"
        >
          <Activity className="w-3.5 h-3.5 mr-1" />
          母音
        </button>

        {onOpenAcousticTable && (
          <button
            onClick={onOpenAcousticTable}
            disabled={!hasAudio}
            className="flex items-center px-2 py-1 border border-[#111111] bg-white hover:bg-[#111111] hover:text-white text-[#111111] font-medium disabled:opacity-20 transition-colors text-[11px]"
            title="全区間の音響特徴量を一覧表示・CSV保存"
          >
            <Table className="w-3.5 h-3.5 mr-1 text-[#0066cc]" />
            集計表
          </button>
        )}

        {onToggleIpaBar && (
          <button
            onClick={onToggleIpaBar}
            className={`flex items-center px-2 py-1 border border-[#111111] font-medium transition-colors text-[11px] ${
              showIpaBar
                ? 'bg-[#111111] text-white'
                : 'bg-white hover:bg-[#111111] hover:text-white text-[#111111]'
            }`}
            title="国際音声字母 (IPA) クイック入力バーの表示切替"
          >
            <Languages className={`w-3.5 h-3.5 mr-1 ${showIpaBar ? 'text-[#E30613]' : ''}`} />
            IPA
          </button>
        )}

        <button
          onClick={onOpenAnalysisSettingsModal}
          disabled={!hasAudio}
          className="flex items-center px-2 py-1 border border-[#e0e0e6] hover:border-[#111111] bg-white hover:bg-[#f0f0f4] text-[#111111] font-medium disabled:opacity-20 transition-colors text-[11px]"
          title="Praat音響分析パラメータ設定（広帯域/狭帯域、F0範囲、フォルマント上限等）"
        >
          <Sliders className="w-3.5 h-3.5 mr-1" />
          設定
        </button>

        <button
          onClick={onOpenCustomTextModal}
          disabled={!hasAudio}
          className="flex items-center px-2 py-1 border border-[#e0e0e6] hover:border-[#111111] bg-white hover:bg-[#f0f0f4] text-[#111111] font-medium disabled:opacity-20 transition-colors text-[11px]"
          title="既存のテキスト（台本）から自動で区間を配置"
        >
          <FileText className="w-3.5 h-3.5 mr-1" />
          台本
        </button>

        <button
          onClick={onOpenASRModal}
          disabled={!hasAudio}
          className="flex items-center px-2 py-1 border border-[#111111] bg-[#111111] text-white hover:bg-white hover:text-[#111111] font-bold text-[11px] uppercase tracking-wider disabled:opacity-20 transition-colors"
          title="Praat同様に波形の無音・発話区間を一瞬で自動検出してTextGridを作成"
        >
          <SplitSquareVertical className="w-3.5 h-3.5 mr-1" />
          無音分割
        </button>

        <button
          onClick={onExportTextGrid}
          className="flex items-center px-2 py-1 border border-[#111111] bg-white hover:bg-[#111111] hover:text-white text-[#111111] font-medium transition-colors text-[11px]"
          title="Praat TextGrid形式で保存"
        >
          <Download className="w-3.5 h-3.5 mr-1" />
          TextGrid保存
        </button>

        {onExportSelectedAudio && (
          <button
            onClick={onExportSelectedAudio}
            disabled={!hasAudio || !selection || selection.start === selection.end}
            className="flex items-center px-2 py-1 border border-[#111111] bg-white hover:bg-[#111111] hover:text-white text-[#111111] font-medium disabled:opacity-20 transition-colors text-[11px]"
            title="選択範囲の音声をWAV形式で切り出し保存 (Praat: Extract selected sound)"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-[#E30613]" />
            選択WAV
          </button>
        )}

        {/* Command Palette Button */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center space-x-1 px-2 py-1 border border-[#111111] bg-[#111111] hover:bg-[#333333] text-white font-mono font-bold text-[11px] transition-colors shadow-sm"
            title="コマンドパレットを開く (Ctrl+K / :)"
          >
            <Terminal className="w-3.5 h-3.5 mr-1 text-[#e30613]" />
            <span>⌘K</span>
          </button>
        )}

        {/* Shortcuts Help Button */}
        {onOpenShortcutsModal && (
          <button
            onClick={onOpenShortcutsModal}
            className="flex items-center justify-center w-7 h-7 border border-[#111111] bg-[#f0f0f4] hover:bg-[#111111] hover:text-white text-[#111111] font-mono font-bold text-xs transition-colors ml-1"
            title="操作キー・ショートカット一覧 (?)"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
