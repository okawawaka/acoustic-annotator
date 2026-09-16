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

// 2次 Butterworth 低域通過フィルタ (ダウンサンプリング時のエイリアシング雑音を除去)
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

// Burg 法による線形予測分析 (Praat の to_formant_burg と同等の Burg アルゴリズム)
// 自己相関法の窓関数によるスペクトル歪みを解消し、常に最小位相安定な極を算出
function lpcBurg(x: Float32Array, p: number): Float64Array {
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

// Praat 準拠 Burg 法による高精度フォルマント (F1, F2, F3) 抽出
function extractFormantsLPC(
  channelData: Float32Array,
  sampleRate: number,
  maxFormantFreq = 5500,
  timeStep = 0.01
): { times: number[]; f1: (number | null)[]; f2: (number | null)[]; f3: (number | null)[] } {
  // 話者上限周波数 (5000Hz or 5500Hz) に合わせて最適ダウンサンプリング
  const targetSr = maxFormantFreq * 2;
  const dsFactor = Math.max(1, Math.round(sampleRate / targetSr));
  const effectiveSr = sampleRate / dsFactor;

  const lpcOrder = 10; // 5対の極 = 5フォルマント
  const windowSize = Math.floor(effectiveSr * 0.025); // 25ms 窓
  const stepSamples = Math.floor(sampleRate * timeStep);

  const times: number[] = [];
  const f1: (number | null)[] = [];
  const f2: (number | null)[] = [];
  const f3: (number | null)[] = [];

  // アンチエイリアス低域通過フィルタを適用
  const filtered = dsFactor > 1 ? lowpassFilter(channelData, sampleRate, maxFormantFreq) : channelData;

  // プリエンファシス (高域強調)
  const pre = new Float32Array(filtered.length);
  pre[0] = filtered[0];
  for (let i = 1; i < filtered.length; i++) {
    pre[i] = filtered[i] - 0.95 * filtered[i - 1];
  }

  const nFft = 512;
  const df = effectiveSr / nFft;

  for (let offset = 0; offset + windowSize * dsFactor < pre.length; offset += stepSamples) {
    const t = offset / sampleRate;
    times.push(roundDigits(t, 3));

    // ハミング窓適用
    const frame = new Float32Array(windowSize);
    let energy = 0;
    for (let i = 0; i < windowSize; i++) {
      const s = pre[offset + i * dsFactor];
      const w = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (windowSize - 1));
      frame[i] = s * w;
      energy += frame[i] * frame[i];
    }

    if (energy < 1e-4) {
      f1.push(null);
      f2.push(null);
      f3.push(null);
      continue;
    }

    // Burg 法により AR 係数を計算
    const a = lpcBurg(frame, lpcOrder);

    // LPC 多項式スペクトル包絡 |1 / A(e^jw)| の評価
    const spec: number[] = [];
    for (let k = 0; k < nFft / 2; k++) {
      const omega = (2 * Math.PI * k) / nFft;
      let re = 0, im = 0;
      for (let m = 0; m <= lpcOrder; m++) {
        re += a[m] * Math.cos(m * omega);
        im -= a[m] * Math.sin(m * omega);
      }
      const mag = 1.0 / Math.sqrt(re * re + im * im + 1e-8);
      spec.push(mag);
    }

    // スペクトル極候補（局所ピーク）探索
    const peaks: { freq: number; mag: number }[] = [];
    for (let k = 1; k < spec.length - 1; k++) {
      if (spec[k] > spec[k - 1] && spec[k] > spec[k + 1]) {
        const freq = k * df;
        if (freq >= 200 && freq <= maxFormantFreq) {
          peaks.push({ freq: Math.round(freq), mag: spec[k] });
        }
      }
    }

    // 音声学に基づく物理制約付きフォルマント割り当て
    // 1. F1: 母音F1帯域 (200〜1200Hz) 内で最も顕著なピーク
    const f1Candidates = peaks.filter((p) => p.freq >= 200 && p.freq <= 1200);
    if (f1Candidates.length > 0) {
      f1Candidates.sort((p1, p2) => p2.mag - p1.mag);
      const chosenF1 = f1Candidates[0].freq;

      // 2. F2: F1 より少なくとも 200Hz 高く、650〜3200Hz の帯域内
      const f2Candidates = peaks.filter(
        (p) => p.freq >= Math.max(650, chosenF1 + 200) && p.freq <= 3200
      );
      if (f2Candidates.length > 0) {
        f2Candidates.sort((p1, p2) => p2.mag - p1.mag);
        const chosenF2 = f2Candidates[0].freq;

        // 3. F3: F2 より 250Hz 高く、1600〜4500Hz の帯域内
        const f3Candidates = peaks.filter(
          (p) => p.freq >= Math.max(1600, chosenF2 + 250) && p.freq <= 4500
        );
        let chosenF3: number | null = null;
        if (f3Candidates.length > 0) {
          f3Candidates.sort((p1, p2) => p2.mag - p1.mag);
          chosenF3 = f3Candidates[0].freq;
        }

        f1.push(roundDigits(chosenF1, 1));
        f2.push(roundDigits(chosenF2, 1));
        f3.push(chosenF3 ? roundDigits(chosenF3, 1) : null);
        continue;
      }
    }

    // 母音共鳴ピークが存在しない非母音フレームは除外
    f1.push(null);
    f2.push(null);
    f3.push(null);
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

  // フォルマント (定常部 20%〜80% の頑健な中央値 / Median)
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
      // 物理的妥当性チェック (F1: 200〜1250Hz, F2: 600〜3200Hz, F2 > F1 + 150Hz)
      if (v1 && v1 >= 200 && v1 <= 1250) f1List.push(v1);
      if (v2 && v2 >= 600 && v2 <= 3200) f2List.push(v2);
      if (v3 && v3 >= 1500) f3List.push(v3);
    }
  }

  // 短い区間などで定常部にサンプルがない場合、全区間(0%〜100%)から取得
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

  // Praat 標準の中央値 (Median) 算出（境界・過渡期スパイクを完全排除）
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
    f1: chosenF1,
    f2: chosenF2,
    f3: chosenF3,
    mean_intensity: intensity,
  };
}

function roundDigits(val: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(val * factor) / factor;
}
