export interface IntervalEntry {
  start: number;
  end: number;
  label: string;
}

export interface PointEntry {
  time: number;
  label: string;
}

export type TierType = 'interval' | 'point';

export interface Tier {
  name: string;
  tier_type: TierType;
  min_timestamp: number;
  max_timestamp: number;
  entries: (IntervalEntry | PointEntry)[];
}

export interface TextGridData {
  min_timestamp: number;
  max_timestamp: number;
  tiers: Tier[];
}

export interface AudioMetadata {
  audio_id: string;
  filename: string;
  duration: number;
  sample_rate: number;
  channels: number;
  peaks: number[];
}

export interface PitchData {
  times: number[];
  values: (number | null)[];
}

export interface FormantData {
  times: number[];
  f1: (number | null)[];
  f2: (number | null)[];
  f3: (number | null)[];
}

export interface IntensityData {
  times: number[];
  values: (number | null)[];
}

export interface AcousticAnalysisData {
  duration: number;
  time_step: number;
  max_frequency: number;
  max_formant_freq: number;
  times: number[];
  frequencies: number[];
  spectrogram: number[][];
  pitch: PitchData;
  formants: FormantData;
  intensity?: IntensityData;
}

export interface SpectralMoments {
  cog: number;      // Centre of Gravity (重心周波数 Hz)
  sd: number;       // Standard Deviation (標準偏差 Hz)
  skewness: number; // Skewness (歪度)
  kurtosis: number; // Kurtosis (尖度)
}

export interface IntervalMetrics {
  duration_ms: number;
  mean_f0: number | null;
  min_f0: number | null;
  max_f0: number | null;
  f1: number | null;
  f2: number | null;
  f3: number | null;
  mean_intensity: number | null;
  min_intensity?: number | null;
  max_intensity?: number | null;
  max_formant_freq?: number;
  spectral_moments?: SpectralMoments | null;
}

export interface AnalysisSettings {
  spectrogramType: 'wideband' | 'narrowband'; // wideband: 5ms (フォルマント), narrowband: 30ms (倍音)
  minPitch: number;      // e.g. 75
  maxPitch: number;      // e.g. 500
  maxFormantFreq: number;// e.g. 5000 / 5500 / 6000
  dynamicRange: number;  // e.g. 50 dB (30 - 70)
}
