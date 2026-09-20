import { roundDigits, fft } from './dsp';

/**
 * STFT スペクトログラム生成モジュール (広帯域 5ms / 狭帯域 30ms・ダイナミックレンジ対応)
 */
export function generateSpectrogram(
  channelData: Float32Array,
  sampleRate: number,
  maxFreq = 5000,
  timeStep = 0.01,
  spectrogramType: 'wideband' | 'narrowband' = 'wideband',
  dynamicRange = 50
): { frequencies: number[]; times: number[]; spectrogram: number[][] } {
  // 広帯域 (5ms 窓, フォルマント/パルス重視) vs 狭帯域 (30ms 窓, 倍音構造重視)
  const windowSec = spectrogramType === 'narrowband' ? 0.030 : 0.005;
  const windowSamples = Math.floor(sampleRate * windowSec);

  let nFft = 256;
  while (nFft < windowSamples && nFft < 2048) nFft <<= 1;
  if (spectrogramType === 'narrowband' && nFft < 1024) nFft = 1024;

  const numFreqBins = 100;
  const df = maxFreq / numFreqBins;
  const frequencies = Array.from({ length: numFreqBins }, (_, i) => roundDigits(i * df, 1));

  const stepSamples = Math.floor(sampleRate * timeStep);
  const numFrames = Math.floor(channelData.length / stepSamples);
  const times: number[] = [];

  const matrix: number[][] = Array.from({ length: numFreqBins }, () => []);

  // ハニング窓の事前計算
  const window = new Float32Array(windowSamples);
  for (let i = 0; i < windowSamples; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSamples - 1)));
  }

  for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
    const offset = frameIdx * stepSamples;
    times.push(roundDigits(offset / sampleRate, 3));

    const real = new Float32Array(nFft);
    const imag = new Float32Array(nFft);

    for (let i = 0; i < windowSamples && offset + i < channelData.length; i++) {
      real[i] = channelData[offset + i] * window[i];
    }

    fft(real, imag);

    const fftDf = sampleRate / nFft;
    for (let bin = 0; bin < numFreqBins; bin++) {
      const targetFreq = bin * df;
      const fftIdx = Math.min(nFft / 2 - 1, Math.round(targetFreq / fftDf));
      const power = real[fftIdx] * real[fftIdx] + imag[fftIdx] * imag[fftIdx];
      const db = 10 * Math.log10(power + 1e-12) + 70; // 0〜85dB程度
      matrix[bin].push(roundDigits(Math.max(0, Math.min(85, db)), 1));
    }
  }

  return { frequencies, times, spectrogram: matrix };
}
