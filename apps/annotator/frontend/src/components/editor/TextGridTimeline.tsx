'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Tier, IntervalEntry, PointEntry } from '@/types';
import { Plus, Trash2, Check, Scissors, Undo2, Redo2 } from 'lucide-react';

const QUICK_IPA_SYMBOLS = [
  { sym: 'ɯ', name: '非円唇後舌狭母音 (日本語「う」)' },
  { sym: 'ə', name: '曖昧母音 (シュワー)' },
  { sym: 'ː', name: 'IPA長音記号 (三角コロン)' },
  { sym: '̥', name: '無声音化記号' },
  { sym: 'ɕ', name: '無声歯茎硬口蓋摩擦音 (「し」子音)' },
  { sym: 'ʑ', name: '有声歯茎硬口蓋摩擦音 (「じ」子音)' },
  { sym: 'ç', name: '無声硬口蓋摩擦音 (「ひ」子音)' },
  { sym: 'ɸ', name: '無声両唇摩擦音 (「ふ」子音)' },
  { sym: 'ɾ', name: '歯茎はじき音 (「ら行」子音)' },
  { sym: 'ɴ', name: '口蓋垂鼻音 (語末「ん」)' },
  { sym: 'ŋ', name: '軟口蓋鼻音 (鼻濁音/ン)' },
  { sym: 'ɲ', name: '硬口蓋鼻音 (「に」子音)' },
  { sym: 'ʔ', name: '声門破裂音 (促音/語頭)' },
  { sym: 't͡ɕ', name: '無声歯茎硬口蓋破擦音 (「ち」)' },
  { sym: 'd͡ʑ', name: '有声歯茎硬口蓋破擦音 (「じ」)' },
  { sym: 't͡s', name: '無声歯茎破擦音 (「つ」)' },
];

