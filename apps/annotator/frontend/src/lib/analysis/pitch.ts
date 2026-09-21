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

    // 自己相関の計算
    const lagCount = maxLag - minLag + 1;
    const corrs = new Float32Array(lagCount);
    let bestIdx = -1;
    let maxCorr = -1;

    for (let lIdx = 0; lIdx < lagCount; lIdx++) {
      const lag = minLag + lIdx;
      let corr = 0;
      for (let i = 0; i < windowSize - lag; i++) {
        corr += channelData[offset + i] * channelData[offset + i + lag];
      }
      corrs[lIdx] = corr;
      if (corr > maxCorr) {
        maxCorr = corr;
        bestIdx = lIdx;
      }
    }

    // 周期性スコアチェック (有声・無声判定)
    const normCorr = maxCorr / (energy + 1e-6);
    if (normCorr > 0.35 && bestIdx > 0 && bestIdx < lagCount - 1) {
      // Praat 準拠 放物線補間 (Parabolic Interpolation)
      // 離散サンプリングによる階段状量子化を排除し、サブサンプル精度で真の極大値ラグを推定
      const alpha = corrs[bestIdx - 1];
      const beta = corrs[bestIdx];
      const gamma = corrs[bestIdx + 1];
      const denom = alpha - 2 * beta + gamma;

      let delta = 0;
      if (Math.abs(denom) > 1e-12) {
        delta = (alpha - gamma) / (2 * denom);
      }

      const refinedLag = minLag + bestIdx + delta;
      if (refinedLag > 0) {
        const pitch = sampleRate / refinedLag;
        if (pitch >= minPitch && pitch <= maxPitch) {
          values.push(roundDigits(pitch, 1));
          continue;
        }
      }
    }

    values.push(null);
  }

  return { times, values };
}
