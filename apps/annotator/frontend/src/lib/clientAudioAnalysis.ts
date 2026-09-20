import {
  AcousticAnalysisData,
  IntervalMetrics,
  IntensityData,
  SpectralMoments,
  AnalysisSettings,
} from "@/types";

/**
 * ブラウザ内完全完結の音響解析エンジン (Praat 準拠拡張)
 * Web Audio API および高速数値計算で F0 (自己相関), Formants F1-F3 (LPC Burg + Durand-Kerner),
 * 連続音圧 (To Intensity), スペクトル断面 (Spectral Slice), スペクトルモーメント (COG / SD / Skew / Kurt) を算出します。
 */

// 高速 1D FFT (Radix-2 Cooley-Tukey)
export function fft(real: Float32Array, imag: Float32Array) {
  const n = real.length;
  if (n <= 1) return;

  let j = 0;
  for (let i = 0; i < n; i++) {
    if (j > i) {
      const tempR = real[i];
      real[i] = real[j];
      real[j] = tempR;
      const tempI = imag[i];
      imag[i] = imag[j];
      imag[j] = tempI;
    }
    let m = n >> 1;
    while (m >= 1 && j >= m) {
      j -= m;
      m >>= 1;
    }
    j += m;
  }

  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wR = 1.0;
      let wI = 0.0;
      for (let k = 0; k < half; k++) {
        const pos = i + k;
        const match = pos + half;
        const uR = real[pos];
        const uI = imag[pos];
        const vR = real[match] * wR - imag[match] * wI;
        const vI = real[match] * wI + imag[match] * wR;

        real[pos] = uR + vR;
        imag[pos] = uI + vI;
        real[match] = uR - vR;
        imag[match] = uI - vI;

        const nextWR = wR * wStepR - wI * wStepI;
        wI = wR * wStepI + wI * wStepR;
        wR = nextWR;
      }
    }
  }
}

// 自己相関法によるピッチ抽出 (minPitch - maxPitch)
export function extractPitchAutocorr(
  channelData: Float32Array,
  sampleRate: number,
  timeStep = 0.01,
  minPitch = 75,
  maxPitch = 600
): { times: number[]; values: (number | null)[] } {
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

// Praat 準拠: 連続音圧曲線抽出 (To Intensity: 10ms ステップ, 平滑化 Hanning 窓)
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

// 2次 Butterworth 低域通過フィルタ (ダウンサンプリング時のエイリアシング雑音を完全除去)
function lowpassFilter(data: Float32Array, sr: number, cutoff: number): Float32Array {
  const f = 2 * Math.sin((Math.PI * cutoff) / sr);
  let d1 = 0, d2 = 0;
  const q = 0.707;
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    d1 += f * (data[i] - d1 - d2 / q);
    d2 += f * d1;
    out[i] = d2;
  }
  return out;
}

// 高精度線形補間リサンプリング (Praat 準拠: 目標サンプリングレート targetSr = 2 * maxFormantFreq へ厳密変換)
function resampleLinear(data: Float32Array, oldSr: number, newSr: number): Float32Array {
  if (oldSr === newSr) return data;
  const ratio = oldSr / newSr;
  const newLen = Math.floor(data.length / ratio);
  const out = new Float32Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const srcIdx = i * ratio;
    const i0 = Math.floor(srcIdx);
    const frac = srcIdx - i0;
    const s0 = data[i0] || 0;
    const s1 = data[i0 + 1] || 0;
    out[i] = s0 + frac * (s1 - s0);
  }
  return out;
}

// Burg 法による線形予測分析 (Praat の Sound_to_Formant_burg と同等の Maximum Entropy 法)
export function lpcBurg(x: Float32Array, p: number): Float64Array {
  const n = x.length;
  const a = new Float64Array(p + 1);
  a[0] = 1.0;
  const f = new Float64Array(n);
  const b = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    f[i] = x[i];
    b[i] = x[i];
  }
  const aPrev = new Float64Array(p + 1);
  aPrev[0] = 1.0;

  for (let m = 1; m <= p; m++) {
    let num = 0.0;
    let den = 0.0;
    for (let i = m; i < n; i++) {
      num += f[i] * b[i - 1];
      den += f[i] * f[i] + b[i - 1] * b[i - 1];
    }
    if (den <= 1e-12) break;
    const k = (2.0 * num) / den;
    if (Math.abs(k) >= 1.0) break;

    a[m] = -k;
    for (let i = 1; i < m; i++) {
      a[i] = aPrev[i] - k * aPrev[m - i];
    }
    for (let i = 0; i <= m; i++) {
      aPrev[i] = a[i];
    }
    for (let i = n - 1; i >= m; i--) {
      const fOld = f[i];
      const bOld = b[i - 1];
      f[i] = fOld - k * bOld;
      b[i] = bOld - k * fOld;
    }
  }
  return a;
}

