'use client';

import { useState, useCallback, useEffect } from 'react';
import { AudioMetadata } from '@/types';

interface UseViewportZoomOptions {
  audioMetadata: AudioMetadata | null;
  currentTime: number;
}

export function useViewportZoom({
  audioMetadata,
  currentTime,
}: UseViewportZoomOptions) {
  const [viewRange, setViewRange] = useState({ start: 0, end: 10 });
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  // Initialize viewRange when new audio is loaded
  useEffect(() => {
    if (audioMetadata) {
      const initSpan = Math.min(10, audioMetadata.duration);
      setViewRange({ start: 0, end: initSpan });
    }
  }, [audioMetadata]);

  const handleZoomIn = useCallback(() => {
    const span = viewRange.end - viewRange.start;
    const newSpan = Math.max(0.1, span * 0.7);
    const mid = currentTime >= viewRange.start && currentTime <= viewRange.end
      ? currentTime
      : (viewRange.start + viewRange.end) / 2;
    const dur = audioMetadata ? audioMetadata.duration : 10;
    const s = Math.max(0, mid - newSpan / 2);
    const e = Math.min(dur, s + newSpan);
    setViewRange({ start: s, end: e });
  }, [viewRange, currentTime, audioMetadata]);

  const handleZoomOut = useCallback(() => {
    const span = viewRange.end - viewRange.start;
    const dur = audioMetadata ? audioMetadata.duration : 10;
    const newSpan = Math.min(dur, span * 1.4);
    const mid = (viewRange.start + viewRange.end) / 2;
    const s = Math.max(0, mid - newSpan / 2);
    const e = Math.min(dur, s + newSpan);
    setViewRange({ start: s, end: e });
  }, [viewRange, audioMetadata]);

  const handleResetZoom = useCallback(() => {
    if (!audioMetadata) return;
    setViewRange({ start: 0, end: audioMetadata.duration });
  }, [audioMetadata]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!audioMetadata) return;
    const dur = audioMetadata.duration;
    const span = viewRange.end - viewRange.start;

    const delta = e.deltaX !== 0 ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (delta !== 0) {
      e.preventDefault();
      const deltaTime = (delta / 800) * span;
      const newStart = Math.max(0, Math.min(dur - span, viewRange.start + deltaTime));
      const newEnd = newStart + span;
      setViewRange({ start: newStart, end: newEnd });
    }
  }, [audioMetadata, viewRange]);

  return {
    viewRange,
    setViewRange,
    hoverTime,
    setHoverTime,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleWheel,
  };
}
