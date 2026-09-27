'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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

  // 2本指タッチジェスチャー（ピンチ＆パン）追跡用 Ref
  const touchGestureRef = useRef<{
    initialDist: number;
    initialSpan: number;
    initialCenterTime: number;
    lastCenterX: number;
  } | null>(null);

  // Initialize viewRange when new audio is loaded
  useEffect(() => {
    if (audioMetadata) {
      const initSpan = Math.min(10, audioMetadata.duration);
      setViewRange({ start: 0, end: initSpan });
    }
  }, [audioMetadata]);

  const handleZoomIn = useCallback(() => {
    const span = viewRange.end - viewRange.start;
    const newSpan = Math.max(0.05, span * 0.7);
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

  // モバイル 2本指ピンチズーム & パンスクロール
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && audioMetadata) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = (t1.clientX + t2.clientX) / 2;
      const ratio = rect.width > 0 ? Math.max(0, Math.min(1, (centerX - rect.left) / rect.width)) : 0.5;
      const span = viewRange.end - viewRange.start;
      const centerTime = viewRange.start + ratio * span;

      touchGestureRef.current = {
        initialDist: Math.max(10, dist),
        initialSpan: span,
        initialCenterTime: centerTime,
        lastCenterX: centerX,
      };
    }
  }, [audioMetadata, viewRange]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchGestureRef.current && audioMetadata) {
      if (e.cancelable) e.preventDefault();

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const centerX = (t1.clientX + t2.clientX) / 2;
      const rect = e.currentTarget.getBoundingClientRect();

      const { initialDist, initialSpan, initialCenterTime, lastCenterX } = touchGestureRef.current;
      const dur = audioMetadata.duration;

      // ピンチによるスパン倍率計算 (指が広がると拡大・スパン縮小、狭まると縮小・スパン拡大)
      const scale = initialDist / Math.max(10, dist);
      const newSpan = Math.max(0.05, Math.min(dur, initialSpan * scale));

      // 2本指の移動によるパン計算
      const deltaX = centerX - lastCenterX;
      const deltaTime = rect.width > 0 ? -(deltaX / rect.width) * newSpan : 0;

      // 中心時間を基準に新しい表示範囲を算出
      const currentCenterTime = Math.max(0, Math.min(dur, initialCenterTime + deltaTime));
      let newStart = currentCenterTime - (newSpan * 0.5);
      let newEnd = currentCenterTime + (newSpan * 0.5);

      if (newStart < 0) {
        newStart = 0;
        newEnd = Math.min(dur, newSpan);
      } else if (newEnd > dur) {
        newEnd = dur;
        newStart = Math.max(0, dur - newSpan);
      }

      setViewRange({ start: newStart, end: newEnd });
      touchGestureRef.current.lastCenterX = centerX;
    }
  }, [audioMetadata]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      touchGestureRef.current = null;
    }
  }, []);

  return {
    viewRange,
    setViewRange,
    hoverTime,
    setHoverTime,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
