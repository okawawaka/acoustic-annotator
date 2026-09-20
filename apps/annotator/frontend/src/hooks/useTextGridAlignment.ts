'use client';

import { useState } from 'react';
import { AudioMetadata, TextGridData } from '@/types';
import { ASRModalRunParams } from '@/components/editor/ASRModal';
import { computeAcousticVAD, createContiguousIntervalsFromSpeechSegments } from '@/lib/vadUtils';

interface UseTextGridAlignmentProps {
  audioMetadata: AudioMetadata | null;
  audioBuffer: AudioBuffer | null;
  textGridData: TextGridData | null;
  setTextGridData: (data: TextGridData | null) => void;
  setActiveTierIdx: (idx: number) => void;
  pushHistory: (data: TextGridData | null) => void;
  setIsASRModalOpen: (open: boolean) => void;
  setIsCustomTextModalOpen: (open: boolean) => void;
}

export function useTextGridAlignment({
  audioMetadata,
  audioBuffer,
  textGridData,
  setTextGridData,
  setActiveTierIdx,
  pushHistory,
  setIsASRModalOpen,
  setIsCustomTextModalOpen,
}: UseTextGridAlignmentProps) {
  const [isASRLoading, setIsASRLoading] = useState(false);
  const [isCustomTextLoading, setIsCustomTextLoading] = useState(false);

  // VAD 自動無音検出による区間自動分割 (ASR / VAD Modal)
  const handleRunASR = async (params: ASRModalRunParams) => {
    if (!audioMetadata) return;
    setIsASRLoading(true);

    try {
      if (!audioBuffer) {
        throw new Error('音声信号データが読み込まれていません。音声を再度読み込んでください。');
      }

      const channelData = audioBuffer.getChannelData(0);
      const sr = audioBuffer.sampleRate;
      const speechSegments = computeAcousticVAD(channelData, sr, {
        minSilenceDuration: params.minSilenceDuration,
      });

      let scriptLabels: string[] = [];
      if (params.scriptText) {
        scriptLabels = params.scriptText
          .split(/[\r\n、。,\.]+|\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      }

      const contiguousIntervals = createContiguousIntervalsFromSpeechSegments(
        speechSegments,
        audioMetadata.duration,
        scriptLabels
      );

      const newTier = {
        name: params.tierName || 'Speech',
        tier_type: 'interval' as const,
        min_timestamp: 0,
        max_timestamp: audioMetadata.duration,
        entries: contiguousIntervals,
      };

      const existingTiers = textGridData ? [...textGridData.tiers] : [];
      const foundIdx = existingTiers.findIndex((t) => t.name === newTier.name);
      if (foundIdx !== -1) {
        existingTiers[foundIdx] = newTier;
        setActiveTierIdx(foundIdx);
      } else {
        existingTiers.push(newTier);
        setActiveTierIdx(existingTiers.length - 1);
      }

      pushHistory(textGridData);
      setTextGridData({
        min_timestamp: 0,
        max_timestamp: audioMetadata.duration,
        tiers: existingTiers,
      });

      setIsASRModalOpen(false);
    } catch (err: any) {
      alert(`自動区間分割エラー: ${err.message}`);
    } finally {
      setIsASRLoading(false);
    }
  };

  // 既存テキスト（台本）からの区間アライメント (CustomTextModal)
  const handleAlignCustomText = async (params: {
    text: string;
    tierName: string;
    splitBy: string;
    targetMode: 'existing' | 'new';
  }) => {
    if (!audioMetadata) return;
    setIsCustomTextLoading(true);

    try {
      const parseTextItems = (txt: string, split: string) => {
        if (split === 'char') {
          return Array.from(txt.replace(/\s+/g, ''));
        } else if (split === 'word') {
          return txt.trim().split(/[\s、。,\.]+/).filter((w) => w.length > 0);
        } else {
          return txt.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
        }
      };

      const items = parseTextItems(params.text, params.splitBy);
      if (items.length === 0) {
        alert('配置するテキスト項目が見つかりませんでした。');
        return;
      }

      const dur = audioMetadata.duration;
      let segments: { start: number; end: number; label: string }[] = [];

      if (audioBuffer) {
        const speechSegments = computeAcousticVAD(audioBuffer.getChannelData(0), audioBuffer.sampleRate, {
          minSilenceDuration: 0.2,
        });

        if (speechSegments.length >= items.length) {
          const step = speechSegments.length / items.length;
          segments = items.map((item, idx) => {
            const startSeg = speechSegments[Math.floor(idx * step)];
            const endSeg = speechSegments[Math.min(speechSegments.length - 1, Math.floor((idx + 1) * step) - 1)];
            return {
              start: startSeg.start,
              end: Math.max(startSeg.start + 0.05, endSeg.end),
              label: item,
            };
          });
        }
      }

      if (segments.length === 0) {
        const step = dur / items.length;
        segments = items.map((item, idx) => ({
          start: idx * step,
          end: (idx + 1) * step,
          label: item,
        }));
      }

      const resolvedIntervals = createContiguousIntervalsFromSpeechSegments(
        segments,
        dur,
        segments.map((s) => s.label)
      );

      const targetTierName = params.tierName || 'Script';
      const existingTiers = textGridData ? [...textGridData.tiers] : [];
      const foundIdx = existingTiers.findIndex((t) => t.name === targetTierName);

      const updatedTier = {
        name: targetTierName,
        tier_type: 'interval' as const,
        min_timestamp: 0,
        max_timestamp: dur,
        entries: resolvedIntervals,
      };

      if (foundIdx !== -1 && params.targetMode === 'existing') {
        existingTiers[foundIdx] = updatedTier;
        setActiveTierIdx(foundIdx);
      } else {
        existingTiers.push(updatedTier);
        setActiveTierIdx(existingTiers.length - 1);
      }

      pushHistory(textGridData);
      setTextGridData({
        min_timestamp: 0,
        max_timestamp: dur,
        tiers: existingTiers,
      });

      setIsCustomTextModalOpen(false);
    } catch (err: any) {
      alert(`台本配置エラー: ${err.message}`);
    } finally {
      setIsCustomTextLoading(false);
    }
  };

  return {
    isASRLoading,
    isCustomTextLoading,
    handleRunASR,
    handleAlignCustomText,
  };
}