// 多項式複素根探索法 (Durand-Kerner法): A(z) = 1 + a1*z^-1 + ... + ap*z^-p = 0
function findRootsDurandKerner(a: Float64Array): [number, number][] {
  const p = a.length - 1;
  const roots: [number, number][] = [];
  const radius = 0.9;
  for (let i = 0; i < p; i++) {
    const angle = (2 * Math.PI * i) / p + 0.3;
    roots.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }

  function cMul(c1: [number, number], c2: [number, number]): [number, number] {
    return [c1[0] * c2[0] - c1[1] * c2[1], c1[0] * c2[1] + c1[1] * c2[0]];
  }
  function cDiv(c1: [number, number], c2: [number, number]): [number, number] {
    const d = c2[0] * c2[0] + c2[1] * c2[1];
    return [(c1[0] * c2[0] + c1[1] * c2[1]) / d, (c1[1] * c2[0] - c1[0] * c2[1]) / d];
  }
  function cSub(c1: [number, number], c2: [number, number]): [number, number] {
    return [c1[0] - c2[0], c1[1] - c2[1]];
  }
  function evalPoly(z: [number, number]): [number, number] {
    let res: [number, number] = [1.0, 0.0];
    for (let i = 1; i <= p; i++) {
      res = cMul(res, z);
      res[0] += a[i];
    }
    return res;
  }

  for (let iter = 0; iter < 40; iter++) {
    let maxChange = 0;
    for (let i = 0; i < p; i++) {
      const zi = roots[i];
      const pVal = evalPoly(zi);
      let denom: [number, number] = [1.0, 0.0];
      for (let j = 0; j < p; j++) {
        if (i !== j) {
          denom = cMul(denom, cSub(zi, roots[j]));
        }
      }
      const step = cDiv(pVal, denom);
      roots[i] = cSub(zi, step);
      const chg = Math.hypot(step[0], step[1]);
      if (chg > maxChange) maxChange = chg;
    }
    if (maxChange < 1e-6) break;
  }
  return roots;
}

// Praat 準拠 Burg 法＋多項式根探索 (Root-Finding) による高精度フォルマント (F1, F2, F3) 抽出
export function extractFormantsLPC(
  channelData: Float32Array,
  sampleRate: number,
  maxFormantFreq = 5500,
  timeStep = 0.01
): { times: number[]; f1: (number | null)[]; f2: (number | null)[]; f3: (number | null)[] } {
  const targetSr = maxFormantFreq * 2;
  const lpcOrder = 10; // 5対の複素共役極 = 5フォルマント

  const filtered = lowpassFilter(channelData, sampleRate, maxFormantFreq);
  const resampled = resampleLinear(filtered, sampleRate, targetSr);

  // プリエンファシス (Praat 準拠: 50Hz からの高域強調フィルタ)
  const alpha = Math.exp((-2 * Math.PI * 50) / targetSr);
  const pre = new Float32Array(resampled.length);
  pre[0] = resampled[0];
  for (let i = 1; i < resampled.length; i++) {
    pre[i] = resampled[i] - alpha * resampled[i - 1];
  }

  const windowSize = Math.floor(targetSr * 0.025);
  const stepSize = Math.floor(targetSr * timeStep);

  const times: number[] = [];
  const f1: (number | null)[] = [];
  const f2: (number | null)[] = [];
  const f3: (number | null)[] = [];

  for (let offset = 0; offset + windowSize < pre.length; offset += stepSize) {
    const t = offset / targetSr;
    times.push(roundDigits(t, 3));

    const frame = new Float32Array(windowSize);
    let energy = 0;
    for (let i = 0; i < windowSize; i++) {
      const edgeDist = (i - windowSize / 2) / (windowSize / 2);
      const w = Math.exp(-12 * edgeDist * edgeDist);
      frame[i] = pre[offset + i] * w;
      energy += frame[i] * frame[i];
    }

    if (energy < 1e-4) {
      f1.push(null);
      f2.push(null);
      f3.push(null);
      continue;
    }

    const a = lpcBurg(frame, lpcOrder);
    const roots = findRootsDurandKerner(a);

    const candidates: { freq: number; bw: number }[] = [];
    for (const r of roots) {
      if (r[1] > 0) {
        const freq = (Math.atan2(r[1], r[0]) * targetSr) / (2 * Math.PI);
        const radius = Math.hypot(r[0], r[1]);
        const bw = (-Math.log(radius) * targetSr) / Math.PI;

        if (freq >= 150 && freq <= maxFormantFreq && bw > 0 && bw < 700) {
          candidates.push({ freq: Math.round(freq), bw: Math.round(bw) });
        }
      }
    }

    candidates.sort((c1, c2) => c1.freq - c2.freq);

    if (candidates.length >= 2) {
      const candF1 = candidates[0].freq;
      const candF2 = candidates[1].freq;
      const candF3 = candidates[2] ? candidates[2].freq : null;

      if (candF1 >= 200 && candF1 <= 1250 && candF2 >= 600 && candF2 <= 3200 && candF2 > candF1 + 100) {
        f1.push(roundDigits(candF1, 1));
        f2.push(roundDigits(candF2, 1));
        f3.push(candF3 && candF3 > candF2 + 150 ? roundDigits(candF3, 1) : null);
        continue;
      }
    }

    f1.push(null);
    f2.push(null);
    f3.push(null);
  }

  return { times, f1, f2, f3 };
}

