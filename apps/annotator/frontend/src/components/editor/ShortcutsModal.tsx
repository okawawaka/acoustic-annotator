'use client';

import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutSections = [
    {
      title: '再生・ナビゲーション (Playback & Navigation)',
      items: [
        { key: 'Space', desc: '音声の再生 / 一時停止' },
        { key: 'Tab', desc: '選択区間の再生 (選択がない場合は最初から再生)' },
        { key: 'Shift + Tab', desc: '前の区間に移動して選択' },
        { key: 'Alt + →', desc: '次の区間に移動して選択' },
        { key: 'Alt + ←', desc: '前の区間に移動して選択' },
      ],
    },
    {
      title: 'TextGrid 編集 (Boundary & Annotation)',
      items: [
        { key: 'Enter', desc: '再生ヘッド位置に新しい境界線を挿入' },
        { key: 'Delete / BS (Alt+Del)', desc: '選択区間の境界線を削除して前後の区間を結合' },
        { key: '文字入力', desc: '区間を選択した状態で直接キー入力するとラベルを編集' },
        { key: 'マウスドラッグ', desc: '波形・スペクトログラム上でドラッグして範囲選択' },
        { key: '境界線上ドラッグ', desc: 'TextGridの境界線を左右にドラッグしてタイミング微調整' },
      ],
    },
    {
      title: '履歴・ズーム (History & View)',
      items: [
        { key: 'Ctrl + Z', desc: '元に戻す (Undo)' },
        { key: 'Ctrl + Y / Shift+Z', desc: 'やり直す (Redo)' },
        { key: 'マウスホイール', desc: 'カーソル位置を中心に時間軸を拡大 / 縮小' },
        { key: 'Shift + ホイール', desc: '時間軸を左右にスクロール' },
      ],
    },
    {
      title: 'コマンド & エクスポート (Commands & Export)',
      items: [
        { key: 'Ctrl + K / :', desc: 'コマンドパレットを開く' },
        { key: 'Shift + E', desc: '選択区間の音声をWAV形式で切り出し保存 (Extract Sound)' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white border-2 border-[#111111] max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="h-11 border-b-2 border-[#111111] px-4 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <Keyboard className="w-4 h-4 text-[#111111]" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#111111]">
              Keyboard Shortcuts &amp; Operations / 操作ガイド
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#111111] hover:text-white transition-colors border border-transparent hover:border-[#111111]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-xs text-[#111111] max-h-[75vh] overflow-y-auto">
          {shortcutSections.map((sec, idx) => (
            <div key={idx} className={idx > 0 ? 'border-t border-[#e0e0e6] pt-4' : ''}>
              <div className="font-mono uppercase tracking-widest text-[#777780] font-bold text-[10px] mb-2.5">
                {sec.title}
              </div>
              <div className="space-y-1.5">
                {sec.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1 px-2 hover:bg-[#f0f0f4] border border-transparent hover:border-[#e0e0e6] transition-colors"
                  >
                    <span className="text-[#333338] font-medium">{item.desc}</span>
                    <kbd className="px-2 py-0.5 bg-[#f0f0f4] border border-[#111111] font-mono font-bold text-[11px] text-[#111111] shadow-[1px_1px_0px_#111111]">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="h-11 border-t-2 border-[#111111] px-4 flex items-center justify-between bg-[#f0f0f4]">
          <span className="text-[10px] text-[#777780] font-mono">
            PRESS ESC TO CLOSE
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 border border-[#111111] bg-[#111111] text-white hover:bg-white hover:text-[#111111] text-xs font-mono font-bold uppercase tracking-wider transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
