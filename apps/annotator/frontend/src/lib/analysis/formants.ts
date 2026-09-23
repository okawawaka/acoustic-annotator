import { FormantData } from '@/types';
import { roundDigits, lowpassFilter, resampleLinear, lpcBurg, findRootsDurandKerner } from './dsp';

/**
 * Praat 準拠 Burg 法＋多項式根探索 (Root-Finding) によるフォルマント (F1, F2, F3) 抽出モジュール
 */
export function extractFormantsLPC(
  channelData: Float32Array,
  sampleRate: number,
  maxFormantFreq = 5500,
  timeStep = 0.01
): FormantData {
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

/**
 * フォルマント (F1, F2, F3) 抽出（非同期ノンブロッキング版）
 * 50フレームごとにメインスレッドへ制御を譲り、長尺音声でもスムーズなUI動作を実現
 */
export async function extractFormantsLPCAsync(
  channelData: Float32Array,
  sampleRate: number,
  maxFormantFreq = 5500,
  timeStep = 0.01
): Promise<FormantData> {
  const targetSr = maxFormantFreq * 2;
  const lpcOrder = 10;

  const filtered = lowpassFilter(channelData, sampleRate, maxFormantFreq);
  const resampled = resampleLinear(filtered, sampleRate, targetSr);

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

  let frameCount = 0;

  for (let offset = 0; offset + windowSize < pre.length; offset += stepSize) {
    if (++frameCount % 50 === 0) {
      const { yieldToMain } = await import('./dsp');
      await yieldToMain();
    }

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

