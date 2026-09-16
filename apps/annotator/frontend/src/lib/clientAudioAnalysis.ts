import { AcousticAnalysisData, IntervalMetrics } from "@/types";

/**
 * ブラウザ内完全完結の音響解析エンジン
 * Pythonバックエンド (Parselmouth) を一切使用せず、
 * Web Audio API および高速数値計算で F0, Formants (F1-F3), Spectrogram を算出します。
 */

// 高速 1D FFT (Radix-2 Cooley-Tukey)
function fft(real: Float32Array, imag: Float32Array) {
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

// 自己相関法によるピッチ抽出 (75Hz - 600Hz)
function extractPitchAutocorr(
  channelData: Float32Array,
  sampleRate: number,
  timeStep = 0.01
): { times: number[]; values: (number | null)[] } {
  const duration = channelData.length / sampleRate;
  const times: number[] = [];
  const values: (number | null)[] = [];

  const windowSize = Math.floor(sampleRate * 0.04); // 40ms window
  const minLag = Math.floor(sampleRate / 600); // 600Hz
  const maxLag = Math.floor(sampleRate / 75);  // 75Hz
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

    if (rms < 0.01) {
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

// LPC (自己相関 + レヴィンソン・ダービン法) によるフォルマント (F1, F2, F3) 抽出
function extractFormantsLPC(
  channelData: Float32Array,
  sampleRate: number,
  maxFormantFreq = 5500,
  timeStep = 0.01
): { times: number[]; f1: (number | null)[]; f2: (number | null)[]; f3: (number | null)[] } {
  // 話者上限周波数 (5000Hz or 5500Hz) に合わせて最適ダウンサンプリング
  const targetSr = maxFormantFreq * 2; // 例: 11000Hz または 10000Hz
  const dsFactor = Math.max(1, Math.round(sampleRate / targetSr));
  const effectiveSr = sampleRate / dsFactor;

  const lpcOrder = 10; // 5ペアの極 = 5フォルマント
  const windowSize = Math.floor(effectiveSr * 0.025); // 25ms 窓
  const stepSamples = Math.floor(sampleRate * timeStep);

  const times: number[] = [];
  const f1: (number | null)[] = [];
  const f2: (number | null)[] = [];
  const f3: (number | null)[] = [];

  // プリエンファシス (高域強調)
  const pre = new Float32Array(channelData.length);
  pre[0] = channelData[0];
  for (let i = 1; i < channelData.length; i++) {
    pre[i] = channelData[i] - 0.95 * channelData[i - 1];
  }

  for (let offset = 0; offset + windowSize * dsFactor < pre.length; offset += stepSamples) {
    const t = offset / sampleRate;
    times.push(roundDigits(t, 3));

    // ハミング窓適用
    const frame = new Float32Array(windowSize);
    for (let i = 0; i < windowSize; i++) {
      const w = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (windowSize - 1));
      frame[i] = pre[offset + i * dsFactor] * w;
    }

    // 自己相関計算
    const r = new Float32Array(lpcOrder + 1);
    for (let k = 0; k <= lpcOrder; k++) {
      let sum = 0;
      for (let i = 0; i < windowSize - k; i++) {
        sum += frame[i] * frame[i + k];
      }
      r[k] = sum;
    }

    if (r[0] < 1e-5) {
      f1.push(null);
      f2.push(null);
      f3.push(null);
      continue;
    }

    // レヴィンソン・ダービン法
    const a = new Float32Array(lpcOrder + 1);
    a[0] = 1.0;
    let e = r[0];

    for (let i = 1; i <= lpcOrder; i++) {
      let lambda = 0;
      for (let j = 0; j < i; j++) {
        lambda -= a[j] * r[i - j];
      }
      const kVal = lambda / e;

      for (let j = 1; j < (i + 1) / 2; j++) {
        const temp = a[j] + kVal * a[i - j];
        a[i - j] = a[i - j] + kVal * a[j];
        a[j] = temp;
      }
      if (i % 2 === 0) {
        a[i / 2] += kVal * a[i / 2];
      }
      a[i] = kVal;
      e *= (1.0 - kVal * kVal);
    }

    // LPC 多項式の周波数スペクトルピーク探索 (0〜effectiveSr/2)
    const nFft = 512;
    const real = new Float32Array(nFft);
    const imag = new Float32Array(nFft);
    for (let i = 0; i <= lpcOrder; i++) {
      real[i] = a[i];
    }
    fft(real, imag);

    const peaks: number[] = [];
    const df = effectiveSr / nFft;

    let prevVal = 0;
    let prevDiff = 0;

    for (let k = 1; k < nFft / 2; k++) {
      const mag = 1.0 / (real[k] * real[k] + imag[k] * imag[k] + 1e-8);
      const diff = mag - prevVal;
      if (prevDiff > 0 && diff <= 0) {
        const freq = (k - 1) * df;
        if (freq > 200 && freq < maxFormantFreq) {
          peaks.push(freq);
        }
      }
      prevDiff = diff;
      prevVal = mag;
    }

    peaks.sort((p1, p2) => p1 - p2);

    f1.push(peaks[0] ? roundDigits(peaks[0], 1) : null);
    f2.push(peaks[1] ? roundDigits(peaks[1], 1) : null);
    f3.push(peaks[2] ? roundDigits(peaks[2], 1) : null);
  }

  return { times, f1, f2, f3 };
}

// STFT スペクトログラム生成 (0 - 5000Hz, 100 bins)
function generateSpectrogram(
  channelData: Float32Array,
  sampleRate: number,
  maxFreq = 5000,
  timeStep = 0.01
): { frequencies: number[]; times: number[]; spectrogram: number[][] } {
  const nFft = 512;
  const numFreqBins = 100;
  const df = maxFreq / numFreqBins;
  const frequencies = Array.from({ length: numFreqBins }, (_, i) => roundDigits(i * df, 1));

  const stepSamples = Math.floor(sampleRate * timeStep);
  const numFrames = Math.floor(channelData.length / stepSamples);
  const times: number[] = [];

  const matrix: number[][] = Array.from({ length: numFreqBins }, () => []);

  for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
    const offset = frameIdx * stepSamples;
    times.push(roundDigits(offset / sampleRate, 3));

    const real = new Float32Array(nFft);
    const imag = new Float32Array(nFft);

    // ハニング窓
    for (let i = 0; i < nFft && offset + i < channelData.length; i++) {
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (nFft - 1)));
      real[i] = channelData[offset + i] * w;
    }

    fft(real, imag);

    // 0〜maxFreq の範囲で 100 ビンにマッピング
    const fftDf = sampleRate / nFft;
    for (let bin = 0; bin < numFreqBins; bin++) {
      const targetFreq = bin * df;
      const fftIdx = Math.min(nFft / 2 - 1, Math.round(targetFreq / fftDf));
      const power = real[fftIdx] * real[fftIdx] + imag[fftIdx] * imag[fftIdx];
      const db = 10 * Math.log10(power + 1e-12) + 70; // 0〜80dB程度に補正
      matrix[bin].push(roundDigits(Math.max(0, Math.min(85, db)), 1));
    }
  }

  return { frequencies, times, spectrogram: matrix };
}

