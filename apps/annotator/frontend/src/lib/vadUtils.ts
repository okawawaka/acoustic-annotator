import { IntervalEntry } from '@/types';

export interface VADOptions {
  minSpeechDuration?: number; // seconds, default 0.1
  minSilenceDuration?: number; // seconds, default 0.25
  speechPadding?: number; // seconds, default 0.05
}

/**
 * 音響波形のRMSエネルギーに基づく高速Voice Activity Detection (VAD)
 * Praatの "To TextGrid (silences)..." アルゴリズムに準拠し、
 * クライアント側で完全にオフライン動作します。
 */
export function computeAcousticVAD(
  channelData: Float32Array,
  sampleRate: number,
  options: VADOptions = {}
): { start: number; end: number }[] {
  const minSpeechSec = options.minSpeechDuration ?? 0.1;
  const minSilenceSec = options.minSilenceDuration ?? 0.25;
  const paddingSec = options.speechPadding ?? 0.05;

  const frameLength = Math.max(128, Math.floor(sampleRate * 0.02)); // 20ms
  const hopLength = Math.max(64, Math.floor(sampleRate * 0.01)); // 10ms
  const totalFrames = Math.floor((channelData.length - frameLength) / hopLength);

  if (totalFrames <= 0) {
    return [{ start: 0, end: channelData.length / sampleRate }];
  }

  // 1. 各フレームのRMSエネルギーを計算
  const energies = new Float32Array(totalFrames);
  for (let i = 0; i < totalFrames; i++) {
    const offset = i * hopLength;
    let sumSq = 0;
    for (let j = 0; j < frameLength; j++) {
      const val = channelData[offset + j];
      sumSq += val * val;
    }
    energies[i] = Math.sqrt(sumSq / frameLength);
  }

  // 2. ノイズフロアと閾値を決定
  const sorted = Array.from(energies).sort((a, b) => a - b);
  const noiseFloor = sorted[Math.floor(sorted.length * 0.15)] || 0.001;
  const maxEnergy = sorted[Math.floor(sorted.length * 0.98)] || 0.1;
  const threshold = Math.max(0.005, noiseFloor + (maxEnergy - noiseFloor) * 0.12);

  // 3. 有音フレームを判定
  const isSpeechFrame = new Uint8Array(totalFrames);
  for (let i = 0; i < totalFrames; i++) {
    isSpeechFrame[i] = energies[i] >= threshold ? 1 : 0;
  }

  // 4. 連続フレームをセグメント化
  const rawSegments: { startFrame: number; endFrame: number; isSpeech: boolean }[] = [];
  let currentSpeech = isSpeechFrame[0] === 1;
  let startIdx = 0;

  for (let i = 1; i < totalFrames; i++) {
    const s = isSpeechFrame[i] === 1;
    if (s !== currentSpeech) {
      rawSegments.push({ startFrame: startIdx, endFrame: i, isSpeech: currentSpeech });
      currentSpeech = s;
      startIdx = i;
    }
  }
  rawSegments.push({ startFrame: startIdx, endFrame: totalFrames, isSpeech: currentSpeech });

  // 5. 短い無音（ポーズ）の統合
  const minSilenceFrames = Math.floor(minSilenceSec / 0.01);
  const merged: { startFrame: number; endFrame: number; isSpeech: boolean }[] = [];

  for (const seg of rawSegments) {
    if (!seg.isSpeech && seg.endFrame - seg.startFrame < minSilenceFrames && merged.length > 0) {
      merged[merged.length - 1].endFrame = seg.endFrame;
    } else if (merged.length > 0 && merged[merged.length - 1].isSpeech === seg.isSpeech) {
      merged[merged.length - 1].endFrame = seg.endFrame;
    } else {
      merged.push({ ...seg });
    }
  }

  // 6. 短すぎる音声バーストの除去 & 前後パディング
  const minSpeechFrames = Math.floor(minSpeechSec / 0.01);
  const speechSegments: { start: number; end: number }[] = [];
  const totalDuration = channelData.length / sampleRate;

  for (const seg of merged) {
    if (seg.isSpeech && seg.endFrame - seg.startFrame >= minSpeechFrames) {
      const s = Math.max(0, (seg.startFrame * hopLength) / sampleRate - paddingSec);
      const e = Math.min(totalDuration, (seg.endFrame * hopLength) / sampleRate + paddingSec);
      if (e > s) {
        if (speechSegments.length > 0 && s <= speechSegments[speechSegments.length - 1].end) {
          speechSegments[speechSegments.length - 1].end = Math.max(e, speechSegments[speechSegments.length - 1].end);
        } else {
          speechSegments.push({
            start: Math.round(s * 1000) / 1000,
            end: Math.round(e * 1000) / 1000,
          });
        }
      }
    }
  }

  return speechSegments;
}

/**
 * 検出された発話区間群から、Praat完全互換の「隙間のない」全時間帯連続 IntervalEntry 配列を生成します。
 * 無音区間は label: ""、発話区間は台本テキストまたは [発話 1] などのラベルが付与されます。
 */
export function createContiguousIntervalsFromSpeechSegments(
  speechSegments: { start: number; end: number }[],
  totalDuration: number,
  scriptLabels: string[] = []
): IntervalEntry[] {
  const entries: IntervalEntry[] = [];
  let curTime = 0;
  let labelIdx = 0;

  for (let i = 0; i < speechSegments.length; i++) {
    const seg = speechSegments[i];
    const s = Math.max(curTime, Math.min(totalDuration, seg.start));
    const e = Math.max(s, Math.min(totalDuration, seg.end));

    if (s > curTime + 0.005) {
      // 無音区間
      entries.push({
        start: Math.round(curTime * 1000) / 1000,
        end: Math.round(s * 1000) / 1000,
        label: '',
      });
    }

    if (e > s + 0.005) {
      const label = scriptLabels[labelIdx] !== undefined 
        ? scriptLabels[labelIdx] 
        : `[発話 ${labelIdx + 1}]`;
      entries.push({
        start: Math.round(s * 1000) / 1000,
        end: Math.round(e * 1000) / 1000,
        label,
      });
      labelIdx++;
    }

    curTime = e;
  }

  // 末尾の無音区間
  if (curTime < totalDuration - 0.005) {
    entries.push({
      start: Math.round(curTime * 1000) / 1000,
      end: Math.round(totalDuration * 1000) / 1000,
      label: '',
    });
  }

  // 万一発話が検出されなかった場合、全体を1つの空区間にする
  if (entries.length === 0) {
    entries.push({
      start: 0,
      end: Math.round(totalDuration * 1000) / 1000,
      label: '',
    });
  }

  return entries;
}
