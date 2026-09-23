'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AcousticAnalysisData,
  IntervalMetrics,
  AnalysisSettings,
  SpectrogramColorMap,
} from '@/types';
import { analyzeAudioClient, computeIntervalMetricsClient } from '@/lib/clientAudioAnalysis';

interface UseAcousticAnalysisProps {
  audioBuffer: AudioBuffer | null;
  selection: { start: number; end: number } | null;
}

/**
 * 音響分析パラメータ設定、表示切替、再計算および選択区間メトリクス抽出フック
 */
export function useAcousticAnalysis({ audioBuffer, selection }: UseAcousticAnalysisProps) {
  const [analysisData, setAnalysisData] = useState<AcousticAnalysisData | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<IntervalMetrics | null>(null);

  const [maxFormantFreq, setMaxFormantFreq] = useState<number>(5500);
  const [maxDisplayFreq, setMaxDisplayFreq] = useState<number>(5000);
  const [colorMap, setColorMap] = useState<SpectrogramColorMap>('grayscale');
  const [showPitch, setShowPitch] = useState(true);
  const [showFormants, setShowFormants] = useState(true);
  const [showIntensity, setShowIntensity] = useState(true);
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>({
    spectrogramType: 'wideband',
    minPitch: 75,
    maxPitch: 600,
    maxFormantFreq: 5500,
    dynamicRange: 50,
  });

  // 話者別LPC声道長（最大フォルマント周波数）変更時のオンザフライ再分析
  const handleChangeMaxFormantFreq = useCallback(
    async (newFreq: number) => {
      setMaxFormantFreq(newFreq);
      setAnalysisSettings((prev) => ({ ...prev, maxFormantFreq: newFreq }));
      if (!audioBuffer) return;
      try {
        const analysis = await analyzeAudioClient(audioBuffer, {
          ...analysisSettings,
          maxFormantFreq: newFreq,
        });
        setAnalysisData(analysis);
      } catch (err) {
        console.warn('Client re-analysis failed:', err);
      }
    },
    [audioBuffer, analysisSettings]
  );

  // Praat 詳細分析設定の適用と再分析
  const handleApplyAnalysisSettings = useCallback(
    async (newSettings: AnalysisSettings) => {
      setAnalysisSettings(newSettings);
      setMaxFormantFreq(newSettings.maxFormantFreq);
      if (!audioBuffer) return;
      try {
        const analysis = await analyzeAudioClient(audioBuffer, newSettings);
        setAnalysisData(analysis);
      } catch (err) {
        console.warn('Client re-analysis with settings failed:', err);
      }
    },
    [audioBuffer]
  );

  // 選択区間の変更または分析結果更新時に音響統計メトリクスを自動算出
  useEffect(() => {
    if (!selection) {
      setSelectedMetrics(null);
      return;
    }
    const s = Math.min(selection.start, selection.end);
    const e = Math.max(selection.start, selection.end);
    if (e - s < 0.015) {
      setSelectedMetrics(null);
      return;
    }

    const channelData = audioBuffer ? audioBuffer.getChannelData(0) : undefined;
    const sr = audioBuffer ? audioBuffer.sampleRate : undefined;
    const metrics = computeIntervalMetricsClient(analysisData, s, e, channelData, sr);
    setSelectedMetrics(metrics);
  }, [selection, analysisData, audioBuffer]);

  return {
    analysisData,
    setAnalysisData,
    selectedMetrics,
    maxFormantFreq,
    setMaxFormantFreq,
    maxDisplayFreq,
    setMaxDisplayFreq,
    colorMap,
    setColorMap,
    showPitch,
    setShowPitch,
    showFormants,
    setShowFormants,
    showIntensity,
    setShowIntensity,
    analysisSettings,
    handleChangeMaxFormantFreq,
    handleApplyAnalysisSettings,
  };
}
