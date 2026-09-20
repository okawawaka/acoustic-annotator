import { SpectralMoments } from '@/types';
import { roundDigits, fft, lpcBurg } from './dsp';
import { computeSpectralMoments } from './moments';

export interface SpectralSliceData {
  time: number;
  frequencies: number[];
  fftDb: number[];
  lpcDb: number[];
  formants: { freq: number; db: number }[];
  moments: SpectralMoments | null;
}

/**
 * Praat 準拠: スライススペクトル分析モジュール (FFT パワースペクトル ＋ LPC Burg スペクトル包絡線)
 */
export function computeSpectralSlice(
  channelData: Float32Array,
  sampleRate: number,
  time: number,
  maxFreq = 5000,
  lpcOrder = 16
): SpectralSliceData {
  const centerSample = Math.floor(time * sampleRate);
  const windowSec = 0.030;
  const windowSize = Math.floor(sampleRate * windowSec);
  let nFft = 1024;
  while (nFft < windowSize && nFft < 4096) nFft <<= 1;

  const real = new Float32Array(nFft);
  const imag = new Float32Array(nFft);
  const frame = new Float32Array(windowSize);

  const startSample = Math.max(0, centerSample - Math.floor(windowSize / 2));
  for (let i = 0; i < windowSize; i++) {
    const s = startSample + i < channelData.length ? channelData[startSample + i] : 0;
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSize - 1)));
    frame[i] = s * w;
    real[i] = frame[i];
  }

  // 1. FFT パワースペクトル
  fft(real, imag);
  const df = sampleRate / nFft;
  const numBins = Math.min(nFft / 2, Math.floor(maxFreq / df));
  const frequencies: number[] = [];
  const fftDb: number[] = [];

  let maxFftPower = 1e-12;
  const powers: number[] = [];
  for (let i = 0; i < numBins; i++) {
    const f = roundDigits(i * df, 1);
    frequencies.push(f);
    const p = real[i] * real[i] + imag[i] * imag[i];
    powers.push(p);
    if (p > maxFftPower) maxFftPower = p;
  }

  for (let i = 0; i < numBins; i++) {
    const db = 10 * Math.log10((powers[i] + 1e-12) / maxFftPower);
    fftDb.push(roundDigits(Math.max(-80, db), 1));
  }

  // 2. LPC Burg 包絡線
  const a = lpcBurg(frame, lpcOrder);
  const lpcDb: number[] = [];
  let maxLpcPower = 1e-12;
  const rawLpc: number[] = [];

  for (let i = 0; i < numBins; i++) {
    const f = frequencies[i];
    const omega = (2 * Math.PI * f) / sampleRate;
    let re = 1.0;
    let im = 0.0;
    for (let k = 1; k <= lpcOrder; k++) {
      re += a[k] * Math.cos(k * omega);
      im -= a[k] * Math.sin(k * omega);
    }
    const magSq = re * re + im * im;
    const pLpc = 1.0 / Math.max(1e-12, magSq);
    rawLpc.push(pLpc);
    if (pLpc > maxLpcPower) maxLpcPower = pLpc;
  }

  for (let i = 0; i < numBins; i++) {
    const db = 10 * Math.log10((rawLpc[i] + 1e-12) / maxLpcPower);
    lpcDb.push(roundDigits(Math.max(-80, db), 1));
  }

  // 3. フォルマント共鳴ピーク検出
  const formants: { freq: number; db: number }[] = [];
  for (let i = 2; i < numBins - 2; i++) {
    if (
      lpcDb[i] > lpcDb[i - 1] &&
      lpcDb[i] > lpcDb[i + 1] &&
      lpcDb[i] > lpcDb[i - 2] &&
      lpcDb[i] > lpcDb[i + 2] &&
      frequencies[i] >= 200 &&
      lpcDb[i] > -40
    ) {
      formants.push({ freq: frequencies[i], db: lpcDb[i] });
    }
  }

  // 4. モーメント
  const moments = computeSpectralMoments(
    channelData,
    sampleRate,
    Math.max(0, time - 0.015),
    Math.min(channelData.length / sampleRate, time + 0.015),
    maxFreq
  );

  return {
    time: roundDigits(time, 3),
    frequencies,
    fftDb,
    lpcDb,
    formants,
    moments,
  };
}
