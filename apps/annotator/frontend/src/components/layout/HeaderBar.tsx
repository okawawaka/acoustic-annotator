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
}) => {
  return (
    <header className="h-10 flex-shrink-0 flex items-center justify-between px-3 sm:px-4 border-b-2 border-[#111111] bg-white">
      <div className="flex items-center space-x-2 min-w-0">
        <span className="font-extrabold text-xs uppercase tracking-tight text-[#111111]">
          Acoustic Annotator
        </span>
      </div>

      <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs flex-shrink-0">
        <button
          onClick={onOpenMicRecord}
          className="flex items-center px-2.5 sm:px-3 py-1 border border-[#E30613] text-[#E30613] hover:bg-[#E30613] hover:text-white font-bold text-xs uppercase tracking-wider transition-colors duration-150"
          title="マイクから直接録音して分析を開始します"
        >
          <Mic className="w-3.5 h-3.5 sm:mr-1" />
          <span>録音</span>
        </button>
        <button
          onClick={onOpenFileSelect}
          className="flex items-center px-2.5 sm:px-3 py-1 border border-[#111111] bg-[#111111] text-white hover:bg-white hover:text-[#111111] font-bold text-xs uppercase tracking-wider transition-colors duration-150"
          title="音声ファイル（.wav 等）や TextGrid を開きます"
        >
          <FolderOpen className="w-3.5 h-3.5 sm:mr-1" />
          <span>開く</span>
        </button>
      </div>
    </header>
  );
};
