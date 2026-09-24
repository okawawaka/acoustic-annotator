'use client';

import React from 'react';
import { FolderOpen, Mic } from 'lucide-react';

interface HeaderBarProps {
  onOpenMicRecord: () => void;
  onOpenFileSelect: () => void;
  backendStatus?: 'online' | 'standalone' | 'checking';
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onOpenMicRecord,
  onOpenFileSelect,
  backendStatus = 'standalone',
}) => {
  return (
    <header className="h-11 flex-shrink-0 flex items-center justify-between px-2.5 sm:px-4 border-b-2 border-[#111111] bg-white">
      <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0">
        <span className="font-extrabold text-xs uppercase tracking-tight text-[#111111]">
          Acoustic Annotator
        </span>
        <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-[#777780] font-semibold border-l border-[#e0e0e6] pl-3">
          Phonetic Acoustics &amp; Praat TextGrid
        </span>
        {backendStatus === 'online' ? (
          <span
            className="flex items-center space-x-1 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 bg-emerald-700 text-white tracking-wider"
            title="FastAPI バックエンド接続完了 (Whisper ASR / Parselmouth 連携中)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            <span>API Online</span>
          </span>
        ) : (
          <span
            className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 bg-[#111111] text-white tracking-wider"
            title="サーバー通信不要・ブラウザ内完結動作中 (VAD & クライアントDSP)"
          >
            Standalone
          </span>
        )}
      </div>

      <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs flex-shrink-0">
        <button
          onClick={onOpenMicRecord}
          className="flex items-center px-2 sm:px-3 py-1 border border-[#E30613] text-[#E30613] hover:bg-[#E30613] hover:text-white font-bold text-xs uppercase tracking-wider transition-colors duration-150"
          title="マイクから直接録音して分析を開始します"
        >
          <Mic className="w-3.5 h-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">マイク録音</span>
          <span className="sm:hidden ml-1 font-mono text-[10px]">録音</span>
        </button>
        <button
          onClick={onOpenFileSelect}
          className="flex items-center px-2 sm:px-3 py-1 border border-[#111111] bg-[#111111] text-white hover:bg-white hover:text-[#111111] font-bold text-xs uppercase tracking-wider transition-colors duration-150"
          title="音声ファイル（.wav 等）や TextGrid を開きます（同時に複数選択可能）"
        >
          <FolderOpen className="w-3.5 h-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">ファイルを開く</span>
          <span className="sm:hidden ml-1 font-mono text-[10px]">開く</span>
        </button>
      </div>
    </header>
  );
};
