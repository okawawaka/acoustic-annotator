'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Check,
  X,
  Volume2,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface MobileLabelEditorBarProps {
  selectedLabel: string | null;
  selection: { start: number; end: number } | null;
  activeTierName?: string;
  onUpdateLabel: (newLabel: string, targetInterval?: { start: number; end: number }) => void;
  onSelectPrevInterval: () => void;
  onSelectNextInterval: () => void;
  onPlaySelection: () => void;
  onDeleteBoundary?: () => void;
  onClose?: () => void;
}

// Mobile-friendly categorized IPA presets for quick thumb-typing
const MOBILE_IPA_TABS = [
  {
    name: '母音 (Vowels)',
    symbols: [
      { sym: 'a', name: '非円唇前舌広母音' },
      { sym: 'i', name: '非円唇前舌狭母音' },
      { sym: 'u', name: '円唇後舌狭母音' },
      { sym: 'e', name: '非円唇前舌半狭母音' },
      { sym: 'o', name: '円唇後舌半狭母音' },
      { sym: 'ə', name: 'シュワー (中央母音)' },
      { sym: 'ɪ', name: '非円唇前舌準狭母音 (bit)' },
      { sym: 'ʊ', name: '円唇後舌準狭母音 (book)' },
      { sym: 'ɛ', name: '非円唇前舌半広母音 (bed)' },
      { sym: 'ɔ', name: '円唇後舌半広母音 (law)' },
      { sym: 'æ', name: '非円唇前舌準広母音 (cat)' },
      { sym: 'ʌ', name: '非円唇後舌半広母音 (cup)' },
      { sym: 'ɑ', name: '非円唇後舌広母音 (father)' },
      { sym: 'ɯ', name: '非円唇後舌狭母音 (日本語のう)' },
      { sym: 'ɨ', name: '非円唇中舌狭母音' },
      { sym: 'ʉ', name: '円唇中舌狭母音' },
      { sym: 'y', name: '円唇前舌狭母音' },
      { sym: 'ø', name: '円唇前舌半狭母音' },
      { sym: 'œ', name: '円唇前舌半広母音' },
    ],
  },
  {
    name: '子音 (Consonants)',
    symbols: [
      { sym: 'p', name: '無声両唇破裂音' },
      { sym: 'b', name: '有声両唇破裂音' },
      { sym: 't', name: '無声歯茎破裂音' },
      { sym: 'd', name: '有声歯茎破裂音' },
      { sym: 'k', name: '無声軟口蓋破裂音' },
      { sym: 'g', name: '有声軟口蓋破裂音' },
      { sym: 'ʔ', name: '声門閉鎖音' },
      { sym: 's', name: '無声歯茎摩擦音' },
      { sym: 'z', name: '有声歯茎摩擦音' },
      { sym: 'ʃ', name: '無声後部歯茎摩擦音 (sh)' },
      { sym: 'ʒ', name: '有声後部歯茎摩擦音 (measure)' },
      { sym: 'tʃ', name: '無声後部歯茎破擦音 (ch)' },
      { sym: 'dʒ', name: '有声後部歯茎破擦音 (j)' },
      { sym: 'm', name: '両唇鼻音' },
      { sym: 'n', name: '歯茎鼻音' },
      { sym: 'ŋ', name: '軟口蓋鼻音 (sing)' },
      { sym: 'ɲ', name: '硬口蓋鼻音 (にゃ)' },
      { sym: 'r', name: '歯茎ふるえ音' },
      { sym: 'ɾ', name: '歯茎はじき音 (日本語のら行)' },
      { sym: 'l', name: '歯茎側面接近音' },
      { sym: 'j', name: '硬口蓋接近音 (y)' },
      { sym: 'w', name: '有声両唇軟口蓋接近音' },
      { sym: 'f', name: '無声唇歯摩擦音' },
      { sym: 'v', name: '有声唇歯摩擦音' },
      { sym: 'θ', name: '無声歯摩擦音 (th)' },
      { sym: 'ð', name: '有声歯摩擦音 (this)' },
      { sym: 'h', name: '無声声門摩擦音' },
      { sym: 'ç', name: '無声硬口蓋摩擦音 (ひ)' },
      { sym: 'ɸ', name: '無声両唇摩擦音 (ふ)' },
    ],
  },
  {
    name: '記号・注釈 (Symbols)',
    symbols: [
      { sym: 'ː', name: '長音記号' },
      { sym: 'ʰ', name: '有気音記号' },
      { sym: 'ʲ', name: '口蓋化記号' },
      { sym: 'ʷ', name: '唇音化記号' },
      { sym: 'ˤ', name: '咽頭化記号' },
      { sym: '̃', name: '鼻音化記号' },
      { sym: 'ˈ', name: '第1強勢' },
      { sym: 'ˌ', name: '第2強勢' },
      { sym: 'sil', name: '無音区間 (silence)' },
      { sym: 'sp', name: 'ポーズ・休止 (short pause)' },
      { sym: '#', name: '語境界' },
      { sym: '.', name: '音節境界' },
    ],
  },
];

