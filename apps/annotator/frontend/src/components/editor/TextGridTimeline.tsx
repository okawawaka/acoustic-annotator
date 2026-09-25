'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Tier, IntervalEntry, PointEntry } from '@/types';
import { Plus, Trash2, Check, Scissors, Undo2, Redo2 } from 'lucide-react';

import { QUICK_IPA_SYMBOLS, IPA_CATEGORIES } from '@/constants/ipa';

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
    <div className="flex flex-col w-full bg-white select-none border-b border-[#e0e0e6]">
      {/* Praat-style Quick Label & Operation Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-[#f0f0f4] border-b border-[#e0e0e6] text-xs gap-2">
        <div className="flex items-center space-x-2 flex-1 min-w-[300px]">
          <span className="text-[#111111] font-mono font-bold whitespace-nowrap text-[11px]">
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
              placeholder={selection ? "ラベル (Enter確定)..." : "区間を選択"}
              className="w-full px-2.5 py-1 bg-white border border-[#111111] font-sans text-[#111111] text-base sm:text-xs font-semibold outline-none focus:ring-1 focus:ring-[#111111] disabled:bg-[#f0f0f4] disabled:text-[#aaaaaf]"
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
                  className="px-1.5 sm:px-1.5 h-7 sm:h-6 min-w-[28px] sm:min-w-[22px] flex items-center justify-center font-sans text-sm sm:text-xs font-bold bg-white border border-[#e0e0e6] hover:border-[#111111] hover:bg-[#111111] hover:text-white text-[#111111] transition-colors"
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
                  <div className="absolute left-0 top-full mt-1 w-84 bg-white border-2 border-[#111111] z-50 p-3 text-xs shadow-none">
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

        {/* Interval Operations */}
        <div className="flex items-center space-x-1.5 text-[11px] text-[#111111]">
          <button
            onClick={onSelectPrevInterval}
            disabled={!selection}
            className="px-2 py-1 bg-white border border-[#111111] hover:bg-[#111111] hover:text-white text-[#111111] disabled:opacity-20 font-medium transition-colors"
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
            className="px-2 py-1 bg-white border border-[#111111] hover:bg-[#111111] hover:text-white text-[#111111] disabled:opacity-20 font-medium transition-colors"
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

      <div className="flex flex-col divide-y divide-[#e0e0e6]">
        {tiers.map((tier, tierIdx) => {
          const isActive = tierIdx === activeTierIdx;
          return (
            <div
              key={tierIdx}
              className={`flex h-14 w-full relative group bg-white ${
                isActive ? 'border-l-4 border-l-[#E30613]' : 'border-l-4 border-l-transparent'
              }`}
              onClick={() => onSelectTier(tierIdx)}
            >
              {/* Tier Left Header */}
              <div
                className={`w-16 sm:w-32 flex-shrink-0 border-r px-1 sm:px-2 py-1 flex flex-col justify-between z-10 transition-colors cursor-pointer ${
                  isActive ? 'bg-[#f0f0f4] border-[#111111]' : 'bg-[#fafafc] border-[#e0e0e6]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-semibold text-[10px] sm:text-xs truncate ${
                      isActive ? 'text-[#111111] font-bold' : 'text-[#444448]'
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
                    className="text-[#aaaaaf] hover:text-[#E30613] opacity-0 group-hover:opacity-100 transition-opacity"
                    title="ティア削除"
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
                        className="text-[10px] text-[#111111] hover:bg-[#111111] hover:text-white border border-[#e0e0e6] px-1 disabled:opacity-30 bg-white transition-colors"
                        title="選択範囲をこのティアに追加"
                      >
                        +区間
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSplitInterval(tierIdx);
                        }}
                        className="text-[10px] text-[#111111] hover:bg-[#111111] hover:text-white border border-[#e0e0e6] px-1 bg-white transition-colors"
                        title="現在位置で分割"
                      >
                        <Scissors className="w-2.5 h-2.5 inline" />
                      </button>
                    </>
                  )}
                  <span className="text-[9px] text-[#aaaaaf] ml-auto uppercase font-mono">{tier.tier_type}</span>
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
                    className="absolute top-0 bottom-0 w-[1px] bg-[#aaaaaf] pointer-events-none z-10"
                    style={{ left: `${hoverPercent}%` }}
                  />
                )}

                {/* Playhead */}
                {showPlayhead && (
                  <div
                    className="absolute top-0 bottom-0 w-[1.5px] bg-[#E30613] z-20 pointer-events-none will-change-transform"
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
                    className="absolute top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-[#111111] hover:bg-[#E30613] text-white flex items-center justify-center text-[10px] font-bold z-30 transition-transform hover:scale-125 cursor-pointer shadow-sm border border-white"
                    title="現在位置に境界を挿入 (Enter)"
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

                    const isBlank = !entry.label || entry.label.trim() === '';

                    return (
                      <div
                        key={entryIdx}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        className={`group absolute top-0 bottom-0 border-r border-[#777780]/60 flex items-center justify-center px-1 text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#111111]/10 font-bold text-[#111111] ring-1 ring-inset ring-[#111111]'
                            : isBlank
                            ? 'bg-[#fafafc]/60 hover:bg-[#f0f0f4] text-[#aaaaaf]'
                            : 'bg-white hover:bg-[#f5f5f8] text-[#111111]'
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
                              className="w-full bg-white border border-[#111111] text-[#111111] text-xs px-1 py-0.5 outline-none font-sans"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveEditLabel(tierIdx, entryIdx);
                              }}
                              className="ml-1 text-[#111111] hover:text-[#E30613]"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className={`truncate font-sans text-xs select-none px-1 ${isBlank ? 'text-[10px] text-[#b0b0b8] font-mono italic opacity-0 group-hover:opacity-75 transition-opacity' : ''}`}>
                            {isBlank ? '(空)' : entry.label}
                          </span>
                        )}

                        <div
                          onPointerDown={(e) => handleBoundaryDragStart(e, tierIdx, entryIdx)}
                          className="absolute -right-[8px] top-0 bottom-0 w-[16px] cursor-col-resize z-20 group/handle flex items-center justify-center touch-none"
                          title="境界をドラッグして移動"
                        >
                          <div className="w-[2px] h-full bg-transparent group-hover/handle:bg-[#E30613] transition-colors" />
                        </div>
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
                        className="absolute top-0 bottom-0 -ml-[1px] w-[2px] bg-[#111111] flex flex-col items-center justify-start cursor-pointer"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startEditLabel(tierIdx, pointIdx, point.label);
                        }}
                      >
                        <div className="w-2 h-2 rounded-full bg-[#111111] -mt-1" />
                        {isEditing ? (
                          <div className="absolute top-2 bg-white p-1 border border-[#111111] z-30" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              autoFocus
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditLabel(tierIdx, pointIdx);
                                if (e.key === 'Escape') setEditingKey(null);
                              }}
                              className="text-xs bg-white text-[#111111] px-1 py-0.5 border border-[#111111] outline-none"
                            />
                          </div>
                        ) : (
                          point.label && (
                            <span className="absolute top-2 text-[10px] text-[#111111] whitespace-nowrap bg-white px-1 border border-[#e0e0e6] font-mono">
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
      <div className="px-3 py-1 bg-[#f0f0f4] border-t border-[#e0e0e6] text-[11px] text-[#777780] flex flex-wrap items-center justify-between gap-1 font-mono">
        <span>Praat 操作: <kbd className="px-1 py-0.5 bg-white border border-[#111111] text-[#111111] text-[10px]">Enter</kbd> 境界挿入 | <kbd className="px-1 py-0.5 bg-white border border-[#111111] text-[#111111] text-[10px]">Tab</kbd> 区間再生 | <kbd className="px-1 py-0.5 bg-white border border-[#111111] text-[#111111] text-[10px]">Alt+←/→</kbd> 区間移動 | <kbd className="px-1 py-0.5 bg-white border border-[#111111] text-[#111111] text-[10px]">Alt+Del</kbd> 境界削除 | <kbd className="px-1 py-0.5 bg-white border border-[#111111] text-[#111111] text-[10px]">Space</kbd> 再生/停止</span>
        <span className="text-[#111111] font-sans font-bold">※IPAボタンでキーボード入力困難な音声記号（ɯ, ə, ɕ, ʑ, ç, ɸ, ɾ, ɴ, ŋ, ː 等）をワンクリック挿入可能</span>
      </div>
    </div>
  );
};