const IPA_CATEGORIES: { category: string; symbols: { sym: string; name: string }[] }[] = [
  {
    category: '日本語・高頻度',
    symbols: [
      { sym: 'ɯ', name: '非円唇後舌狭母音 (う)' },
      { sym: 'ə', name: '曖昧母音 (シュワー)' },
      { sym: 'ː', name: 'IPA長音記号 (三角コロン)' },
      { sym: '̥', name: '無声音化記号' },
      { sym: 'ɕ', name: '無声歯茎硬口蓋摩擦音 (シ)' },
      { sym: 'ʑ', name: '有声歯茎硬口蓋摩擦音 (ジ)' },
      { sym: 'ç', name: '無声硬口蓋摩擦音 (ヒ)' },
      { sym: 'ɸ', name: '無声両唇摩擦音 (フ)' },
      { sym: 'ɾ', name: '歯茎はじき音 (ラ行)' },
      { sym: 'ɴ', name: '口蓋垂鼻音 (語末ン)' },
      { sym: 'ŋ', name: '軟口蓋鼻音 (鼻濁音)' },
      { sym: 'ɲ', name: '硬口蓋鼻音 (ニ)' },
      { sym: 'ʔ', name: '声門破裂音 (促音)' },
      { sym: 't͡ɕ', name: '無声歯茎硬口蓋破擦音 (チ)' },
      { sym: 'd͡ʑ', name: '有声歯茎硬口蓋破擦音 (ジ)' },
      { sym: 't͡s', name: '無声歯茎破擦音 (ツ)' },
      { sym: 'd͡z', name: '有声歯茎破擦音 (ズ)' },
      { sym: 'β', name: '有声両唇摩擦音' },
      { sym: 'ɣ', name: '有声軟口蓋摩擦音' },
    ],
  },
  {
    category: '母音',
    symbols: [
      { sym: 'ɯ', name: '非円唇後舌狭母音' },
      { sym: 'ə', name: '曖昧母音 (シュワー)' },
      { sym: 'ɪ', name: '準狭準前舌母音' },
      { sym: 'ʊ', name: '準狭準後舌母音' },
      { sym: 'ɛ', name: '半広前舌母音 (開いたエ)' },
      { sym: 'ɔ', name: '半広後舌母音 (開いたオ)' },
      { sym: 'æ', name: '準広前舌母音' },
      { sym: 'ɑ', name: '非円唇後舌広母音' },
      { sym: 'ʌ', name: '非円唇後舌半広母音' },
      { sym: 'ɤ', name: '非円唇後舌半狭母音' },
      { sym: 'ɨ', name: '非円唇中舌狭母音' },
      { sym: 'ʉ', name: '円唇中舌狭母音' },
      { sym: 'y', name: '円唇前舌狭母音' },
      { sym: 'ø', name: '円唇前舌半狭母音' },
      { sym: 'œ', name: '円唇前舌半広母音' },
      { sym: 'ɒ', name: '円唇後舌広母音' },
    ],
  },
  {
    category: '子音',
    symbols: [
      { sym: 'ɕ', name: '無声歯茎硬口蓋摩擦音' },
      { sym: 'ʑ', name: '有声歯茎硬口蓋摩擦音' },
      { sym: 'ç', name: '無声硬口蓋摩擦音' },
      { sym: 'ɸ', name: '無声両唇摩擦音' },
      { sym: 'β', name: '有声両唇摩擦音' },
      { sym: 'ɾ', name: '歯茎はじき音' },
      { sym: 'ɹ', name: '歯茎接近音' },
      { sym: 'ɴ', name: '口蓋垂鼻音' },
      { sym: 'ŋ', name: '軟口蓋鼻音' },
      { sym: 'ɲ', name: '硬口蓋鼻音' },
      { sym: 'ɱ', name: '唇歯鼻音' },
      { sym: 'ʔ', name: '声門破裂音' },
      { sym: 'θ', name: '無声歯摩擦音' },
      { sym: 'ð', name: '有声歯摩擦音' },
      { sym: 'ʃ', name: '無声後部歯茎摩擦音' },
      { sym: 'ʒ', name: '有声後部歯茎摩擦音' },
      { sym: 'χ', name: '無声口蓋垂摩擦音' },
      { sym: 'ʁ', name: '有声口蓋垂摩擦音' },
      { sym: 'ɣ', name: '有声軟口蓋摩擦音' },
    ],
  },
  {
    category: '補助・記号',
    symbols: [
      { sym: 'ː', name: 'IPA長音記号 (三角コロン)' },
      { sym: 'ˑ', name: '半長音' },
      { sym: '̥', name: '無声音化記号' },
      { sym: '̬', name: '有声音化記号' },
      { sym: '̃', name: '鼻音化記号' },
      { sym: 'ʰ', name: '有気音' },
      { sym: 'ʲ', name: '口蓋化' },
      { sym: 'ʷ', name: '唇音化' },
      { sym: 'ˈ', name: '第1強勢' },
      { sym: 'ˌ', name: '第2強勢' },
      { sym: '.', name: '音節境界' },
    ],
  },
];

interface TextGridTimelineProps {
  tiers: Tier[];
  duration: number;
  currentTime: number;
  viewRange: { start: number; end: number };
  selection: { start: number; end: number } | null;
  selectedLabel?: string | null;
  hoverTime: number | null;
  activeTierIdx: number;
  onSelectTier: (idx: number) => void;
  onHoverTimeChange: (time: number | null) => void;
  onUpdateTiers: (tiers: Tier[], saveHistory?: boolean) => void;
  onSelectInterval: (start: number, end: number, label?: string) => void;
  onSeek?: (time: number) => void;
  onUpdateSelectedLabel?: (label: string) => void;
  onInsertBoundaryAt?: (time: number) => void;
  onDeleteBoundary?: () => void;
  onSelectPrevInterval?: () => void;
  onSelectNextInterval?: () => void;
  onPlaySelection?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onBoundaryDragStart?: () => void;
}

