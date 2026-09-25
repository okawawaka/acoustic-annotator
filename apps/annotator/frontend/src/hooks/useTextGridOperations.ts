'use client';

import { useCallback } from 'react';
import { TextGridData, IntervalEntry } from '@/types';

interface UseTextGridOperationsProps {
  textGridData: TextGridData | null;
  setTextGridData: (data: TextGridData | null) => void;
  activeTierIdx: number;
  selection: { start: number; end: number } | null;
  setSelection: (sel: { start: number; end: number } | null) => void;
  setSelectedLabel: (label: string | null) => void;
  currentTime: number;
  handleSeek: (time: number) => void;
  pushHistory: (data: TextGridData | null) => void;
  recordTypingSession: () => void;
}

export function useTextGridOperations({
  textGridData,
  setTextGridData,
  activeTierIdx,
  selection,
  setSelection,
  setSelectedLabel,
  currentTime,
  handleSeek,
  pushHistory,
  recordTypingSession,
}: UseTextGridOperationsProps) {
  // 境界線の挿入 (Enter / ボタン)
  const handleInsertBoundaryAt = useCallback((time?: number) => {
    if (!textGridData || textGridData.tiers.length === 0) return;
    const targetIdx = Math.max(0, Math.min(activeTierIdx, textGridData.tiers.length - 1));
    const targetTime = time !== undefined ? time : currentTime;

    let newSelectedRange: { start: number; end: number } | null = null;
    let modified = false;

    const newTiers = textGridData.tiers.map((tier, idx) => {
      if (idx === targetIdx && tier.tier_type === 'interval') {
        const cur = targetTime;
        const entries = [...tier.entries];
        const entryIdx = entries.findIndex(
          (e) => 'start' in e && e.start <= cur && e.end >= cur
        );
        if (entryIdx !== -1) {
          const original = entries[entryIdx] as IntervalEntry;
          if (cur - original.start > 0.01 && original.end - cur > 0.01) {
            const firstPart: IntervalEntry = { start: original.start, end: cur, label: original.label };
            const secondPart: IntervalEntry = { start: cur, end: original.end, label: '' };
            entries.splice(entryIdx, 1, firstPart, secondPart);
            newSelectedRange = { start: cur, end: original.end };
            modified = true;
          }
        }
        return { ...tier, entries };
      }
      return tier;
    });

    if (!modified) return;

    pushHistory(textGridData);
    setTextGridData({ ...textGridData, tiers: newTiers });
    if (newSelectedRange) {
      setSelection(newSelectedRange);
      setSelectedLabel('');
    }
  }, [textGridData, currentTime, activeTierIdx, pushHistory, setTextGridData, setSelection, setSelectedLabel]);

  // 選択区間ラベルの更新
  const handleUpdateSelectedLabel = useCallback((newLabel: string, targetInterval?: { start: number; end: number }) => {
    const activeTarget = targetInterval || selection;
    if (!textGridData || !activeTarget) return;

    // 現在の選択区間への更新、またはターゲット指定がない場合は選択中ラベルStateも更新
    if (!targetInterval || (selection && Math.abs(selection.start - targetInterval.start) < 0.005 && Math.abs(selection.end - targetInterval.end) < 0.005)) {
      setSelectedLabel(newLabel);
    }

    recordTypingSession();

    const targetIdx = Math.max(0, Math.min(activeTierIdx, textGridData.tiers.length - 1));
    const newTiers = textGridData.tiers.map((tier, idx) => {
      if (idx === targetIdx && tier.tier_type === 'interval') {
        const entries = (tier.entries as IntervalEntry[]).map((entry) => {
          const match = Math.abs(entry.start - activeTarget.start) < 0.005 && Math.abs(entry.end - activeTarget.end) < 0.005;
          if (match) {
            return { ...entry, label: newLabel };
          }
          return entry;
        });
        return { ...tier, entries };
      }
      return tier;
    });
    setTextGridData({ ...textGridData, tiers: newTiers });
  }, [textGridData, selection, activeTierIdx, recordTypingSession, setTextGridData, setSelectedLabel]);

  // 前の区間を選択 (Shift+Tab / Alt+Left)
  const handleSelectPrevInterval = useCallback(() => {
    if (!textGridData || textGridData.tiers.length === 0) return;
    const targetIdx = Math.max(0, Math.min(activeTierIdx, textGridData.tiers.length - 1));
    const tier = textGridData.tiers[targetIdx];
    if (tier.tier_type !== 'interval' || tier.entries.length === 0) return;
    const entries = tier.entries as IntervalEntry[];

    let curIdx = -1;
    if (selection) {
      curIdx = entries.findIndex(
        (e) => Math.abs(e.start - selection.start) < 0.005 && Math.abs(e.end - selection.end) < 0.005
      );
    }
    if (curIdx === -1) {
      curIdx = entries.findIndex((e) => e.start <= currentTime && e.end >= currentTime);
    }

    const prevIdx = curIdx > 0 ? curIdx - 1 : entries.length - 1;
    const prev = entries[prevIdx];
    setSelection({ start: prev.start, end: prev.end });
    setSelectedLabel(prev.label || '');
    handleSeek(prev.start);
  }, [textGridData, activeTierIdx, selection, currentTime, handleSeek, setSelection, setSelectedLabel]);

  // 次の区間を選択 (Alt+Right)
  const handleSelectNextInterval = useCallback(() => {
    if (!textGridData || textGridData.tiers.length === 0) return;
    const targetIdx = Math.max(0, Math.min(activeTierIdx, textGridData.tiers.length - 1));
    const tier = textGridData.tiers[targetIdx];
    if (tier.tier_type !== 'interval' || tier.entries.length === 0) return;
    const entries = tier.entries as IntervalEntry[];

    let curIdx = -1;
    if (selection) {
      curIdx = entries.findIndex(
        (e) => Math.abs(e.start - selection.start) < 0.005 && Math.abs(e.end - selection.end) < 0.005
      );
    }
    if (curIdx === -1) {
      curIdx = entries.findIndex((e) => e.start <= currentTime && e.end >= currentTime);
    }

    const nextIdx = curIdx >= 0 && curIdx < entries.length - 1 ? curIdx + 1 : 0;
    const next = entries[nextIdx];
    setSelection({ start: next.start, end: next.end });
    setSelectedLabel(next.label || '');
    handleSeek(next.start);
  }, [textGridData, activeTierIdx, selection, currentTime, handleSeek, setSelection, setSelectedLabel]);

  // 境界線の削除・隣接区間の結合 (Alt+Delete)
  const handleDeleteBoundary = useCallback(() => {
    if (!textGridData || textGridData.tiers.length === 0 || !selection) return;
    const targetIdx = Math.max(0, Math.min(activeTierIdx, textGridData.tiers.length - 1));
    const tier = textGridData.tiers[targetIdx];
    if (tier.tier_type !== 'interval' || tier.entries.length <= 1) return;
    const entries = [...(tier.entries as IntervalEntry[])];

    const curIdx = entries.findIndex(
      (e) => Math.abs(e.start - selection.start) < 0.005 && Math.abs(e.end - selection.end) < 0.005
    );

    if (curIdx > 0) {
      pushHistory(textGridData);
      const prev = entries[curIdx - 1];
      const cur = entries[curIdx];
      const merged: IntervalEntry = {
        start: prev.start,
        end: cur.end,
        label: prev.label || cur.label,
      };
      entries.splice(curIdx - 1, 2, merged);

      const newTiers = textGridData.tiers.map((t, idx) => (idx === targetIdx ? { ...t, entries } : t));
      setTextGridData({ ...textGridData, tiers: newTiers });
      setSelection({ start: merged.start, end: merged.end });
      setSelectedLabel(merged.label || '');
    } else if (curIdx === 0 && entries.length > 1) {
      pushHistory(textGridData);
      const cur = entries[0];
      const next = entries[1];
      const merged: IntervalEntry = {
        start: cur.start,
        end: next.end,
        label: cur.label || next.label,
      };
      entries.splice(0, 2, merged);

      const newTiers = textGridData.tiers.map((t, idx) => (idx === targetIdx ? { ...t, entries } : t));
      setTextGridData({ ...textGridData, tiers: newTiers });
      setSelection({ start: merged.start, end: merged.end });
      setSelectedLabel(merged.label || '');
    }
  }, [textGridData, activeTierIdx, selection, pushHistory, setTextGridData, setSelection, setSelectedLabel]);

  return {
    handleInsertBoundaryAt,
    handleUpdateSelectedLabel,
    handleSelectPrevInterval,
    handleSelectNextInterval,
    handleDeleteBoundary,
  };
}
