import { PitchData } from '@/types';
import { roundDigits } from './dsp';

/**
 * 自己相関法による高精度 F0 (ピッチ) 抽出モジュール
 */
export function extractPitchAutocorr(
  channelData: Float32Array,
  sampleRate: number,
  timeStep = 0.01,
  minPitch = 75,
  maxPitch = 600
): PitchData {
  const times: number[] = [];
  const values: (number | null)[] = [];

  const windowSize = Math.floor(sampleRate * 0.04); // 40ms window
  const minLag = Math.floor(sampleRate / maxPitch);
  const maxLag = Math.floor(sampleRate / minPitch);
  const stepSamples = Math.floor(sampleRate * timeStep);

  for (let offset = 0; offset + windowSize < channelData.length; offset += stepSamples) {
    const t = offset / sampleRate;
    times.push(roundDigits(t, 3));

    // 平均二乗振幅 (有声判定)
    let energy = 0;
    for (let i = 0; i < windowSize; i++) {
      energy += channelData[offset + i] * channelData[offset + i];
    }
    const rms = Math.sqrt(energy / windowSize);

    if (rms < 0.008) {
      values.push(null);
      continue;
    }

    // 自己相関
    let bestLag = -1;
    let maxCorr = -1;

    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < windowSize - lag; i++) {
        corr += channelData[offset + i] * channelData[offset + i + lag];
      }
      if (corr > maxCorr) {
        maxCorr = corr;
        bestLag = lag;
      }
    }

    // 周期性スコアチェック
    const normCorr = maxCorr / (energy + 1e-6);
    if (normCorr > 0.35 && bestLag > 0) {
      const pitch = sampleRate / bestLag;
      values.push(roundDigits(pitch, 1));
    } else {
      values.push(null);
    }
  }

  return { times, values };
}