export async function analyzeAudioClient(
  audioBuffer: AudioBuffer,
  maxFormantFreq = 5500
): Promise<AcousticAnalysisData> {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;

  // 1. スペクトログラム生成
  const spec = generateSpectrogram(channelData, sampleRate, 5000, 0.01);

  // 2. ピッチ抽出 (自己相関法)
  const pitch = extractPitchAutocorr(channelData, sampleRate, 0.01);

  // 3. フォルマント抽出 (LPC Burg/Levinson法)
  const formants = extractFormantsLPC(channelData, sampleRate, maxFormantFreq, 0.01);

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
    };
  }

  const { pitch, formants } = analysisData;

  // F0 平均値
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
      if (formants.f1[i]) f1List.push(formants.f1[i]!);
      if (formants.f2[i]) f2List.push(formants.f2[i]!);
      if (formants.f3[i]) f3List.push(formants.f3[i]!);
    }
  }

  const avg = (arr: number[]) => (arr.length > 0 ? roundDigits(arr.reduce((a, b) => a + b, 0) / arr.length, 1) : null);

  // Intensity 計算
  let intensity = 65.0; // fallback
  if (channelData && sampleRate) {
    const sIdx = Math.floor(start * sampleRate);
    const eIdx = Math.min(channelData.length, Math.floor(end * sampleRate));
    let energy = 0;
    for (let i = sIdx; i < eIdx; i++) {
      energy += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(energy / Math.max(1, eIdx - sIdx));
    intensity = roundDigits(20 * Math.log10(rms + 1e-6) + 85, 1);
  }

  return {
    duration_ms: durMs,
    mean_f0: meanF0,
    min_f0: minF0,
    max_f0: maxF0,
    f1: avg(f1List),
    f2: avg(f2List),
    f3: avg(f3List),
    mean_intensity: intensity,
  };
}

function roundDigits(val: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(val * factor) / factor;
}
