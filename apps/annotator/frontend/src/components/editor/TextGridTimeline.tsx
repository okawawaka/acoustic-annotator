'use client';

import React, { useState, useRef } from 'react';
import { Tier, IntervalEntry, PointEntry } from '@/types';
import { Plus, Trash2, Check, Scissors } from 'lucide-react';

interface TextGridTimelineProps {
  tiers: Tier[];
  duration: number;
  currentTime: number;
  viewRange: { start: number; end: number };
  selection: { start: number; end: number } | null;
  hoverTime: number | null;
  activeTierIdx: number;
  onSelectTier: (idx: number) => void;
  onHoverTimeChange: (time: number | null) => void;
  onUpdateTiers: (tiers: Tier[]) => void;
  onSelectInterval: (start: number, end: number, label?: string) => void;
}

export const TextGridTimeline: React.FC<TextGridTimelineProps> = ({
  tiers,
  duration,
  currentTime,
  viewRange,
  selection,
  hoverTime,
  activeTierIdx,
  onSelectTier,
  onHoverTimeChange,
  onUpdateTiers,
  onSelectInterval,
}) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  
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
    onUpdateTiers([...tiers, newTier]);
  };

  const handleDeleteTier = (idx: number) => {
    const tierName = tiers[idx]?.name;
    if (confirm(`ティア「${tierName}」を削除しますか？`)) {
      onUpdateTiers(tiers.filter((_, i) => i !== idx));
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
    onUpdateTiers(newTiers);
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
        onUpdateTiers(newTiers);
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
    onUpdateTiers(newTiers);
    setEditingKey(null);
  };

  const handleBoundaryDragStart = (e: React.PointerEvent, tierIdx: number, entryIdx: number) => {
    e.stopPropagation();
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
        onUpdateTiers(updatedTiers);
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
      <div className="flex items-center justify-between px-3 py-1 bg-gray-100 border-b border-gray-200 text-xs">
        <span className="font-semibold text-gray-700">
          TextGrid ティア一覧 ({tiers.length}) - <span className="text-blue-700 font-medium">現在選択中: {tiers[activeTierIdx]?.name || '未選択'}</span>
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleAddTier('interval')}
            className="px-2 py-0.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium"
          >
            + 区間ティア
          </button>
          <button
            onClick={() => handleAddTier('point')}
            className="px-2 py-0.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium"
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
                          onSelectTier(tierIdx);
                          onSelectInterval(entry.start, entry.end, entry.label);
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
    </div>
  );
};