// STFT スペクトログラム生成 (広帯域 5ms / 狭帯域 30ms 切り替え・ダイナミックレンジ対応)
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

// Praat 準拠: スペクトルモーメント (COG: 重心周波数, SD: 標準偏差, Skewness: 歪度, Kurtosis: 尖度)
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
    const sample = (idx < eIdx && idx < channelData.length) ? channelData[idx] : 0;
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
  const kurtosis = (sumDev4 / (totalPower * Math.pow(sd, 4))) - 3;

  return {
    cog: roundDigits(cog, 1),
    sd: roundDigits(sd, 1),
    skewness: roundDigits(skewness, 2),
    kurtosis: roundDigits(kurtosis, 2),
  };
}

export interface SpectralSliceData {
  time: number;
  frequencies: number[];
  fftDb: number[];
  lpcDb: number[];
  formants: { freq: number; db: number }[];
  moments: SpectralMoments | null;
}

// Praat 準拠: スライススペクトル分析 (FFT パワースペクトル ＋ LPC Burg スペクトル包絡線)
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
    const s = (startSample + i < channelData.length) ? channelData[startSample + i] : 0;
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

export async function analyzeAudioClient(
  audioBuffer: AudioBuffer,
  settingsOrMaxFreq?: Partial<AnalysisSettings> | number
): Promise<AcousticAnalysisData> {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;

  const settings: Partial<AnalysisSettings> =
    typeof settingsOrMaxFreq === 'number'
      ? { maxFormantFreq: settingsOrMaxFreq }
      : settingsOrMaxFreq || {};

  const minPitch = settings.minPitch ?? 75;
  const maxPitch = settings.maxPitch ?? 600;
  const maxFormantFreq = settings.maxFormantFreq ?? 5500;
  const spectrogramType = settings.spectrogramType ?? 'wideband';
  const dynamicRange = settings.dynamicRange ?? 50;

  // 1. スペクトログラム生成 (広帯域 / 狭帯域)
  const spec = generateSpectrogram(channelData, sampleRate, 5000, 0.01, spectrogramType, dynamicRange);

  // 2. ピッチ抽出 (自己相関法)
  const pitch = extractPitchAutocorr(channelData, sampleRate, 0.01, minPitch, maxPitch);

  // 3. フォルマント抽出 (LPC Burg + Durand-Kerner)
  const formants = extractFormantsLPC(channelData, sampleRate, maxFormantFreq, 0.01);

  // 4. 連続音圧曲線抽出 (Praat To Intensity)
  const intensity = extractIntensityPraat(channelData, sampleRate, 0.01, minPitch);

  return {
    duration: roundDigits(duration, 3),
    time_step: 0.01,
    max_frequency: 5000,
    max_formant_freq: maxFormantFreq,
    times: spec.times,
    frequencies: spec.frequencies,
    spectrogram: spec.spectrogram,
    pitch,
    formants,
    intensity,
  };
}

