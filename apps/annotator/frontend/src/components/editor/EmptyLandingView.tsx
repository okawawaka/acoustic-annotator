'use client';

import React from 'react';
import { FolderOpen, Mic } from 'lucide-react';

interface EmptyLandingViewProps {
  isDraggingFile: boolean;
  onOpenFileSelect: () => void;
  onOpenMicRecord: () => void;
}

export const EmptyLandingView: React.FC<EmptyLandingViewProps> = ({
  isDraggingFile,
  onOpenFileSelect,
  onOpenMicRecord,
}) => {
  return (
    <>
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-[#111111]/70 backdrop-blur-none flex items-center justify-center pointer-events-none">
          <div className="bg-white px-8 py-6 border-2 border-[#111111] text-xs font-bold uppercase tracking-widest text-[#111111]">
            Drop Audio &amp; TextGrid Files Here
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#f9f9fb]">
        <div className="text-center mb-8">
          <div className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#777780] mb-2 border-b-2 border-[#111111] pb-1">
            Acoustic Analysis &amp; Annotation Workspace
          </div>
          <h2 className="text-xl font-extrabold uppercase tracking-tight text-[#111111]">
            音声分析・アノテーションの開始
          </h2>
          <p className="text-xs text-[#777780] mt-1 font-mono">
            SELECT A LOCAL FILE OR RECORD DIRECTLY IN THE BROWSER
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl w-full">
          {/* Option 1: File Open */}
          <div
            onClick={onOpenFileSelect}
            className="p-8 border-2 border-[#111111] bg-white hover:bg-[#111111] hover:text-white cursor-pointer transition-colors duration-150 flex flex-col group text-left relative"
          >
            <div className="w-12 h-12 border border-[#111111] group-hover:border-white bg-[#f0f0f4] group-hover:bg-white text-[#111111] flex items-center justify-center mb-5 transition-colors">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div className="text-xs font-mono uppercase tracking-widest text-[#777780] group-hover:text-white/60 mb-1">
              Option 01 / Batch Load
            </div>
            <div className="text-base font-bold uppercase tracking-wider mb-2">
              ファイルを開く
            </div>
            <div className="text-xs text-[#52525b] group-hover:text-white/80 leading-relaxed font-mono">
              WAV / MP3 等の音声ファイルと TextGrid を同時に選択可能。ドラッグ＆ドロップにも対応しています。
            </div>
          </div>

          {/* Option 2: Mic Recording */}
          <div
            onClick={onOpenMicRecord}
            className="p-8 border-2 border-[#E30613] bg-white hover:bg-[#E30613] hover:text-white cursor-pointer transition-colors duration-150 flex flex-col group text-left relative"
          >
            <div className="w-12 h-12 border border-[#E30613] group-hover:border-white bg-[#E30613]/10 group-hover:bg-white text-[#E30613] flex items-center justify-center mb-5 transition-colors">
              <Mic className="w-6 h-6" />
            </div>
            <div className="text-xs font-mono uppercase tracking-widest text-[#E30613] group-hover:text-white/60 mb-1">
              Option 02 / Direct Input
            </div>
            <div className="text-base font-bold uppercase tracking-wider mb-2 text-[#E30613] group-hover:text-white">
              マイクで録音する
            </div>
            <div className="text-xs text-[#52525b] group-hover:text-white/80 leading-relaxed font-mono">
              ブラウザ内マイクから高品質PCM録音。波形・ピッチ・フォルマントをその場で即座に分析します。
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
