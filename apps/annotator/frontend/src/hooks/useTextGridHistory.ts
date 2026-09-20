'use client';

import { useState, useRef, useCallback } from 'react';
import { TextGridData, Tier } from '@/types';

export interface HistorySnapshot {
  textGridData: TextGridData;
  selection: { start: number; end: number } | null;
  selectedLabel: string | null;
  activeTierIdx: number;
}

interface UseTextGridHistoryOptions {
  textGridData: TextGridData | null;
  setTextGridData: (data: TextGridData | null) => void;
  selection: { start: number; end: number } | null;
  setSelection: (sel: { start: number; end: number } | null) => void;
  selectedLabel: string | null;
  setSelectedLabel: (label: string | null) => void;
  activeTierIdx: number;
  setActiveTierIdx: (idx: number) => void;
}

export function useTextGridHistory({
  textGridData,
  setTextGridData,
  selection,
  setSelection,
  selectedLabel,
  setSelectedLabel,
  activeTierIdx,
  setActiveTierIdx,
}: UseTextGridHistoryOptions) {
  const historyRef = useRef<HistorySnapshot[]>([]);
  const futureRef = useRef<HistorySnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isTypingSessionRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    futureRef.current = [];
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const pushHistory = useCallback(
    (currentTg: TextGridData | null) => {
      if (!currentTg) return;
      const snapshot: HistorySnapshot = {
        textGridData: JSON.parse(JSON.stringify(currentTg)),
        selection: selection ? { ...selection } : null,
        selectedLabel: selectedLabel ?? null,
        activeTierIdx,
      };

      const top = historyRef.current[historyRef.current.length - 1];
      if (top && JSON.stringify(top.textGridData.tiers) === JSON.stringify(snapshot.textGridData.tiers)) {
        return;
      }

      historyRef.current.push(snapshot);
      if (historyRef.current.length > 50) {
        historyRef.current.shift();
      }
      futureRef.current = [];
      updateUndoRedoState();
    },
    [selection, selectedLabel, activeTierIdx, updateUndoRedoState]
  );

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0 || !textGridData) return;

    const currentSnapshot: HistorySnapshot = {
      textGridData: JSON.parse(JSON.stringify(textGridData)),
      selection: selection ? { ...selection } : null,
      selectedLabel: selectedLabel ?? null,
      activeTierIdx,
    };
    futureRef.current.unshift(currentSnapshot);

    const prevSnapshot = historyRef.current.pop()!;
    updateUndoRedoState();

    setTextGridData(prevSnapshot.textGridData);
    setSelection(prevSnapshot.selection);
    setSelectedLabel(prevSnapshot.selectedLabel);
    if (prevSnapshot.activeTierIdx !== undefined) {
      setActiveTierIdx(prevSnapshot.activeTierIdx);
    }
  }, [textGridData, selection, selectedLabel, activeTierIdx, setTextGridData, setSelection, setSelectedLabel, setActiveTierIdx, updateUndoRedoState]);

  const handleRedo = useCallback(() => {
    if (futureRef.current.length === 0 || !textGridData) return;

    const currentSnapshot: HistorySnapshot = {
      textGridData: JSON.parse(JSON.stringify(textGridData)),
      selection: selection ? { ...selection } : null,
      selectedLabel: selectedLabel ?? null,
      activeTierIdx,
    };
    historyRef.current.push(currentSnapshot);

    const nextSnapshot = futureRef.current.shift()!;
    updateUndoRedoState();

    setTextGridData(nextSnapshot.textGridData);
    setSelection(nextSnapshot.selection);
    setSelectedLabel(nextSnapshot.selectedLabel);
    if (nextSnapshot.activeTierIdx !== undefined) {
      setActiveTierIdx(nextSnapshot.activeTierIdx);
    }
  }, [textGridData, selection, selectedLabel, activeTierIdx, setTextGridData, setSelection, setSelectedLabel, setActiveTierIdx, updateUndoRedoState]);

  const recordTypingSession = useCallback(() => {
    if (!textGridData) return;
    if (!isTypingSessionRef.current) {
      pushHistory(textGridData);
      isTypingSessionRef.current = true;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingSessionRef.current = false;
    }, 800);
  }, [textGridData, pushHistory]);

  const handleUpdateTiers = useCallback(
    (updatedTiers: Tier[], saveHistory = true) => {
      if (!textGridData) return;
      if (saveHistory) {
        pushHistory(textGridData);
      }
      setTextGridData({ ...textGridData, tiers: updatedTiers });
    },
    [textGridData, pushHistory, setTextGridData]
  );

  return {
    canUndo,
    canRedo,
    pushHistory,
    clearHistory,
    handleUndo,
    handleRedo,
    recordTypingSession,
    handleUpdateTiers,
  };
}
