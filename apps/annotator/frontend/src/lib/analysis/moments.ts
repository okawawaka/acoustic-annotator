import { SpectralMoments } from '@/types';
import { roundDigits, fft } from './dsp';

/**
 * Praat 準拠: スペクトルモーメント (COG: 重心周波数, SD: 標準偏差, Skewness: 歪度, Kurtosis: 尖度) 計算モジュール
 */
export function computeSpectralMoments(
  channelData: Float32Array,
  sampleRate: number,
  start: number,
  end: number,
  maxFreq = 10000
): SpectralMoments | null {
  const sIdx = Math.max(0, Math.floor(start * sampleRate));
  const eIdx = Math.min(channelData.length, Math.floor(end * sampleRate));
  const length = eIdx - sIdx;
  if (length < 64) return null;

  let nFft = 256;
  while (nFft < length && nFft < 4096) nFft <<= 1;

  const real = new Float32Array(nFft);
  const imag = new Float32Array(nFft);

  const offset = sIdx + Math.max(0, Math.floor((length - nFft) / 2));
  for (let i = 0; i < nFft; i++) {
    const idx = offset + i;
    const sample = idx < eIdx && idx < channelData.length ? channelData[idx] : 0;
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (nFft - 1)));
    real[i] = sample * w;
  }

  fft(real, imag);

  const df = sampleRate / nFft;
  let totalPower = 0;
  const numBins = Math.min(nFft / 2, Math.floor(maxFreq / df));
  const freqs: number[] = [];
  const powers: number[] = [];

  for (let i = 1; i < numBins; i++) {
    const f = i * df;
    const p = real[i] * real[i] + imag[i] * imag[i];
    freqs.push(f);
    powers.push(p);
    totalPower += p;
  }

  if (totalPower < 1e-12) return null;

  // 1. 重心周波数 (COG / M1)
  let sumF = 0;
  for (let i = 0; i < freqs.length; i++) {
    sumF += freqs[i] * powers[i];
  }
  const cog = sumF / totalPower;

  // 2. 標準偏差 (SD / M2)
  let sumDev2 = 0;
  for (let i = 0; i < freqs.length; i++) {
    const diff = freqs[i] - cog;
    sumDev2 += diff * diff * powers[i];
  }
  const variance = sumDev2 / totalPower;
  const sd = Math.sqrt(variance);
  if (sd < 1e-4) return null;

  // 3. 歪度 (Skewness / M3)
  let sumDev3 = 0;
  for (let i = 0; i < freqs.length; i++) {
    const diff = freqs[i] - cog;
    sumDev3 += diff * diff * diff * powers[i];
  }
  const skewness = sumDev3 / (totalPower * Math.pow(sd, 3));

  // 4. 尖度 (Kurtosis / M4)
  let sumDev4 = 0;
  for (let i = 0; i < freqs.length; i++) {
    const diff = freqs[i] - cog;
    sumDev4 += Math.pow(diff, 4) * powers[i];
  }
  const kurtosis = sumDev4 / (totalPower * Math.pow(sd, 4)) - 3;

  return {
    cog: roundDigits(cog, 1),
    sd: roundDigits(sd, 1),
    skewness: roundDigits(skewness, 2),
    kurtosis: roundDigits(kurtosis, 2),
  };
}
