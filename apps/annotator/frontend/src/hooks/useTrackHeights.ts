import { useState, useCallback, useEffect } from 'react';

interface UseTrackHeightsOptions {
  defaultWaveformHeight?: number;
  defaultSpectrogramHeight?: number;
  minWaveformHeight?: number;
  maxWaveformHeight?: number;
  minSpectrogramHeight?: number;
  maxSpectrogramHeight?: number;
}

export function useTrackHeights({
  defaultWaveformHeight = 110,
  defaultSpectrogramHeight = 150,
  minWaveformHeight = 60,
  maxWaveformHeight = 320,
  minSpectrogramHeight = 80,
  maxSpectrogramHeight = 450,
}: UseTrackHeightsOptions = {}) {
  const [waveformHeight, setWaveformHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('annotator_waveform_height');
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val >= minWaveformHeight && val <= maxWaveformHeight) {
          return val;
        }
      }
    }
    return defaultWaveformHeight;
  });

  const [spectrogramHeight, setSpectrogramHeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('annotator_spectrogram_height');
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val >= minSpectrogramHeight && val <= maxSpectrogramHeight) {
          return val;
        }
      }
    }
    return defaultSpectrogramHeight;
  });

  const [resizingTrack, setResizingTrack] = useState<'waveform' | 'spectrogram' | null>(null);

  // ローカルストレージへ保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('annotator_waveform_height', String(waveformHeight));
    }
  }, [waveformHeight]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('annotator_spectrogram_height', String(spectrogramHeight));
    }
  }, [spectrogramHeight]);

  const handleStartResizeWaveform = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      e.preventDefault();
      setResizingTrack('waveform');
      const startY = e.clientY;
      const initialHeight = waveformHeight;

      const handleMove = (moveEvent: MouseEvent | PointerEvent) => {
        const delta = moveEvent.clientY - startY;
        const newHeight = Math.max(minWaveformHeight, Math.min(maxWaveformHeight, initialHeight + delta));
        setWaveformHeight(newHeight);
      };

      const handleUp = () => {
        setResizingTrack(null);
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [waveformHeight, minWaveformHeight, maxWaveformHeight]
  );

  const handleStartResizeSpectrogram = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      e.preventDefault();
      setResizingTrack('spectrogram');
      const startY = e.clientY;
      const initialHeight = spectrogramHeight;

      const handleMove = (moveEvent: MouseEvent | PointerEvent) => {
        const delta = moveEvent.clientY - startY;
        const newHeight = Math.max(minSpectrogramHeight, Math.min(maxSpectrogramHeight, initialHeight + delta));
        setSpectrogramHeight(newHeight);
      };

      const handleUp = () => {
        setResizingTrack(null);
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [spectrogramHeight, minSpectrogramHeight, maxSpectrogramHeight]
  );

  return {
    waveformHeight,
    spectrogramHeight,
    resizingTrack,
    handleStartResizeWaveform,
    handleStartResizeSpectrogram,
  };
}
