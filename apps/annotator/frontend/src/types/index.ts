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
