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

  const numFreqBins = Math.max(50, Math.round(maxFreq / 50));
  const df = maxFreq / numFreqBins;
  const frequencies = Array.from({ length: numFreqBins }, (_, i) => roundDigits(i * df, 1));

  const stepSamples = Math.floor(sampleRate * timeStep);
  const numFrames = Math.floor(channelData.length / stepSamples);
  const times: number[] = [];

  const matrix: number[][] = Array.from({ length: numFreqBins }, () => []);

  // プリエンファシス (Praat 準拠: 50Hz からの高域強調フィルタ +6dB/oct)
  // 音源の自然な -6dB/oct 減衰を補正し、F2〜F3フォルマントおよび子音の高域エネルギーを鮮明に可視化
  const alpha = Math.exp((-2 * Math.PI * 50) / sampleRate);
  const pre = new Float32Array(channelData.length);
  pre[0] = channelData[0];
  for (let i = 1; i < channelData.length; i++) {
    pre[i] = channelData[i] - alpha * channelData[i - 1];
  }

  // ハニング窓の事前計算
  const window = new Float32Array(windowSamples);
  for (let i = 0; i < windowSamples; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSamples - 1)));
  }

  // 再利用可能な FFT バッファの確保（フレームごとのメモリアロケーションを排除）
  const real = new Float32Array(nFft);
  const imag = new Float32Array(nFft);

  // 一時バッファに全ビンの dB を保存し、最大 dB を算出
  const rawDbMatrix: Float32Array[] = Array.from(
    { length: numFreqBins },
    () => new Float32Array(numFrames)
  );
  let globalMaxDb = -Infinity;

  for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
    const offset = frameIdx * stepSamples;
    times.push(roundDigits(offset / sampleRate, 3));

    real.fill(0);
    imag.fill(0);

    for (let i = 0; i < windowSamples && offset + i < pre.length; i++) {
      real[i] = pre[offset + i] * window[i];
    }

    fft(real, imag);

    const fftDf = sampleRate / nFft;
    for (let bin = 0; bin < numFreqBins; bin++) {
      const targetFreq = bin * df;
      const fftIdx = Math.min(nFft / 2 - 1, Math.round(targetFreq / fftDf));
      const power = real[fftIdx] * real[fftIdx] + imag[fftIdx] * imag[fftIdx];
      const rawDb = 10 * Math.log10(power + 1e-12);
      rawDbMatrix[bin][frameIdx] = rawDb;
      if (rawDb > globalMaxDb) {
        globalMaxDb = rawDb;
      }
    }
  }

  // Praat 標準のダイナミックレンジ正規化:
  // 最大エネルギー globalMaxDb を 100 とし、[globalMaxDb - dynamicRange, globalMaxDb] の範囲を 0〜100 にスケーリング
  const minThreshold = globalMaxDb - Math.max(10, dynamicRange);
  const drSpan = Math.max(1, dynamicRange);

  for (let bin = 0; bin < numFreqBins; bin++) {
    for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
      const rawDb = rawDbMatrix[bin][frameIdx];
      const norm = Math.max(0, Math.min(100, ((rawDb - minThreshold) / drSpan) * 100));
      matrix[bin].push(roundDigits(norm, 1));
    }
  }

  return { frequencies, times, spectrogram: matrix };
}
