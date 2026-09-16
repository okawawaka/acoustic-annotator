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

export interface AcousticAnalysisData {
  duration: number;
  time_step: number;
  max_frequency: number;
  times: number[];
  frequencies: number[];
  spectrogram: number[][]; // [freq_bin, time_frame] in dB
  pitch: PitchData;
  formants: FormantData;
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
}