'use client';

import React from 'react';
import {
  X,
  Activity,
  Layers,
  Sparkles,
  AlignLeft,
  Settings,
  Table,
  HelpCircle,
  Command,
  Download,
  Palette,
  FileAudio,
} from 'lucide-react';
import { SpectrogramColorMap } from '@/types';

interface MobileToolsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  showPitch: boolean;
  showFormants: boolean;
  showIntensity: boolean;
  onTogglePitch: () => void;
  onToggleFormants: () => void;
  onToggleIntensity: () => void;
  colorMap: SpectrogramColorMap;
  onChangeColorMap: (c: SpectrogramColorMap) => void;
  onOpenASRModal: () => void;
  onOpenCustomTextModal: () => void;
  onOpenVowelSpaceModal: () => void;
  onOpenSpectralSliceModal: () => void;
  onOpenAnalysisSettingsModal: () => void;
  onOpenAcousticTable: () => void;
  showIpaBar: boolean;
  onToggleIpaBar: () => void;
  onOpenShortcutsModal: () => void;
  onOpenCommandPalette: () => void;
  onExportTextGrid: () => void;
  onExportSelectedAudio: () => void;
  hasAudio: boolean;
  hasSelection: boolean;
}

export const MobileToolsDrawer: React.FC<MobileToolsDrawerProps> = ({
  isOpen,
  onClose,
  showPitch,
  showFormants,
  showIntensity,
  onTogglePitch,
  onToggleFormants,
  onToggleIntensity,
  colorMap,
  onChangeColorMap,
  onOpenASRModal,
  onOpenCustomTextModal,
  onOpenVowelSpaceModal,
  onOpenSpectralSliceModal,
  onOpenAnalysisSettingsModal,
  onOpenAcousticTable,
  showIpaBar,
  onToggleIpaBar,
  onOpenShortcutsModal,
  onOpenCommandPalette,
  onExportTextGrid,
  onExportSelectedAudio,
  hasAudio,
  hasSelection,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-[#111111]/60 backdrop-blur-none animate-fadeIn">
      <div className="bg-white border-t-2 border-[#111111] max-h-[80vh] flex flex-col text-[#111111] shadow-2xl">
        {/* Header */}
        <div className="h-11 px-4 border-b border-[#e0e0e6] flex items-center justify-between bg-[#f9f9fb] flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-xs uppercase tracking-wider text-[#111111]">
              Tools &amp; Settings (ツール・設定)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-[#e0e0e6] hover:bg-[#111111] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-5 text-xs">
          {/* Display Overlays */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#777780] mb-2 font-mono">
              Overlay Displays (描画オーバーレイ)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={onTogglePitch}
                className={`py-2 px-2 border text-center font-bold text-xs uppercase tracking-wider transition-colors ${
                  showPitch
                    ? 'border-[#2563eb] bg-[#2563eb] text-white'
                    : 'border-[#e0e0e6] bg-[#f9f9fb] text-[#111111]'
                }`}
              >
                Pitch (F0)
              </button>
              <button
                onClick={onToggleFormants}
                className={`py-2 px-2 border text-center font-bold text-xs uppercase tracking-wider transition-colors ${
                  showFormants
                    ? 'border-[#E30613] bg-[#E30613] text-white'
                    : 'border-[#e0e0e6] bg-[#f9f9fb] text-[#111111]'
                }`}
              >
                Formants
              </button>
              <button
                onClick={onToggleIntensity}
                className={`py-2 px-2 border text-center font-bold text-xs uppercase tracking-wider transition-colors ${
                  showIntensity
                    ? 'border-[#10b981] bg-[#10b981] text-white'
                    : 'border-[#e0e0e6] bg-[#f9f9fb] text-[#111111]'
                }`}
              >
                Intensity
              </button>
            </div>
          </div>

          {/* Color Map */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#777780] mb-2 font-mono">
              Spectrogram Color (カラーマップ)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['grayscale', 'dark', 'color'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => onChangeColorMap(c)}
                  className={`py-1.5 px-2 border text-center text-xs font-mono capitalize transition-colors ${
                    colorMap === c
                      ? 'border-[#111111] bg-[#111111] text-white font-bold'
                      : 'border-[#e0e0e6] bg-white text-[#111111]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Acoustic Analysis Features */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#777780] mb-2 font-mono">
              Acoustic Tools (音響分析機能)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenVowelSpaceModal();
                }}
                disabled={!hasAudio}
                className="flex items-center space-x-2 p-2 border border-[#111111] bg-white text-[#111111] active:bg-[#111111] active:text-white disabled:opacity-30 text-left"
              >
                <Layers className="w-4 h-4 text-[#E30613] flex-shrink-0" />
                <span className="font-bold text-[11px]">母音空間 (F1/F2)</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenSpectralSliceModal();
                }}
                disabled={!hasAudio}
                className="flex items-center space-x-2 p-2 border border-[#111111] bg-white text-[#111111] active:bg-[#111111] active:text-white disabled:opacity-30 text-left"
              >
                <Activity className="w-4 h-4 text-[#2563eb] flex-shrink-0" />
                <span className="font-bold text-[11px]">スペクトル断面 (LPC)</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenAcousticTable();
                }}
                disabled={!hasAudio}
                className="flex items-center space-x-2 p-2 border border-[#111111] bg-white text-[#111111] active:bg-[#111111] active:text-white disabled:opacity-30 text-left"
              >
                <Table className="w-4 h-4 text-[#10b981] flex-shrink-0" />
                <span className="font-bold text-[11px]">音響測定値一覧表</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenAnalysisSettingsModal();
                }}
                className="flex items-center space-x-2 p-2 border border-[#111111] bg-white text-[#111111] active:bg-[#111111] active:text-white text-left"
              >
                <Settings className="w-4 h-4 text-[#777780] flex-shrink-0" />
                <span className="font-bold text-[11px]">Praat分析設定</span>
              </button>
            </div>
          </div>

          {/* AI & Speech Alignment */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#777780] mb-2 font-mono">
              Speech &amp; Transcription (音声認識・強制アラインメント)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenASRModal();
                }}
                disabled={!hasAudio}
                className="flex items-center space-x-2 p-2 border border-[#111111] bg-white text-[#111111] active:bg-[#111111] active:text-white disabled:opacity-30 text-left"
              >
                <Sparkles className="w-4 h-4 text-[#E30613] flex-shrink-0" />
                <span className="font-bold text-[11px]">Whisper ASR自動認識</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenCustomTextModal();
                }}
                disabled={!hasAudio}
                className="flex items-center space-x-2 p-2 border border-[#111111] bg-white text-[#111111] active:bg-[#111111] active:text-white disabled:opacity-30 text-left"
              >
                <AlignLeft className="w-4 h-4 text-[#111111] flex-shrink-0" />
                <span className="font-bold text-[11px]">テキスト自動同期</span>
              </button>
            </div>
          </div>

          {/* Input & Export */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#777780] mb-2 font-mono">
              Input &amp; Export (入力・書き出し)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onToggleIpaBar();
                  onClose();
                }}
                className={`flex items-center space-x-2 p-2 border transition-colors text-left ${
                  showIpaBar
                    ? 'border-[#111111] bg-[#111111] text-white'
                    : 'border-[#111111] bg-white text-[#111111] active:bg-[#f0f0f4]'
                }`}
              >
                <Palette className="w-4 h-4 flex-shrink-0" />
                <span className="font-bold text-[11px]">IPA記号バー {showIpaBar ? 'OFF' : 'ON'}</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onExportTextGrid();
                }}
                disabled={!hasAudio}
                className="flex items-center space-x-2 p-2 border border-[#111111] bg-white text-[#111111] active:bg-[#111111] active:text-white disabled:opacity-30 text-left"
              >
                <Download className="w-4 h-4 text-[#2563eb] flex-shrink-0" />
                <span className="font-bold text-[11px]">TextGrid 保存</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onExportSelectedAudio();
                }}
                disabled={!hasAudio || !hasSelection}
                className="flex items-center space-x-2 p-2 border border-[#111111] bg-white text-[#111111] active:bg-[#111111] active:text-white disabled:opacity-30 text-left col-span-2"
              >
                <FileAudio className="w-4 h-4 text-[#E30613] flex-shrink-0" />
                <span className="font-bold text-[11px]">選択区間をWAV保存 (Praat: Extract Sound)</span>
              </button>
            </div>
          </div>

          {/* Shortcuts & Commands */}
          <div className="pt-2 border-t border-[#e0e0e6] flex items-center justify-between">
            <button
              onClick={() => {
                onClose();
                onOpenCommandPalette();
              }}
              className="flex items-center space-x-1.5 text-xs text-[#777780] hover:text-[#111111] font-mono"
            >
              <Command className="w-3.5 h-3.5" />
              <span>コマンドパレット</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenShortcutsModal();
              }}
              className="flex items-center space-x-1.5 text-xs text-[#777780] hover:text-[#111111] font-mono"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>ショートカット一覧</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};