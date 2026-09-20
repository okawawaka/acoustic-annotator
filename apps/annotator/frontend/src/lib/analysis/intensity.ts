import { IntensityData } from '@/types';
import { roundDigits } from './dsp';

/**
 * Praat 準拠: 連続音圧曲線抽出モジュール (To Intensity: 10ms ステップ, 平滑化 Hanning 窓)
 */
export function extractIntensityPraat(
  channelData: Float32Array,
  sampleRate: number,
  timeStep = 0.01,
  minPitch = 75
): IntensityData {
  const times: number[] = [];
  const values: (number | null)[] = [];

  // Praat 標準: 窓長は 3.2 / minPitch (約 30〜42ms)
  const windowSec = Math.max(0.025, 3.2 / minPitch);
  const windowSize = Math.floor(sampleRate * windowSec);
  const stepSamples = Math.floor(sampleRate * timeStep);

  const window = new Float32Array(windowSize);
  let winSum = 0;
  for (let i = 0; i < windowSize; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSize - 1)));
    winSum += window[i] * window[i];
  }
  const normFactor = Math.sqrt(winSum / windowSize);

  for (let offset = 0; offset + windowSize <= channelData.length; offset += stepSamples) {
    const t = (offset + windowSize / 2) / sampleRate;
    times.push(roundDigits(t, 3));

    let energy = 0;
    for (let i = 0; i < windowSize; i++) {
      const s = channelData[offset + i] * window[i];
      energy += s * s;
    }
    const rms = (Math.sqrt(energy / windowSize) / normFactor) + 1e-8;
    // Praat 互換音圧レベル (dB SPL: 通常発話で 60〜80 dB)
    const db = 20 * Math.log10(rms) + 90.0;
    values.push(roundDigits(Math.max(0, Math.min(100, db)), 1));
  }

  return { times, values };
}
