import {
  AcousticAnalysisData,
  IntervalMetrics,
  SpectralMoments,
  AnalysisSettings,
} from '@/types';

import { roundDigits } from './analysis/dsp';
import { extractPitchAutocorr } from './analysis/pitch';
import { extractFormantsLPC } from './analysis/formants';
import { generateSpectrogram } from './analysis/spectrogram';
import { extractIntensityPraat } from './analysis/intensity';
import { computeSpectralMoments } from './analysis/moments';

// 全サブモジュールの関数・型を再エクスポート (100% 後方互換性維持)
export * from './analysis/dsp';
export * from './analysis/pitch';
export * from './analysis/formants';
export * from './analysis/spectrogram';
export * from './analysis/intensity';
export * from './analysis/moments';
export * from './analysis/slice';

/**
 * 音声バッファ全体の統合クライアント音響解析
 * F0, フォルマント (F1-F3), スペクトログラム, 連続音圧を非同期一括計算
 */
export async function analyzeAudioClient(
  audioBuffer: AudioBuffer,
  settingsOrMaxFreq?: Partial<AnalysisSettings> | number
): Promise<AcousticAnalysisData> {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;

  const settings: Partial<AnalysisSettings> =
    typeof settingsOrMaxFreq === 'number'
      ? { maxFormantFreq: settingsOrMaxFreq }
      : settingsOrMaxFreq || {};

  const minPitch = settings.minPitch ?? 75;
  const maxPitch = settings.maxPitch ?? 600;
  const maxFormantFreq = settings.maxFormantFreq ?? 5500;
  const spectrogramType = settings.spectrogramType ?? 'wideband';
  const dynamicRange = settings.dynamicRange ?? 50;

  // 1. スペクトログラム生成 (広帯域 / 狭帯域)
  const spec = generateSpectrogram(channelData, sampleRate, 5000, 0.01, spectrogramType, dynamicRange);

  // 2. ピッチ抽出 (自己相関法)
  const pitch = extractPitchAutocorr(channelData, sampleRate, 0.01, minPitch, maxPitch);

  // 3. フォルマント抽出 (LPC Burg + Durand-Kerner)
  const formants = extractFormantsLPC(channelData, sampleRate, maxFormantFreq, 0.01);

  // 4. 連続音圧曲線抽出 (Praat To Intensity)
  const intensity = extractIntensityPraat(channelData, sampleRate, 0.01, minPitch);

  return {
    duration: roundDigits(duration, 3),
    time_step: 0.01,
    max_frequency: 5000,
    max_formant_freq: maxFormantFreq,
    times: spec.times,
    frequencies: spec.frequencies,
    spectrogram: spec.spectrogram,
    pitch,
    formants,
    intensity,
  };
}

/**
 * 選択区間の音響統計メトリクス算出
 * - 分節長 (Duration)
 * - F0 平均 / 最小 / 最大
 * - フォルマント F1, F2, F3 (定常部20%〜80%の中央値)
 * - 音圧 Mean / Min / Max (dB)
 * - スペクトルモーメント (COG, SD, Skewness, Kurtosis)
 */
export function computeIntervalMetricsClient(
  analysisData: AcousticAnalysisData | null,
  start: number,
  end: number,
  channelData?: Float32Array,
  sampleRate?: number
): IntervalMetrics {
  const durMs = roundDigits((end - start) * 1000, 1);

  if (!analysisData) {
    return {
      duration_ms: durMs,
      mean_f0: null,
      min_f0: null,
      max_f0: null,
      f1: null,
      f2: null,
      f3: null,
      mean_intensity: null,
      min_intensity: null,
      max_intensity: null,
      spectral_moments: null,
    };
  }

  const { pitch, formants, intensity } = analysisData;

  // 1. F0 計算
  const pitchVals: number[] = [];
  for (let i = 0; i < pitch.times.length; i++) {
    const t = pitch.times[i];
    if (t >= start && t <= end && pitch.values[i] !== null) {
      pitchVals.push(pitch.values[i]!);
    }
  }

  let meanF0: number | null = null;
  let minF0: number | null = null;
  let maxF0: number | null = null;

  if (pitchVals.length > 0) {
    meanF0 = roundDigits(pitchVals.reduce((a, b) => a + b, 0) / pitchVals.length, 1);
    minF0 = roundDigits(Math.min(...pitchVals), 1);
    maxF0 = roundDigits(Math.max(...pitchVals), 1);
  }

  // 2. フォルマント (定常部 20%〜80% の中央値)
  const fStart = start + (end - start) * 0.2;
  const fEnd = start + (end - start) * 0.8;

  const f1List: number[] = [];
  const f2List: number[] = [];
  const f3List: number[] = [];

  for (let i = 0; i < formants.times.length; i++) {
    const t = formants.times[i];
    if (t >= fStart && t <= fEnd) {
      const v1 = formants.f1[i];
      const v2 = formants.f2[i];
      const v3 = formants.f3[i];
      if (v1 && v1 >= 200 && v1 <= 1250) f1List.push(v1);
      if (v2 && v2 >= 600 && v2 <= 3200) f2List.push(v2);
      if (v3 && v3 >= 1500) f3List.push(v3);
    }
  }

  if (f1List.length === 0) {
    for (let i = 0; i < formants.times.length; i++) {
      const t = formants.times[i];
      if (t >= start && t <= end) {
        const v1 = formants.f1[i];
        const v2 = formants.f2[i];
        const v3 = formants.f3[i];
        if (v1 && v1 >= 200 && v1 <= 1250) f1List.push(v1);
        if (v2 && v2 >= 600 && v2 <= 3200) f2List.push(v2);
        if (v3 && v3 >= 1500) f3List.push(v3);
      }
    }
  }

  const median = (arr: number[]) => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) {
      return roundDigits(sorted[mid], 1);
    }
    return roundDigits((sorted[mid - 1] + sorted[mid]) / 2, 1);
  };

  const chosenF1 = median(f1List);
  let chosenF2 = median(f2List);
  if (chosenF1 && chosenF2 && chosenF2 <= chosenF1 + 150) {
    chosenF2 = null;
  }
  const chosenF3 = median(f3List);

  // 3. Intensity 計算 (連続音圧データから抽出)
  let meanInt: number | null = null;
  let minInt: number | null = null;
  let maxInt: number | null = null;

  if (intensity) {
    const intVals: number[] = [];
    for (let i = 0; i < intensity.times.length; i++) {
      const t = intensity.times[i];
      if (t >= start && t <= end && intensity.values[i] !== null) {
        intVals.push(intensity.values[i]!);
      }
    }
    if (intVals.length > 0) {
      meanInt = roundDigits(intVals.reduce((a, b) => a + b, 0) / intVals.length, 1);
      minInt = roundDigits(Math.min(...intVals), 1);
      maxInt = roundDigits(Math.max(...intVals), 1);
    }
  }

  // 4. スペクトルモーメント (子音・摩擦音分析)
  let spectralMoments: SpectralMoments | null = null;
  if (channelData && sampleRate) {
    spectralMoments = computeSpectralMoments(channelData, sampleRate, start, end);
  }

  return {
    duration_ms: durMs,
    mean_f0: meanF0,
    min_f0: minF0,
    max_f0: maxF0,
    f1: chosenF1,
    f2: chosenF2,
    f3: chosenF3,
    mean_intensity: meanInt,
    min_intensity: minInt,
    max_intensity: maxInt,
    spectral_moments: spectralMoments,
  };
}
