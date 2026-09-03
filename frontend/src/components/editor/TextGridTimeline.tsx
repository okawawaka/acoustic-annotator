'use client';

import React, { useState } from 'react';
import { Tier, IntervalEntry, PointEntry } from '@/types';
import { Plus, Trash2, Check } from 'lucide-react';

interface TextGridTimelineProps {
  tiers: Tier[];
  duration: number;
  currentTime: number;
  viewRange: { start: number; end: number };
  selection: { start: number; end: number } | null;
  onUpdateTiers: (tiers: Tier[]) => void;
  onSelectInterval: (start: number, end: number) => void;
}

export const TextGridTimeline: React.FC<TextGridTimelineProps> = ({
  tiers,
  duration,
  currentTime,
  viewRange,
  selection,
  onUpdateTiers,
  onSelectInterval,
}) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const viewSpan = Math.max(0.001, viewRange.end - viewRange.start);

  const handleAddTier = (type: 'interval' | 'point') => {
    const name = prompt(type === 'interval' ? '新規区間ティア名 (例: Word, Phoneme):' : '新規ポイントティア名:');
    if (!name) return;
    const newTier: Tier = {
      name,
      tier_type: type,
      min_timestamp: 0,
      max_timestamp: duration,
      entries: [],
    };
    onUpdateTiers([...tiers, newTier]);
  };

  const handleDeleteTier = (idx: number) => {
    const tierName = tiers[idx]?.name;
    if (confirm(`ティア「${tierName}」を削除してもよろしいですか？`)) {
      const updated = tiers.filter((_, i) => i !== idx);
      onUpdateTiers(updated);
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

  const timeToPercent = (time: number) => {
    return ((time - viewRange.start) / viewSpan) * 100;
  };

  return (
    <div className="flex flex-col w-full bg-slate-900 select-none overflow-x-hidden">
      {/* Tier Add Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950 text-xs text-slate-400">
        <span className="font-semibold text-slate-300">TextGrid ティア一覧 ({tiers.length})</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleAddTier('interval')}
            className="flex items-center px-2.5 py-1 rounded bg-slate-800 hover:bg-sky-600 hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            + 区間ティア (Interval)
          </button>
          <button
            onClick={() => handleAddTier('point')}
            className="flex items-center px-2.5 py-1 rounded bg-slate-800 hover:bg-sky-600 hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            + 点ティア (Point)
          </button>
        </div>
      </div>

      {/* Tiers List */}
      <div className="flex flex-col divide-y divide-slate-800">
        {tiers.map((tier, tierIdx) => (
          <div key={tierIdx} className="flex h-16 w-full relative group">
            {/* Tier Header Label */}
            <div className="w-36 flex-shrink-0 bg-slate-950/80 border-r border-slate-800 px-2 py-1.5 flex flex-col justify-between z-10">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-200 truncate" title={tier.name}>
                  {tier.name}
                </span>
                <button
                  onClick={() => handleDeleteTier(tierIdx)}
                  className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="ティア削除"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {tier.tier_type === 'interval' ? 'Interval' : 'Point'} ({tier.entries.length})
              </span>
            </div>

            {/* Timeline Track */}
            <div className="relative flex-1 h-full bg-slate-900/50 overflow-hidden">
              {/* Playhead Vertical Line */}
              {currentTime >= viewRange.start && currentTime <= viewRange.end && (
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 pointer-events-none"
                  style={{ left: `${timeToPercent(currentTime)}%` }}
                />
              )}

              {/* Entries Rendering */}
              {tier.tier_type === 'interval' ? (
                // Interval Tier Entries
                (tier.entries as IntervalEntry[]).map((entry, entryIdx) => {
                  if (entry.end < viewRange.start || entry.start > viewRange.end) return null;

                  const leftPct = Math.max(0, timeToPercent(entry.start));
                  const rightPct = Math.min(100, timeToPercent(entry.end));
                  const widthPct = Math.max(0.2, rightPct - leftPct);
                  const isEditing = editingKey === `${tierIdx}-${entryIdx}`;

                  return (
                    <div
                      key={entryIdx}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      className={`absolute top-0 bottom-0 border-r border-slate-700/80 flex items-center justify-center px-1 text-xs cursor-pointer transition-colors ${
                        selection &&
                        Math.abs(selection.start - entry.start) < 0.01 &&
                        Math.abs(selection.end - entry.end) < 0.01
                          ? 'bg-sky-500/25 border-sky-400'
                          : 'hover:bg-slate-800/60'
                      }`}
                      onClick={() => onSelectInterval(entry.start, entry.end)}
                      onDoubleClick={() => startEditLabel(tierIdx, entryIdx, entry.label)}
                    >
                      {isEditing ? (
                        <div className="flex items-center w-full z-30">
                          <input
                            type="text"
                            autoFocus
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditLabel(tierIdx, entryIdx);
                              if (e.key === 'Escape') setEditingKey(null);
                            }}
                            className="w-full bg-slate-950 border border-sky-500 text-white text-xs px-1 py-0.5 rounded outline-none"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              saveEditLabel(tierIdx, entryIdx);
                            }}
                            className="ml-1 p-0.5 text-sky-400 hover:text-white"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="truncate text-slate-200 font-mono text-[11px] select-none" title={entry.label}>
                          {entry.label}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                // Point Tier Entries
                (tier.entries as PointEntry[]).map((point, pointIdx) => {
                  if (point.time < viewRange.start || point.time > viewRange.end) return null;
                  const leftPct = timeToPercent(point.time);
                  const isEditing = editingKey === `${tierIdx}-${pointIdx}`;

                  return (
                    <div
                      key={pointIdx}
                      style={{ left: `${leftPct}%` }}
                      className="absolute top-0 bottom-0 -ml-[1px] w-[2px] bg-amber-400/80 flex flex-col items-center justify-start cursor-pointer group/point"
                      onDoubleClick={() => startEditLabel(tierIdx, pointIdx, point.label)}
                    >
                      <div className="w-2 h-2 rounded-full bg-amber-400 -mt-1 shadow" />
                      {isEditing ? (
                        <div className="absolute top-2 bg-slate-950 p-1 rounded border border-amber-400 z-30">
                          <input
                            type="text"
                            autoFocus
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEditLabel(tierIdx, pointIdx);
                              if (e.key === 'Escape') setEditingKey(null);
                            }}
                            className="text-xs bg-slate-900 text-white px-1 py-0.5 rounded outline-none"
                          />
                        </div>
                      ) : (
                        point.label && (
                          <span className="absolute top-2 text-[10px] text-amber-300 font-mono whitespace-nowrap bg-slate-950/90 px-1 rounded border border-amber-500/30">
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
        ))}
      </div>
    </div>
  );
};