export const TextGridTimeline: React.FC<TextGridTimelineProps> = ({
  tiers,
  duration,
  currentTime,
  viewRange,
  selection,
  selectedLabel,
  hoverTime,
  activeTierIdx,
  onSelectTier,
  onHoverTimeChange,
  onUpdateTiers,
  onSelectInterval,
  onSeek,
  onUpdateSelectedLabel,
  onInsertBoundaryAt,
  onDeleteBoundary,
  onSelectPrevInterval,
  onSelectNextInterval,
  onPlaySelection,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onBoundaryDragStart,
}) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const labelInputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const [showIpaPalette, setShowIpaPalette] = useState(false);
  const [activeIpaTab, setActiveIpaTab] = useState(0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setShowIpaPalette(false);
      }
    };
    if (showIpaPalette) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showIpaPalette]);

  const handleInsertChar = (char: string) => {
    if (!selection) return;
    const input = labelInputRef.current;
    if (!input) {
      onUpdateSelectedLabel?.((selectedLabel ?? '') + char);
      return;
    }
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const currentVal = input.value;
    const nextVal = currentVal.substring(0, start) + char + currentVal.substring(end);
    onUpdateSelectedLabel?.(nextVal);

    setTimeout(() => {
      input.focus();
      const newPos = start + char.length;
      input.setSelectionRange(newPos, newPos);
    }, 10);
  };
  
  const resizeRef = useRef<{
    tierIdx: number;
    entryIdx: number;
    startX: number;
    initialEnd: number;
    containerWidth: number;
  } | null>(null);

  const viewSpan = Math.max(0.001, viewRange.end - viewRange.start);

  const timeToPercent = (time: number) => {
    return ((time - viewRange.start) / viewSpan) * 100;
  };

  const handleAddTier = (type: 'interval' | 'point') => {
    const name = prompt(type === 'interval' ? '新規区間ティア名 (例: Word, Phone):' : '新規ポイントティア名:');
    if (!name) return;
    const newTier: Tier = {
      name,
      tier_type: type,
      min_timestamp: 0,
      max_timestamp: duration,
      entries: type === 'interval' ? [{ start: 0, end: duration, label: '' }] : [],
    };
    onUpdateTiers([...tiers, newTier], true);
  };

  const handleDeleteTier = (idx: number) => {
    const tierName = tiers[idx]?.name;
    if (confirm(`ティア「${tierName}」を削除しますか？`)) {
      onUpdateTiers(tiers.filter((_, i) => i !== idx), true);
    }
  };

  const handleAddSelectionToTier = (tierIdx: number) => {
    if (!selection) return;
    const s = Math.min(selection.start, selection.end);
    const e = Math.max(selection.start, selection.end);
    if (e - s < 0.01) return;

    const label = prompt('新規区間のラベルを入力:') || '';
    const newTiers = [...tiers];
    const targetTier = { ...newTiers[tierIdx] };

    if (targetTier.tier_type === 'interval') {
      const entries = [...(targetTier.entries as IntervalEntry[])];
      entries.push({ start: s, end: e, label });
      entries.sort((a, b) => a.start - b.start);
      targetTier.entries = entries;
    }
    newTiers[tierIdx] = targetTier;
    onUpdateTiers(newTiers, true);
  };

  const handleSplitInterval = (tierIdx: number) => {
    const newTiers = [...tiers];
    const targetTier = { ...newTiers[tierIdx] };
    if (targetTier.tier_type !== 'interval') return;

    const entries = [...(targetTier.entries as IntervalEntry[])];
    const idx = entries.findIndex(e => e.start <= currentTime && e.end >= currentTime);
    if (idx !== -1) {
      const target = entries[idx];
      if (currentTime - target.start > 0.02 && target.end - currentTime > 0.02) {
        entries.splice(
          idx,
          1,
          { start: target.start, end: currentTime, label: target.label },
          { start: currentTime, end: target.end, label: '' }
        );
        targetTier.entries = entries;
        newTiers[tierIdx] = targetTier;
        onUpdateTiers(newTiers, true);
      }
    }
  };

  const startEditLabel = (tierIdx: number, entryIdx: number, initialText: string) => {
    setEditingKey(`${tierIdx}-${entryIdx}`);
    setEditingText(initialText);
  };

  const saveEditLabel = (tierIdx: number, entryIdx: number) => {
    const newTiers = [...tiers];
    const targetTier = { ...newTiers[tierIdx] };
    const targetEntry = { ...targetTier.entries[entryIdx] };
    targetEntry.label = editingText;
    targetTier.entries[entryIdx] = targetEntry;
    newTiers[tierIdx] = targetTier;
    onUpdateTiers(newTiers, true);
    setEditingKey(null);
  };

  const handleBoundaryDragStart = (e: React.PointerEvent, tierIdx: number, entryIdx: number) => {
    e.stopPropagation();
    onBoundaryDragStart?.();
    const track = e.currentTarget.parentElement?.parentElement;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const target = tiers[tierIdx].entries[entryIdx] as IntervalEntry;

    resizeRef.current = {
      tierIdx,
      entryIdx,
      startX: e.clientX,
      initialEnd: target.end,
      containerWidth: rect.width,
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!resizeRef.current) return;
      const { tierIdx, entryIdx, startX, initialEnd, containerWidth } = resizeRef.current;
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = (deltaX / containerWidth) * viewSpan;
      const newEnd = Math.max(0, initialEnd + deltaTime);

      const updatedTiers = [...tiers];
      const tier = { ...updatedTiers[tierIdx] };
      const entries = [...(tier.entries as IntervalEntry[])];
      const cur = entries[entryIdx];
      if (newEnd > cur.start + 0.01) {
        entries[entryIdx] = { ...cur, end: roundTime(newEnd) };
        if (entryIdx + 1 < entries.length) {
          entries[entryIdx + 1] = { ...entries[entryIdx + 1], start: roundTime(newEnd) };
        }
        tier.entries = entries;
        updatedTiers[tierIdx] = tier;
        onUpdateTiers(updatedTiers, false);
      }
    };

    const onPointerUp = () => {
      resizeRef.current = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const roundTime = (t: number) => Math.round(t * 1000) / 1000;
  const showPlayhead = currentTime >= viewRange.start && currentTime <= viewRange.end;

  const hoverPercent = hoverTime !== null ? ((hoverTime - viewRange.start) / viewSpan) * 100 : null;
  const showHover = hoverTime !== null && hoverTime >= viewRange.start && hoverTime <= viewRange.end;

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = Math.max(0, Math.min(duration, viewRange.start + (x / rect.width) * viewSpan));
    onHoverTimeChange(t);
  };

  return (
    <div className="flex flex-col w-full bg-white select-none border-b border-gray-200">
      {/* Praat-style Quick Label & Operation Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-blue-50/60 border-b border-gray-200 text-xs gap-2">
        <div className="flex items-center space-x-2 flex-1 min-w-[300px]">
          <span className="text-gray-700 font-semibold whitespace-nowrap text-[11px]">
            {selection
              ? `[${tiers[activeTierIdx]?.name || 'Tier'}] ${(selection.end - selection.start).toFixed(3)}s (${Math.round((selection.end - selection.start) * 1000)}ms)`
              : '区間未選択 (クリックで選択)'}
          </span>
          <div className="relative flex-1 max-w-[240px]">
            <input
              ref={labelInputRef}
              type="text"
              disabled={!selection}
              value={selection ? (selectedLabel ?? '') : ''}
              onChange={(e) => onUpdateSelectedLabel?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  e.preventDefault();
                  e.currentTarget.blur();
                } else if (e.key === 'Tab') {
                  e.preventDefault();
                  if (e.shiftKey) onSelectPrevInterval?.();
                  else onSelectNextInterval?.();
                } else if (e.altKey && e.code === 'ArrowRight') {
                  e.preventDefault();
                  onSelectNextInterval?.();
                } else if (e.altKey && e.code === 'ArrowLeft') {
                  e.preventDefault();
                  onSelectPrevInterval?.();
                } else if (e.altKey && (e.code === 'Backspace' || e.code === 'Delete')) {
                  e.preventDefault();
                  onDeleteBoundary?.();
                }
              }}
              placeholder={selection ? "ラベル (クリックで編集)..." : "区間を選択"}
              className="w-full px-2.5 py-1 bg-white border border-[#111111] font-sans text-[#111111] text-xs font-semibold outline-none focus:border-[#111111] disabled:bg-[#f0f0f4] disabled:text-[#aaaaaf]"
            />
          </div>

          {/* Quick IPA Buttons (Hard-to-type & High-frequency) */}
          {selection && (
            <div className="flex items-center space-x-1 flex-wrap gap-y-1">
              <span className="text-[10px] text-[#777780] font-mono font-bold ml-1 mr-0.5 whitespace-nowrap uppercase">IPA:</span>
              {QUICK_IPA_SYMBOLS.map(({ sym, name }) => (
                <button
                  key={sym}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInsertChar(sym)}
                  className="px-1.5 h-6 min-w-[22px] flex items-center justify-center font-sans text-xs font-bold bg-white border border-[#e0e0e6] hover:border-[#111111] hover:bg-[#111111] hover:text-white text-[#111111] transition-colors"
                  title={`${sym} : ${name} (クリックでカーソル位置に挿入)`}
                >
                  {sym}
                </button>
              ))}

              {/* Full IPA Palette Dropdown */}
              <div className="relative" ref={paletteRef}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowIpaPalette(!showIpaPalette)}
                  className={`px-2 h-6 flex items-center space-x-1 text-xs font-bold border uppercase tracking-wider transition-colors ${
                    showIpaPalette
                      ? 'bg-[#111111] border-[#111111] text-white'
                      : 'bg-white border-[#111111] hover:bg-[#111111] hover:text-white text-[#111111]'
                  }`}
                  title="全IPA記号パレットを開く"
                >
                  <span>全記号</span>
                  <span className="text-[9px]">▼</span>
                </button>

                {showIpaPalette && (
                  <div className="absolute left-0 top-full mt-1 w-84 bg-white border-2 border-[#111111] z-50 p-3 text-xs">
                    <div className="flex border-b border-[#e0e0e6] mb-2 gap-1 pb-1 overflow-x-auto">
                      {IPA_CATEGORIES.map((cat, idx) => (
                        <button
                          key={cat.category}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setActiveIpaTab(idx)}
                          className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                            activeIpaTab === idx
                              ? 'bg-[#111111] text-white'
                              : 'text-[#777780] hover:text-[#111111] hover:bg-[#f0f0f4]'
                          }`}
                        >
                          {cat.category}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto p-1">
                      {IPA_CATEGORIES[activeIpaTab].symbols.map(({ sym, name }) => (
                        <button
                          key={sym}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleInsertChar(sym)}
                          className="h-8 flex flex-col items-center justify-center bg-white border border-[#e0e0e6] hover:border-[#111111] hover:bg-[#111111] hover:text-white font-sans text-sm font-bold text-[#111111] transition-colors"
                          title={`${sym} : ${name} (クリックで挿入)`}
                        >
                          <span>{sym}</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-2 pt-2 border-t border-[#e0e0e6] text-[10px] text-[#777780] text-center font-mono uppercase">
                      INSERT DIRECTLY INTO ACTIVE INTERVAL
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1.5 text-[11px] text-[#111111]">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="px-2 py-1 bg-white border border-[#e0e0e6] hover:border-[#111111] hover:bg-[#f0f0f4] text-[#111111] disabled:opacity-20 font-medium flex items-center transition-colors"
            title="元に戻す (Ctrl+Z)"
          >
            <Undo2 className="w-3 h-3 mr-0.5" />
            元に戻す
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="px-2 py-1 bg-white border border-[#e0e0e6] hover:border-[#111111] hover:bg-[#f0f0f4] text-[#111111] disabled:opacity-20 font-medium flex items-center transition-colors"
            title="やり直す (Ctrl+Y / Ctrl+Shift+Z)"
          >
            <Redo2 className="w-3 h-3 mr-0.5" />
            やり直す
          </button>
          <button
            onClick={onSelectPrevInterval}
            disabled={!selection}
            className="px-2 py-1 bg-white border border-[#e0e0e6] hover:border-[#111111] hover:bg-[#111111] hover:text-white text-[#111111] disabled:opacity-20 font-medium transition-colors"
            title="前の区間に移動 (Alt+←)"
          >
            ◀ 前 (Alt+←)
          </button>
          <button
            onClick={onPlaySelection}
            disabled={!selection}
            className="px-2 py-1 bg-white border border-[#111111] hover:bg-[#111111] hover:text-white text-[#111111] disabled:opacity-20 font-bold transition-colors"
            title="区間再生 (Tab)"
          >
            ▶ 再生 (Tab)
          </button>
          <button
            onClick={onSelectNextInterval}
            disabled={!selection}
            className="px-2 py-1 bg-white border border-[#e0e0e6] hover:border-[#111111] hover:bg-[#111111] hover:text-white text-[#111111] disabled:opacity-20 font-medium transition-colors"
            title="次の区間に移動 (Alt+→)"
          >
            次 (Alt+→) ▶
          </button>
          <button
            onClick={onDeleteBoundary}
            disabled={!selection}
            className="px-2 py-1 bg-white border border-[#E30613] text-[#E30613] hover:bg-[#E30613] hover:text-white disabled:opacity-20 font-bold transition-colors"
            title="境界を削除して直前区間と結合 (Alt+Del)"
          >
            境界削除
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 bg-[#f0f0f4] border-b border-[#e0e0e6] text-xs">
        <span className="font-bold text-[#111111] uppercase tracking-wider text-[11px]">
          Tiers ({tiers.length}) - <span className="text-[#E30613] font-mono">Active: {tiers[activeTierIdx]?.name || 'None'}</span>
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleAddTier('interval')}
            className="px-2.5 py-0.5 border border-[#111111] bg-white hover:bg-[#111111] hover:text-white text-[#111111] font-bold text-[11px] uppercase tracking-wider transition-colors"
          >
            + 区間ティア
          </button>
          <button
            onClick={() => handleAddTier('point')}
            className="px-2.5 py-0.5 border border-[#111111] bg-white hover:bg-[#111111] hover:text-white text-[#111111] font-bold text-[11px] uppercase tracking-wider transition-colors"
          >
            + 点ティア
          </button>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-gray-200">
        {tiers.map((tier, tierIdx) => {
          const isActive = tierIdx === activeTierIdx;
          return (
            <div
              key={tierIdx}
              className={`flex h-14 w-full relative group bg-white ${
                isActive ? 'ring-1 ring-blue-500/50' : ''
              }`}
              onClick={() => onSelectTier(tierIdx)}
            >
              {/* Tier Left Header */}
              <div
                className={`w-32 flex-shrink-0 border-r px-2 py-1 flex flex-col justify-between z-10 transition-colors cursor-pointer ${
                  isActive ? 'bg-blue-50/70 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-semibold text-xs truncate ${
                      isActive ? 'text-blue-900' : 'text-gray-900'
                    }`}
                    title={tier.name}
                  >
                    {isActive ? `● ${tier.name}` : tier.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTier(tierIdx);
                    }}
                    className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                    title="削除"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  {tier.tier_type === 'interval' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddSelectionToTier(tierIdx);
                        }}
                        disabled={!selection}
                        className="text-[10px] text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-1 disabled:opacity-30 bg-white"
                        title="選択範囲をこのティアに追加"
                      >
                        +区間
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSplitInterval(tierIdx);
                        }}
                        className="text-[10px] text-gray-600 hover:text-gray-900 border border-gray-300 rounded px-1 bg-white"
                        title="現在位置で分割"
                      >
                        <Scissors className="w-2.5 h-2.5 inline" />
                      </button>
                    </>
                  )}
                  <span className="text-[9px] text-gray-400 ml-auto">{tier.tier_type}</span>
                </div>
              </div>

              {/* Tier Right Timeline Track */}
              <div
                className="relative flex-1 h-full bg-white overflow-hidden cursor-crosshair"
                onPointerMove={handleTrackPointerMove}
                onPointerLeave={() => onHoverTimeChange(null)}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = rect.width > 0 ? Math.max(0, Math.min(1, clickX / rect.width)) : 0;
                  const clickTime = roundTime(viewRange.start + ratio * viewSpan);
                  onSelectTier(tierIdx);
                  onSeek?.(clickTime);
                }}
              >
                {/* Synchronized Hover Hairline */}
                {showHover && hoverPercent !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-[1px] bg-gray-400 pointer-events-none z-10"
                    style={{ left: `${hoverPercent}%` }}
                  />
                )}

                {/* Playhead */}
                {showPlayhead && (
                  <div
                    className="absolute top-0 bottom-0 w-[1.5px] bg-red-600 z-20 pointer-events-none will-change-transform"
                    style={{ left: `${timeToPercent(currentTime)}%` }}
                  />
                )}

                {/* Praat-style Boundary Insert Handle on active tier playhead */}
                {isActive && showPlayhead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onInsertBoundaryAt) onInsertBoundaryAt(currentTime);
                      else handleSplitInterval(tierIdx);
                    }}
                    style={{ left: `${timeToPercent(currentTime)}%` }}
                    className="absolute top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-[11px] font-bold shadow z-30 transition-transform hover:scale-125 cursor-pointer"
                    title="境界を挿入 (Enter)"
                  >
                    +
                  </button>
                )}

                {tier.tier_type === 'interval' ? (
                  (tier.entries as IntervalEntry[]).map((entry, entryIdx) => {
                    if (entry.end < viewRange.start || entry.start > viewRange.end) return null;

                    const leftPct = ((entry.start - viewRange.start) / viewSpan) * 100;
                    const widthPct = ((entry.end - entry.start) / viewSpan) * 100;
                    const isEditing = editingKey === `${tierIdx}-${entryIdx}`;
                    const isSelected =
                      selection &&
                      Math.abs(selection.start - entry.start) < 0.01 &&
                      Math.abs(selection.end - entry.end) < 0.01;

                    return (
                      <div
                        key={entryIdx}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        className={`absolute top-0 bottom-0 border-r border-gray-400/80 flex items-center justify-center px-1 text-xs cursor-pointer ${
                          isSelected ? 'bg-blue-50/90 font-semibold text-blue-900' : 'hover:bg-gray-50 text-gray-800'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const ratio = rect.width > 0 ? Math.max(0, Math.min(1, clickX / rect.width)) : 0;
                          const clickTime = roundTime(entry.start + ratio * (entry.end - entry.start));
                          onSelectTier(tierIdx);
                          onSelectInterval(entry.start, entry.end, entry.label);
                          onSeek?.(clickTime);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startEditLabel(tierIdx, entryIdx, entry.label);
                        }}
                      >
                        {isEditing ? (
                          <div className="flex items-center w-full z-30" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              autoFocus
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditLabel(tierIdx, entryIdx);
                                if (e.key === 'Escape') setEditingKey(null);
                              }}
                              className="w-full bg-white border border-gray-400 text-gray-900 text-xs px-1 py-0.5 rounded outline-none"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveEditLabel(tierIdx, entryIdx);
                              }}
                              className="ml-1 text-gray-600 hover:text-black"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="truncate font-sans text-xs select-none px-1">
                            {entry.label}
                          </span>
                        )}

                        <div
                          onPointerDown={(e) => handleBoundaryDragStart(e, tierIdx, entryIdx)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/40 z-10"
                          title="境界をドラッグして移動"
                        />
                      </div>
                    );
                  })
                ) : (
                  (tier.entries as PointEntry[]).map((point, pointIdx) => {
                    if (point.time < viewRange.start || point.time > viewRange.end) return null;
                    const leftPct = timeToPercent(point.time);
                    const isEditing = editingKey === `${tierIdx}-${pointIdx}`;

                    return (
                      <div
                        key={pointIdx}
                        style={{ left: `${leftPct}%` }}
                        className="absolute top-0 bottom-0 -ml-[1px] w-[2px] bg-gray-800 flex flex-col items-center justify-start cursor-pointer"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startEditLabel(tierIdx, pointIdx, point.label);
                        }}
                      >
                        <div className="w-2 h-2 rounded-full bg-gray-800 -mt-1" />
                        {isEditing ? (
                          <div className="absolute top-2 bg-white p-1 rounded border border-gray-300 shadow z-30" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              autoFocus
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditLabel(tierIdx, pointIdx);
                                if (e.key === 'Escape') setEditingKey(null);
                              }}
                              className="text-xs bg-white text-gray-900 px-1 py-0.5 rounded border border-gray-300 outline-none"
                            />
                          </div>
                        ) : (
                          point.label && (
                            <span className="absolute top-2 text-[10px] text-gray-800 whitespace-nowrap bg-white px-1 border border-gray-200 rounded">
                              {point.label}
                            </span>
                          )
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Shortcut Legend */}
      <div className="px-3 py-1 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-500 flex flex-wrap items-center justify-between gap-1">
        <span>Praat 操作: <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-mono text-[10px]">Enter</kbd> 境界挿入 | <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-mono text-[10px]">Tab</kbd> 区間再生 | <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-mono text-[10px]">Alt+←/→</kbd> 区間移動 | <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-mono text-[10px]">Alt+Del</kbd> 境界削除 | <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-gray-700 font-mono text-[10px]">Space</kbd> 再生/停止</span>
        <span className="text-blue-700 font-medium">※IPAボタンでキーボード入力困難な音声記号（ɯ, ə, ɕ, ʑ, ç, ɸ, ɾ, ɴ, ŋ, ː 等）をワンクリック挿入可能</span>
      </div>
    </div>
  );
};