export const MobileLabelEditorBar: React.FC<MobileLabelEditorBarProps> = ({
  selectedLabel,
  selection,
  activeTierName,
  onUpdateLabel,
  onSelectPrevInterval,
  onSelectNextInterval,
  onPlaySelection,
  onDeleteBoundary,
  onClose,
}) => {
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus preservation helper for inserting symbols at cursor position
  const handleInsertSymbol = (sym: string) => {
    if (!selection) return;
    const input = inputRef.current;
    const currentVal = selectedLabel || '';

    if (input) {
      const start = input.selectionStart ?? currentVal.length;
      const end = input.selectionEnd ?? currentVal.length;
      const nextVal = currentVal.slice(0, start) + sym + currentVal.slice(end);
      onUpdateLabel(nextVal, selection);

      // Restore cursor position right after the inserted symbol
      requestAnimationFrame(() => {
        if (inputRef.current) {
          const newPos = start + sym.length;
          inputRef.current.setSelectionRange(newPos, newPos);
          inputRef.current.focus();
        }
      });
    } else {
      onUpdateLabel(currentVal + sym, selection);
    }
  };

  const handleClear = () => {
    if (!selection) return;
    onUpdateLabel('', selection);
    inputRef.current?.focus();
  };

  if (!selection) return null;

  const durationSec = Math.abs(selection.end - selection.start);

  return (
    <div className="md:hidden flex-shrink-0 bg-white border-t-2 border-[#111111] z-30 select-none shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
      {/* Top Meta & Nav Bar */}
      <div className="h-8 px-2 bg-[#f0f0f4] border-b border-[#e0e0e6] flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center space-x-1.5 truncate">
          <span className="font-bold text-[#E30613] bg-[#E30613]/10 px-1 py-0.5 uppercase tracking-tight text-[10px]">
            {activeTierName || 'Tier'}
          </span>
          <span className="text-[#111111] font-semibold">
            {selection.start.toFixed(3)} - {selection.end.toFixed(3)}s
          </span>
          <span className="text-[#777780] text-[10px]">({durationSec.toFixed(3)}s)</span>
        </div>

        <div className="flex items-center space-x-1 flex-shrink-0">
          {onDeleteBoundary && (
            <button
              type="button"
              onClick={onDeleteBoundary}
              className="p-1 px-1.5 bg-white border border-[#E30613] active:bg-[#E30613] active:text-white text-[#E30613] flex items-center space-x-0.5 text-[10px] font-bold transition-colors"
              title="この区間の境界を削除して直前区間とマージ"
            >
              <Trash2 className="w-3 h-3" />
              <span>削除</span>
            </button>
          )}
          <button
            type="button"
            onClick={onPlaySelection}
            className="p-1 px-1.5 bg-white border border-[#111111] active:bg-[#111111] active:text-white text-[#111111] flex items-center space-x-0.5 text-[10px] font-bold"
            title="選択区間を再生"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>再生</span>
          </button>
          <button
            type="button"
            onClick={onSelectPrevInterval}
            className="p-1 bg-white border border-[#111111] active:bg-[#111111] active:text-white text-[#111111]"
            title="前の区間"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onSelectNextInterval}
            className="p-1 bg-white border border-[#111111] active:bg-[#111111] active:text-white text-[#111111]"
            title="次の区間"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[#777780] hover:text-[#111111]"
              title="閉じる"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Text Input Field (16px base font to prevent iOS Safari auto-zoom) */}
      <div className="p-2 flex items-center space-x-1.5 bg-white border-b border-[#e0e0e6]">
        <div className="relative flex-1 flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={selectedLabel ?? ''}
            onChange={(e) => {
              if (selection) {
                onUpdateLabel(e.target.value, selection);
              }
            }}
            placeholder="ラベルを入力 (例: a, ʃ, sil)..."
            className="w-full h-10 px-3 pr-8 bg-[#f9f9fb] border-2 border-[#111111] text-[#111111] font-sans font-bold text-base outline-none focus:bg-white focus:border-[#E30613] transition-colors"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          {selectedLabel && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 p-1 text-[#777780] hover:text-[#111111]"
              title="クリア"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.blur()}
          className="h-10 px-3 bg-[#111111] text-white border-2 border-[#111111] active:bg-[#E30613] active:border-[#E30613] font-bold text-xs uppercase tracking-wider flex items-center justify-center transition-colors"
          title="確定"
        >
          <Check className="w-4 h-4 mr-1" />
          確定
        </button>
      </div>

      {/* Thumb-friendly IPA Virtual Keyboard Bar */}
      <div className="bg-[#f9f9fb] p-1.5 space-y-1.5">
        {/* Category Tabs */}
        <div className="flex border-b border-[#e0e0e6] pb-1 space-x-1 overflow-x-auto">
          {MOBILE_IPA_TABS.map((tab, idx) => (
            <button
              key={tab.name}
              type="button"
              onClick={() => setActiveTabIdx(idx)}
              className={`px-2 py-1 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors border ${
                activeTabIdx === idx
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-white text-[#777780] border-[#e0e0e6] active:bg-[#f0f0f4]'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Big Tap IPA Buttons (min 36x36px for ergonomic touch interaction) */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-1 px-0.5 scrollbar-thin">
          {MOBILE_IPA_TABS[activeTabIdx].symbols.map(({ sym, name }) => (
            <button
              key={sym}
              type="button"
              onClick={() => handleInsertSymbol(sym)}
              className="min-w-[38px] h-9 px-2 bg-white border border-[#111111] active:bg-[#E30613] active:text-white active:border-[#E30613] text-[#111111] font-sans font-bold text-base flex flex-col items-center justify-center transition-colors shadow-xs flex-shrink-0"
              title={`${sym} (${name})`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
