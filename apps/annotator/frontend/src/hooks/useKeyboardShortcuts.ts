'use client';

import { useEffect } from 'react';

interface UseKeyboardShortcutsOptions {
  onTogglePlay: () => void;
  onPlaySelection: () => void;
  onInsertBoundaryAt: () => void;
  onSelectNextInterval: () => void;
  onSelectPrevInterval: () => void;
  onDeleteBoundary: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenShortcutsModal?: () => void;
}

export function useKeyboardShortcuts({
  onTogglePlay,
  onPlaySelection,
  onInsertBoundaryAt,
  onSelectNextInterval,
  onSelectPrevInterval,
  onDeleteBoundary,
  onUndo,
  onRedo,
  onOpenShortcutsModal,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (isCtrlOrMeta && (e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z')) {
        const activeEl = document.activeElement as HTMLElement | null;
        const isInputActive = activeEl && ['INPUT', 'TEXTAREA'].includes(activeEl.tagName);
        if (!isInputActive) {
          e.preventDefault();
          if (e.shiftKey) {
            onRedo();
          } else {
            onUndo();
          }
          return;
        }
      } else if (isCtrlOrMeta && (e.code === 'KeyY' || e.key === 'y' || e.key === 'Y')) {
        const activeEl = document.activeElement as HTMLElement | null;
        const isInputActive = activeEl && ['INPUT', 'TEXTAREA'].includes(activeEl.tagName);
        if (!isInputActive) {
          e.preventDefault();
          onRedo();
          return;
        }
      }

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.code === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          onSelectPrevInterval();
        } else {
          onPlaySelection();
        }
      } else if (e.code === 'Enter') {
        e.preventDefault();
        onInsertBoundaryAt();
      } else if (e.altKey && e.code === 'ArrowRight') {
        e.preventDefault();
        onSelectNextInterval();
      } else if (e.altKey && e.code === 'ArrowLeft') {
        e.preventDefault();
        onSelectPrevInterval();
      } else if (e.altKey && (e.code === 'Backspace' || e.code === 'Delete')) {
        e.preventDefault();
        onDeleteBoundary();
      } else if (e.key === '?' || e.key === 'F1') {
        e.preventDefault();
        onOpenShortcutsModal?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onTogglePlay,
    onPlaySelection,
    onInsertBoundaryAt,
    onSelectNextInterval,
    onSelectPrevInterval,
    onDeleteBoundary,
    onUndo,
    onRedo,
    onOpenShortcutsModal,
  ]);
}
