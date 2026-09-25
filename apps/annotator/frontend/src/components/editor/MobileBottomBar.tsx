'use client';

import React from 'react';
import {
  Play,
  Pause,
  Mic,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Activity,
  MoreHorizontal,
  Type,
  SplitSquareVertical,
} from 'lucide-react';

interface MobileBottomBarProps {
  isPlaying: boolean;
  hasAudio: boolean;
  hasSelection: boolean;
  onTogglePlay: () => void;
  onPlaySelection?: () => void;
  onOpenRecordModal: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleInspector: () => void;
  isInspectorOpen: boolean;
  onOpenToolsMenu: () => void;
  onToggleLabelEditor?: () => void;
  isLabelEditorOpen?: boolean;
  onInsertBoundary?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  isPlaying,
  hasAudio,
  hasSelection,
  onTogglePlay,
  onPlaySelection,
  onOpenRecordModal,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleInspector,
  isInspectorOpen,
  onOpenToolsMenu,
  onToggleLabelEditor,
  isLabelEditorOpen = false,
  onInsertBoundary,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  return (
    <div className="md:hidden flex-shrink-0 bg-white border-t-2 border-[#111111] z-30 select-none pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 px-2">
      <div className="flex items-center justify-between gap-1 max-w-lg mx-auto">
        {/* Record (Primary Mobile Action) */}
        <button
          onClick={onOpenRecordModal}
          className="flex flex-col items-center justify-center flex-1 py-1 px-1 bg-[#E30613] text-white active:bg-[#b0050f] rounded-none transition-colors border border-[#E30613]"
          title="マイク録音 (PCM)"
        >
          <Mic className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] font-bold uppercase tracking-wider font-mono">録音</span>
        </button>

        {/* Play/Pause Main */}
        <button
          onClick={onTogglePlay}
          disabled={!hasAudio}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 border border-[#111111] transition-colors ${
            isPlaying
              ? 'bg-[#111111] text-white'
              : 'bg-white text-[#111111] active:bg-[#111111] active:text-white disabled:opacity-30'
          }`}
          title={isPlaying ? '一時停止 (Space)' : '全体再生 (Space)'}
        >
          {isPlaying ? <Pause className="w-4 h-4 mb-0.5" /> : <Play className="w-4 h-4 mb-0.5" />}
          <span className="text-[9px] font-bold uppercase tracking-wider font-mono">
            {isPlaying ? '停止' : '再生'}
          </span>
        </button>

        {/* Label Editor Toggle (When Selection is active) */}
        {hasSelection && onToggleLabelEditor ? (
          <button
            onClick={onToggleLabelEditor}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 border transition-colors ${
              isLabelEditorOpen
                ? 'bg-[#111111] text-white border-[#111111]'
                : 'bg-[#f0f0f4] text-[#111111] border-[#111111] active:bg-[#111111] active:text-white'
            }`}
            title="選択区間のテキスト入力・IPA記号パレット"
          >
            <Type className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] font-bold uppercase tracking-wider font-mono">文字入力</span>
          </button>
        ) : onInsertBoundary ? (
          <button
            onClick={onInsertBoundary}
            disabled={!hasAudio}
            className="flex flex-col items-center justify-center flex-1 py-1 px-1 bg-white border border-[#111111] text-[#111111] active:bg-[#111111] active:text-white disabled:opacity-30 transition-colors"
            title="現在位置に境界線を挿入"
          >
            <SplitSquareVertical className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] font-bold uppercase tracking-wider font-mono">+境界</span>
          </button>
        ) : null}

        {/* Zoom Controls Compact */}
        <div className="flex items-center border border-[#111111] bg-[#f9f9fb]">
          <button
            onClick={onZoomIn}
            disabled={!hasAudio}
            className="p-1.5 text-[#111111] active:bg-[#111111] active:text-white disabled:opacity-30 border-r border-[#e0e0e6]"
            title="ズームイン (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onZoomOut}
            disabled={!hasAudio}
            className="p-1.5 text-[#111111] active:bg-[#111111] active:text-white disabled:opacity-30 border-r border-[#e0e0e6]"
            title="ズームアウト (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetZoom}
            disabled={!hasAudio}
            className="p-1.5 text-[#111111] active:bg-[#111111] active:text-white disabled:opacity-30"
            title="全体表示 (ALL)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Inspector Bottom Sheet Toggle */}
        <button
          onClick={onToggleInspector}
          disabled={!hasAudio}
          className={`flex flex-col items-center justify-center flex-1 py-1 px-1 border transition-colors ${
            isInspectorOpen
              ? 'bg-[#111111] text-white border-[#111111]'
              : 'bg-white text-[#111111] border-[#111111] active:bg-[#f0f0f4] disabled:opacity-30'
          }`}
          title="音響インスペクター (F0/フォルマント値)"
        >
          <Activity className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] font-bold uppercase tracking-wider font-mono">分析値</span>
        </button>

        {/* More Tools Drawer Toggle */}
        <button
          onClick={onOpenToolsMenu}
          className="flex flex-col items-center justify-center flex-1 py-1 px-1 bg-white text-[#111111] border border-[#111111] active:bg-[#111111] active:text-white transition-colors"
          title="すべてのツールと設定"
        >
          <MoreHorizontal className="w-4 h-4 mb-0.5" />
          <span className="text-[9px] font-bold uppercase tracking-wider font-mono">メニュー</span>
        </button>
      </div>
    </div>
  );
};