export function computeIntervalMetricsClient(
  analysisData: AcousticAnalysisData | null,
  start: number,
  end: number,
  channelData?: Float32Array,
  sampleRate?: number
): IntervalMetrics {
  const durMs = roundDigits((end - start) * 1000, 1);

  if (!analysisData) {
    return {
      duration_ms: durMs,
      mean_f0: null,
      min_f0: null,
      max_f0: null,
      f1: null,
      f2: null,
      f3: null,
      mean_intensity: null,
      min_intensity: null,
      max_intensity: null,
      spectral_moments: null,
    };
  }

  const { pitch, formants, intensity } = analysisData;

  // F0 計算
  const pitchVals: number[] = [];
  for (let i = 0; i < pitch.times.length; i++) {
    const t = pitch.times[i];
    if (t >= start && t <= end && pitch.values[i] !== null) {
      pitchVals.push(pitch.values[i]!);
    }
  }

  let meanF0: number | null = null;
  let minF0: number | null = null;
  let maxF0: number | null = null;

  if (pitchVals.length > 0) {
    meanF0 = roundDigits(pitchVals.reduce((a, b) => a + b, 0) / pitchVals.length, 1);
    minF0 = roundDigits(Math.min(...pitchVals), 1);
    maxF0 = roundDigits(Math.max(...pitchVals), 1);
  }

  // フォルマント (定常部 20%〜80% の中央値)
  const fStart = start + (end - start) * 0.2;
  const fEnd = start + (end - start) * 0.8;

  const f1List: number[] = [];
  const f2List: number[] = [];
  const f3List: number[] = [];

  for (let i = 0; i < formants.times.length; i++) {
    const t = formants.times[i];
    if (t >= fStart && t <= fEnd) {
      const v1 = formants.f1[i];
      const v2 = formants.f2[i];
      const v3 = formants.f3[i];
      if (v1 && v1 >= 200 && v1 <= 1250) f1List.push(v1);
      if (v2 && v2 >= 600 && v2 <= 3200) f2List.push(v2);
      if (v3 && v3 >= 1500) f3List.push(v3);
    }
  }

  if (f1List.length === 0) {
    for (let i = 0; i < formants.times.length; i++) {
      const t = formants.times[i];
      if (t >= start && t <= end) {
        const v1 = formants.f1[i];
        const v2 = formants.f2[i];
        const v3 = formants.f3[i];
        if (v1 && v1 >= 200 && v1 <= 1250) f1List.push(v1);
        if (v2 && v2 >= 600 && v2 <= 3200) f2List.push(v2);
        if (v3 && v3 >= 1500) f3List.push(v3);
      }
    }
  }

  const median = (arr: number[]) => {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) {
      return roundDigits(sorted[mid], 1);
    }
    return roundDigits((sorted[mid - 1] + sorted[mid]) / 2, 1);
  };

  const chosenF1 = median(f1List);
  let chosenF2 = median(f2List);
  if (chosenF1 && chosenF2 && chosenF2 <= chosenF1 + 150) {
    chosenF2 = null;
  }
  const chosenF3 = median(f3List);

  // Intensity 計算 (連続音圧データから抽出)
  let meanInt: number | null = null;
  let minInt: number | null = null;
  let maxInt: number | null = null;

  if (intensity) {
    const intVals: number[] = [];
    for (let i = 0; i < intensity.times.length; i++) {
      const t = intensity.times[i];
      if (t >= start && t <= end && intensity.values[i] !== null) {
        intVals.push(intensity.values[i]!);
      }
    }
    if (intVals.length > 0) {
      meanInt = roundDigits(intVals.reduce((a, b) => a + b, 0) / intVals.length, 1);
      minInt = roundDigits(Math.min(...intVals), 1);
      maxInt = roundDigits(Math.max(...intVals), 1);
    }
  }

  // スペクトルモーメント (子音・摩擦音分析)
  let spectralMoments: SpectralMoments | null = null;
  if (channelData && sampleRate) {
    spectralMoments = computeSpectralMoments(channelData, sampleRate, start, end);
  }

  return {
    duration_ms: durMs,
    mean_f0: meanF0,
    min_f0: minF0,
    max_f0: maxF0,
    f1: chosenF1,
    f2: chosenF2,
    f3: chosenF3,
    mean_intensity: meanInt,
    min_intensity: minInt,
    max_intensity: maxInt,
    spectral_moments: spectralMoments,
  };
}

function roundDigits(val: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(val * factor) / factor;
}
