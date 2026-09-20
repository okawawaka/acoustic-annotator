'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { OverviewMinimap } from '@/components/editor/OverviewMinimap';
import { WaveformCanvas } from '@/components/editor/WaveformCanvas';
import { SpectrogramCanvas } from '@/components/editor/SpectrogramCanvas';
import { TextGridTimeline } from '@/components/editor/TextGridTimeline';
import { ControlToolbar } from '@/components/editor/ControlToolbar';
import { AcousticInspector } from '@/components/editor/AcousticInspector';
import { ASRModal, ASRModalRunParams } from '@/components/editor/ASRModal';
import { CustomTextModal } from '@/components/editor/CustomTextModal';
import { VowelSpaceModal } from '@/components/editor/VowelSpaceModal';
import { RecordModal } from '@/components/editor/RecordModal';
import {
  AudioMetadata,
  TextGridData,
  Tier,
  IntervalEntry,
  PointEntry,
  AcousticAnalysisData,
  IntervalMetrics,
} from '@/types';
import { extractPeaksFromAudioFile, audioBufferToWavBlob } from '@/lib/audioUtils';
import { parseTextGridClient, exportTextGridClient } from '@/lib/textgridUtils';
import { analyzeAudioClient, computeIntervalMetricsClient } from '@/lib/clientAudioAnalysis';
import { computeAcousticVAD, createContiguousIntervalsFromSpeechSegments } from '@/lib/vadUtils';
import { Upload, Music, FileText, FolderOpen, Mic } from 'lucide-react';

interface HistorySnapshot {
  textGridData: TextGridData;
  selection: { start: number; end: number } | null;
  selectedLabel: string | null;
  activeTierIdx: number;
}

export default function AnnotatorApp() {
  const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [textGridData, setTextGridData] = useState<TextGridData | null>(null);
  const [analysisData, setAnalysisData] = useState<AcousticAnalysisData | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<IntervalMetrics | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  // LPC Maximum Formant Frequency (女性: 5500Hz, 男性: 5000Hz)
  const [maxFormantFreq, setMaxFormantFreq] = useState<number>(5500);

  // 縦軸表示上限周波数 (F0単体観察時: 500Hz / フォルマント観察時: 5000Hz)
  const [maxDisplayFreq, setMaxDisplayFreq] = useState<number>(5000);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [viewRange, setViewRange] = useState({ start: 0, end: 10 });
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  // Overlays
  const [showPitch, setShowPitch] = useState(true);
  const [showFormants, setShowFormants] = useState(true);

  // Modals
  const [isASRModalOpen, setIsASRModalOpen] = useState(false);
  const [isASRLoading, setIsASRLoading] = useState(false);
  const [isCustomTextModalOpen, setIsCustomTextModalOpen] = useState(false);
  const [isCustomTextLoading, setIsCustomTextLoading] = useState(false);
  const [isVowelSpaceModalOpen, setIsVowelSpaceModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [activeTierIdx, setActiveTierIdx] = useState<number>(0);
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Undo / Redo History State
  const historyRef = useRef<HistorySnapshot[]>([]);
  const futureRef = useRef<HistorySnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isTypingSessionRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const pushHistory = useCallback(
    (currentTg: TextGridData | null) => {
      if (!currentTg) return;
      const snapshot: HistorySnapshot = {
        textGridData: JSON.parse(JSON.stringify(currentTg)),
        selection: selection ? { ...selection } : null,
        selectedLabel: selectedLabel ?? null,
        activeTierIdx,
      };

      const top = historyRef.current[historyRef.current.length - 1];
      if (top && JSON.stringify(top.textGridData.tiers) === JSON.stringify(snapshot.textGridData.tiers)) {
        return;
      }

      historyRef.current.push(snapshot);
      if (historyRef.current.length > 50) {
        historyRef.current.shift();
      }
      futureRef.current = [];
      updateUndoRedoState();
    },
    [selection, selectedLabel, activeTierIdx, updateUndoRedoState]
  );

  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0 || !textGridData) return;

    const currentSnapshot: HistorySnapshot = {
      textGridData: JSON.parse(JSON.stringify(textGridData)),
      selection: selection ? { ...selection } : null,
      selectedLabel: selectedLabel ?? null,
      activeTierIdx,
    };
    futureRef.current.unshift(currentSnapshot);

    const prevSnapshot = historyRef.current.pop()!;
    updateUndoRedoState();

    setTextGridData(prevSnapshot.textGridData);
    setSelection(prevSnapshot.selection);
    setSelectedLabel(prevSnapshot.selectedLabel);
    if (prevSnapshot.activeTierIdx !== undefined) {
      setActiveTierIdx(prevSnapshot.activeTierIdx);
    }
  }, [textGridData, selection, selectedLabel, activeTierIdx, updateUndoRedoState]);

  const handleRedo = useCallback(() => {
    if (futureRef.current.length === 0 || !textGridData) return;

    const currentSnapshot: HistorySnapshot = {
      textGridData: JSON.parse(JSON.stringify(textGridData)),
      selection: selection ? { ...selection } : null,
      selectedLabel: selectedLabel ?? null,
      activeTierIdx,
    };
    historyRef.current.push(currentSnapshot);

    const nextSnapshot = futureRef.current.shift()!;
    updateUndoRedoState();

    setTextGridData(nextSnapshot.textGridData);
    setSelection(nextSnapshot.selection);
    setSelectedLabel(nextSnapshot.selectedLabel);
    if (nextSnapshot.activeTierIdx !== undefined) {
      setActiveTierIdx(nextSnapshot.activeTierIdx);
    }
  }, [textGridData, selection, selectedLabel, activeTierIdx, updateUndoRedoState]);

  const handleUpdateTiers = useCallback(
    (updatedTiers: Tier[], saveHistory = true) => {
      if (!textGridData) return;
      if (saveHistory) {
        pushHistory(textGridData);
      }
      setTextGridData({ ...textGridData, tiers: updatedTiers });
    },
    [textGridData, pushHistory]
  );

  useEffect(() => {
    if (audioMetadata) {
      const initSpan = Math.min(10, audioMetadata.duration);
      setViewRange({ start: 0, end: initSpan });
    }
  }, [audioMetadata]);

  useEffect(() => {
    if (textGridData && textGridData.tiers.length > 0) {
      if (activeTierIdx >= textGridData.tiers.length) {
        setActiveTierIdx(0);
      }
    }
  }, [textGridData, activeTierIdx]);

  // TextGrid boundaries projection
  const projectedBoundaries = useMemo(() => {
    if (!textGridData) return [];
    const set = new Set<number>();
    for (const tier of textGridData.tiers) {
      if (tier.tier_type === 'interval') {
        for (const entry of tier.entries as IntervalEntry[]) {
          set.add(entry.start);
          set.add(entry.end);
        }
      } else {
        for (const pt of tier.entries as PointEntry[]) {
          set.add(pt.time);
        }
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [textGridData]);

  // 話者・上限周波数が変更された時の再解析ハンドラ (ブラウザ内即時計算)
  const handleChangeMaxFormantFreq = useCallback(async (newFreq: number) => {
    setMaxFormantFreq(newFreq);
    if (!audioBuffer) return;

    try {
      const analysis = await analyzeAudioClient(audioBuffer, newFreq);
      setAnalysisData(analysis);
    } catch (err) {
      console.warn('Client re-analysis failed:', err);
    }
  }, [audioBuffer]);

  // 「F0」ボタンクリック時：F0表示のON/OFF切り替え（縦軸スケールは変更しない）
  const handleTogglePitch = useCallback(() => {
    setShowPitch((prev) => !prev);
  }, []);

  // 「F1-3」ボタンクリック時：フォルマント表示のON/OFF切り替え（縦軸スケールは変更しない）
  const handleToggleFormants = useCallback(() => {
    setShowFormants((prev) => !prev);
  }, []);

  // 選択範囲または話者設定が変更された時に区間音響統計をブラウザ内で即座に計算
  useEffect(() => {
    if (!selection) {
      setSelectedMetrics(null);
      return;
    }
    const s = Math.min(selection.start, selection.end);
    const e = Math.max(selection.start, selection.end);
    if (e - s < 0.015) {
      setSelectedMetrics(null);
      return;
    }

    const channelData = audioBuffer ? audioBuffer.getChannelData(0) : undefined;
    const sr = audioBuffer ? audioBuffer.sampleRate : undefined;

    const metrics = computeIntervalMetricsClient(analysisData, s, e, channelData, sr);
    setSelectedMetrics(metrics);
  }, [selection, analysisData, audioBuffer]);

  // Audio time update event
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    if (isPlaying && time > viewRange.end) {
      const span = viewRange.end - viewRange.start;
      const totalDur = audioMetadata ? audioMetadata.duration : (textGridData ? textGridData.max_timestamp : time + span);
      let newStart = time;
      let newEnd = newStart + span;
      if (newEnd > totalDur) {
        newEnd = totalDur;
        newStart = Math.max(0, newEnd - span);
      }
      setViewRange({ start: newStart, end: newEnd });
    }

    if (isLooping && selection && selection.start !== selection.end) {
      const minSel = Math.min(selection.start, selection.end);
      const maxSel = Math.max(selection.start, selection.end);
      if (time >= maxSel) {
        audioRef.current.currentTime = minSel;
        audioRef.current.play();
      }
    }
  };

  const handleTogglePlay = useCallback(() => {
    if (!audioRef.current || !audioMetadata) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, audioMetadata]);

  const handlePlaySelection = useCallback(() => {
    if (!audioRef.current || !audioMetadata || !selection) return;
    const minSel = Math.min(selection.start, selection.end);
    const maxSel = Math.max(selection.start, selection.end);
    if (maxSel - minSel < 0.01) return;

    audioRef.current.currentTime = minSel;
    audioRef.current.play();
    setIsPlaying(true);

    const checkInterval = setInterval(() => {
      if (!audioRef.current) {
        clearInterval(checkInterval);
        return;
      }
      if (audioRef.current.currentTime >= maxSel) {
        audioRef.current.pause();
        setIsPlaying(false);
        clearInterval(checkInterval);
      }
    }, 20);
  }, [audioMetadata, selection]);

  const handleSeek = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleInsertBoundaryAt = useCallback((time?: number) => {
    if (!textGridData || textGridData.tiers.length === 0) return;
    const targetIdx = Math.max(0, Math.min(activeTierIdx, textGridData.tiers.length - 1));
    const targetTime = time !== undefined ? time : currentTime;

    let newSelectedRange: { start: number; end: number } | null = null;
    let modified = false;

    const newTiers = textGridData.tiers.map((tier, idx) => {
      if (idx === targetIdx && tier.tier_type === 'interval') {
        const cur = targetTime;
        const entries = [...tier.entries];
        const entryIdx = entries.findIndex(
          (e) => 'start' in e && e.start <= cur && e.end >= cur
        );
        if (entryIdx !== -1) {
          const original = entries[entryIdx] as IntervalEntry;
          if (cur - original.start > 0.01 && original.end - cur > 0.01) {
            const firstPart: IntervalEntry = { start: original.start, end: cur, label: original.label };
            const secondPart: IntervalEntry = { start: cur, end: original.end, label: '' };
            entries.splice(entryIdx, 1, firstPart, secondPart);
            newSelectedRange = { start: cur, end: original.end };
            modified = true;
          }
        }
        return { ...tier, entries };
      }
      return tier;
    });

    if (!modified) return;

    pushHistory(textGridData);
    setTextGridData({ ...textGridData, tiers: newTiers });
    if (newSelectedRange) {
      setSelection(newSelectedRange);
      setSelectedLabel('');
    }
  }, [textGridData, currentTime, activeTierIdx, pushHistory]);

  const handleInsertBoundary = useCallback(() => {
    handleInsertBoundaryAt();
  }, [handleInsertBoundaryAt]);

  const handleUpdateSelectedLabel = useCallback((newLabel: string) => {
    setSelectedLabel(newLabel);
    if (!textGridData || !selection) return;

    if (!isTypingSessionRef.current) {
      pushHistory(textGridData);
      isTypingSessionRef.current = true;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingSessionRef.current = false;
    }, 800);

    const targetIdx = Math.max(0, Math.min(activeTierIdx, textGridData.tiers.length - 1));
    const newTiers = textGridData.tiers.map((tier, idx) => {
      if (idx === targetIdx && tier.tier_type === 'interval') {
        const entries = (tier.entries as IntervalEntry[]).map((entry) => {
          const match = Math.abs(entry.start - selection.start) < 0.005 && Math.abs(entry.end - selection.end) < 0.005;
          if (match) {
            return { ...entry, label: newLabel };
          }
          return entry;
        });
        return { ...tier, entries };
      }
      return tier;
    });
    setTextGridData({ ...textGridData, tiers: newTiers });
  }, [textGridData, selection, activeTierIdx, pushHistory]);

  const handleSelectPrevInterval = useCallback(() => {
    if (!textGridData || textGridData.tiers.length === 0) return;
    const targetIdx = Math.max(0, Math.min(activeTierIdx, textGridData.tiers.length - 1));
    const tier = textGridData.tiers[targetIdx];
    if (tier.tier_type !== 'interval' || tier.entries.length === 0) return;
    const entries = tier.entries as IntervalEntry[];

    let curIdx = -1;
    if (selection) {
      curIdx = entries.findIndex(
        e => Math.abs(e.start - selection.start) < 0.005 && Math.abs(e.end - selection.end) < 0.005
      );
    }
    if (curIdx === -1) {
      curIdx = entries.findIndex(e => e.start <= currentTime && e.end >= currentTime);
    }

    const prevIdx = curIdx > 0 ? curIdx - 1 : entries.length - 1;
    const prev = entries[prevIdx];
    setSelection({ start: prev.start, end: prev.end });
    setSelectedLabel(prev.label || '');
    handleSeek(prev.start);
  }, [textGridData, activeTierIdx, selection, currentTime]);

  const handleSelectNextInterval = useCallback(() => {
    if (!textGridData || textGridData.tiers.length === 0) return;
    const targetIdx = Math.max(0, Math.min(activeTierIdx, textGridData.tiers.length - 1));
    const tier = textGridData.tiers[targetIdx];
    if (tier.tier_type !== 'interval' || tier.entries.length === 0) return;
    const entries = tier.entries as IntervalEntry[];

    let curIdx = -1;
    if (selection) {
      curIdx = entries.findIndex(
        e => Math.abs(e.start - selection.start) < 0.005 && Math.abs(e.end - selection.end) < 0.005
      );
    }
    if (curIdx === -1) {
      curIdx = entries.findIndex(e => e.start <= currentTime && e.end >= currentTime);
    }

    const nextIdx = curIdx >= 0 && curIdx < entries.length - 1 ? curIdx + 1 : 0;
    const next = entries[nextIdx];
    setSelection({ start: next.start, end: next.end });
    setSelectedLabel(next.label || '');
    handleSeek(next.start);
  }, [textGridData, activeTierIdx, selection, currentTime]);

  const handleDeleteBoundary = useCallback(() => {
    if (!textGridData || textGridData.tiers.length === 0 || !selection) return;
    const targetIdx = Math.max(0, Math.min(activeTierIdx, textGridData.tiers.length - 1));
    const tier = textGridData.tiers[targetIdx];
    if (tier.tier_type !== 'interval' || tier.entries.length <= 1) return;
    const entries = [...(tier.entries as IntervalEntry[])];

    const curIdx = entries.findIndex(
      e => Math.abs(e.start - selection.start) < 0.005 && Math.abs(e.end - selection.end) < 0.005
    );

    if (curIdx > 0) {
      pushHistory(textGridData);
      const prev = entries[curIdx - 1];
      const cur = entries[curIdx];
      const merged: IntervalEntry = {
        start: prev.start,
        end: cur.end,
        label: prev.label || cur.label,
      };
      entries.splice(curIdx - 1, 2, merged);

      const newTiers = textGridData.tiers.map((t, idx) => (idx === targetIdx ? { ...t, entries } : t));
      setTextGridData({ ...textGridData, tiers: newTiers });
      setSelection({ start: merged.start, end: merged.end });
      setSelectedLabel(merged.label || '');
    } else if (curIdx === 0 && entries.length > 1) {
      pushHistory(textGridData);
      const cur = entries[0];
      const next = entries[1];
      const merged: IntervalEntry = {
        start: cur.start,
        end: next.end,
        label: cur.label || next.label,
      };
      entries.splice(0, 2, merged);

      const newTiers = textGridData.tiers.map((t, idx) => (idx === targetIdx ? { ...t, entries } : t));
      setTextGridData({ ...textGridData, tiers: newTiers });
      setSelection({ start: merged.start, end: merged.end });
      setSelectedLabel(merged.label || '');
    }
  }, [textGridData, activeTierIdx, selection, pushHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (isCtrlOrMeta && (e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z')) {
        const activeEl = document.activeElement as HTMLElement | null;
        const isInputActive = activeEl && ['INPUT', 'TEXTAREA'].includes(activeEl.tagName);
        if (!isInputActive) {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          return;
        }
      } else if (isCtrlOrMeta && (e.code === 'KeyY' || e.key === 'y' || e.key === 'Y')) {
        const activeEl = document.activeElement as HTMLElement | null;
        const isInputActive = activeEl && ['INPUT', 'TEXTAREA'].includes(activeEl.tagName);
        if (!isInputActive) {
          e.preventDefault();
          handleRedo();
          return;
        }
      }

      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          handleSelectPrevInterval();
        } else {
          handlePlaySelection();
        }
      } else if (e.code === 'Enter') {
        e.preventDefault();
        handleInsertBoundaryAt();
      } else if (e.altKey && e.code === 'ArrowRight') {
        e.preventDefault();
        handleSelectNextInterval();
      } else if (e.altKey && e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSelectPrevInterval();
      } else if (e.altKey && (e.code === 'Backspace' || e.code === 'Delete')) {
        e.preventDefault();
        handleDeleteBoundary();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleTogglePlay,
    handlePlaySelection,
    handleInsertBoundaryAt,
    handleSelectNextInterval,
    handleSelectPrevInterval,
    handleDeleteBoundary,
    handleUndo,
    handleRedo,
  ]);

  const handleWheel = (e: React.WheelEvent) => {
    if (!audioMetadata) return;
    const dur = audioMetadata.duration;
    const span = viewRange.end - viewRange.start;

    let delta = e.deltaX !== 0 ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (delta !== 0) {
      e.preventDefault();
      const deltaTime = (delta / 800) * span;
      let newStart = Math.max(0, Math.min(dur - span, viewRange.start + deltaTime));
      let newEnd = newStart + span;
      setViewRange({ start: newStart, end: newEnd });
    }
  };

  const handleZoomIn = () => {
    const span = viewRange.end - viewRange.start;
    const newSpan = Math.max(0.1, span * 0.7);
    const mid = currentTime >= viewRange.start && currentTime <= viewRange.end ? currentTime : (viewRange.start + viewRange.end) / 2;
    const dur = audioMetadata ? audioMetadata.duration : 10;
    const s = Math.max(0, mid - newSpan / 2);
    const e = Math.min(dur, s + newSpan);
    setViewRange({ start: s, end: e });
  };

  const handleZoomOut = () => {
    const span = viewRange.end - viewRange.start;
    const dur = audioMetadata ? audioMetadata.duration : 10;
    const newSpan = Math.min(dur, span * 1.4);
    const mid = (viewRange.start + viewRange.end) / 2;
    const s = Math.max(0, mid - newSpan / 2);
    const e = Math.min(dur, s + newSpan);
    setViewRange({ start: s, end: e });
  };

  const handleResetZoom = () => {
    if (!audioMetadata) return;
    setViewRange({ start: 0, end: audioMetadata.duration });
  };

  // TextGrid の読み込み（完全ブラウザ内処理: UTF-16LE/BE, UTF-8, Shift-JIS自動判定）
  const parseTextGridFromFile = async (file: File): Promise<TextGridData> => {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let text = '';

    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
      text = new TextDecoder('utf-16le').decode(buf);
    } else if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
      text = new TextDecoder('utf-16be').decode(buf);
    } else if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      text = new TextDecoder('utf-8').decode(buf);
    } else {
      // Windows Praat で作成された BOM無しの UTF-16LE 検出（奇数バイトに \0 が多い場合）
      let nullCount = 0;
      for (let i = 1; i < Math.min(bytes.length, 100); i += 2) {
        if (bytes[i] === 0) nullCount++;
      }
      if (nullCount > 20) {
        text = new TextDecoder('utf-16le').decode(buf);
      } else {
        try {
          text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
        } catch {
          try {
            text = new TextDecoder('shift-jis').decode(buf);
          } catch {
            text = new TextDecoder('utf-8').decode(buf);
          }
        }
      }
    }

    return parseTextGridClient(text);
  };

  // 音声およびTextGridの一括／個別読み込みハンドラー
  const handleBatchFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const audioFile = files.find((f) => {
      const lower = f.name.toLowerCase();
      return f.type.startsWith('audio/') || !!lower.match(/\.(wav|mp3|ogg|flac|m4a|aac)$/);
    });

    const textGridFile = files.find((f) => f.name.toLowerCase().endsWith('.textgrid'));

    if (!audioFile && !textGridFile) {
      alert('対応する音声ファイル（.wav, .mp3 等）または TextGrid ファイル（.TextGrid）を選択してください。');
      return;
    }

    let loadedDuration = audioMetadata?.duration || 0;

    // 1. 音声ファイルが指定されている場合は先に読み込み・解析
    if (audioFile) {
      try {
        const objectUrl = URL.createObjectURL(audioFile);
        setLocalAudioUrl(objectUrl);

        // Web Audio API で AudioBuffer をデコード
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        setAudioBuffer(decodedBuffer);

        loadedDuration = decodedBuffer.duration;
        const { peaks, sampleRate } = await extractPeaksFromAudioFile(audioFile);

        const localMeta: AudioMetadata = {
          audio_id: 'local_' + Date.now(),
          filename: audioFile.name,
          duration: loadedDuration,
          sample_rate: sampleRate,
          channels: 1,
          peaks: peaks,
        };
        setAudioMetadata(localMeta);
        setViewRange({ start: 0, end: Math.min(10, loadedDuration) });

        // ブラウザ内音響解析エンジンで F0, Formants, Spectrogram を即時生成
        const analysis = await analyzeAudioClient(decodedBuffer, maxFormantFreq);
        setAnalysisData(analysis);
      } catch (err: any) {
        alert(`音声の読み込みに失敗しました: ${err.message}`);
        return;
      }
    }

    // 2. TextGridファイルが指定されている場合は読み込んで適用
    if (textGridFile) {
      try {
        const tg = await parseTextGridFromFile(textGridFile);
        historyRef.current = [];
        futureRef.current = [];
        updateUndoRedoState();
        setTextGridData(tg);
        setActiveTierIdx(0);

        // 音声がまだ開かれていない場合、ダミーメタデータを生成してTextGridエディタを表示
        if (!audioFile && !audioMetadata) {
          const dur = tg.max_timestamp > 0 ? tg.max_timestamp : 5.0;
          const dummyMeta: AudioMetadata = {
            audio_id: 'tg_only_' + Date.now(),
            filename: textGridFile.name.replace(/\.[^/.]+$/, ''),
            duration: dur,
            sample_rate: 44100,
            channels: 1,
            peaks: new Array(1000).fill(0),
          };
          setAudioMetadata(dummyMeta);
          setViewRange({ start: 0, end: Math.min(10, dur) });
        }
      } catch (err: any) {
        alert(`TextGrid解析エラー: ${err.message}`);
      }
    } else if (audioFile) {
      // 音声のみ読み込まれ、TextGridがまだ無い（または空のデフォルトのみ）場合は初期Wordティアを作成
      if (!textGridData || textGridData.tiers.length === 0 || (textGridData.tiers.length === 1 && textGridData.tiers[0].entries.length <= 1 && !textGridData.tiers[0].entries[0]?.label)) {
        historyRef.current = [];
        futureRef.current = [];
        updateUndoRedoState();
        setTextGridData({
          min_timestamp: 0,
          max_timestamp: loadedDuration,
          tiers: [
            {
              name: 'Word',
              tier_type: 'interval',
              min_timestamp: 0,
              max_timestamp: loadedDuration,
              entries: [{ start: 0, end: loadedDuration, label: '' }],
            },
          ],
        });
        setActiveTierIdx(0);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleBatchFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handleBatchFiles(files);
    e.target.value = '';
  };

  const handleRecordComplete = async (file: File) => {
    setIsRecordModalOpen(false);
    await handleBatchFiles([file]);
  };

  // TextGrid のエクスポート（完全ブラウザ内 Blob ダウンロード）
  const handleExportTextGrid = () => {
    if (!textGridData) return;
    try {
      const tgString = exportTextGridClient(textGridData);
      const blob = new Blob([tgString], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const filename = audioMetadata ? `${audioMetadata.filename.replace(/\.[^/.]+$/, '')}.TextGrid` : 'annotation.TextGrid';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`保存エラー: ${err.message}`);
    }
  };

  // 音響VAD自動区間分割 (完全ブラウザ内処理: APIキー・マイク・外部通信不要)
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

      // 台本テキストがあれば単語や句単位に分解して各区間に配置
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

  // 台本テキストからの区間配置 (完全ブラウザ内処理)
  const handleAlignCustomText = async (params: { text: string; tierName: string; splitBy: string; targetMode: 'existing' | 'new' }) => {
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
        alert('有効なテキストがありません。');
        setIsCustomTextLoading(false);
        return;
      }

      const intervalLen = audioMetadata.duration / items.length;
      const entries: IntervalEntry[] = items.map((item, i) => ({
        start: Math.round(i * intervalLen * 1000) / 1000,
        end: Math.round((i + 1) * intervalLen * 1000) / 1000,
        label: item,
      }));

      const newTier = {
        name: params.tierName,
        tier_type: 'interval' as const,
        min_timestamp: 0,
        max_timestamp: audioMetadata.duration,
        entries,
      };

      const existingTiers = textGridData ? [...textGridData.tiers] : [];
      if (params.targetMode === 'existing') {
        const foundIdx = existingTiers.findIndex((t) => t.name === params.tierName);
        if (foundIdx !== -1) {
          existingTiers[foundIdx] = newTier;
          setActiveTierIdx(foundIdx);
        } else {
          existingTiers.push(newTier);
          setActiveTierIdx(existingTiers.length - 1);
        }
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

      setIsCustomTextModalOpen(false);
    } catch (err: any) {
      alert(`台本区間の作成エラー: ${err.message}`);
    } finally {
      setIsCustomTextLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden bg-white text-gray-900 font-sans"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(false);
      }}
      onDrop={handleDrop}
    >
      {localAudioUrl && (
        <audio
          ref={audioRef}
          src={localAudioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a,.aac,.TextGrid,.textgrid"
        className="hidden"
        onChange={handleFileInput}
      />

      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-[#111111]/70 backdrop-blur-none flex items-center justify-center pointer-events-none">
          <div className="bg-white px-8 py-6 border-2 border-[#111111] text-xs font-bold uppercase tracking-widest text-[#111111]">
            Drop Audio & TextGrid Files Here
          </div>
        </div>
      )}

      {/* Swiss Style Masthead / Header */}
      <header className="h-11 flex-shrink-0 flex items-center justify-between px-4 border-b-2 border-[#111111] bg-white">
        <div className="flex items-center space-x-3">
          <span className="font-extrabold text-xs uppercase tracking-tight text-[#111111]">
            Acoustic Annotator
          </span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-[#777780] font-semibold border-l border-[#e0e0e6] pl-3">
            Phonetic Acoustics & Praat TextGrid
          </span>
          <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 bg-[#111111] text-white tracking-wider" title="サーバー通信不要・ブラウザ内完結動作中">
            Standalone
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="flex items-center px-3 py-1 border border-[#E30613] text-[#E30613] hover:bg-[#E30613] hover:text-white font-bold text-xs uppercase tracking-wider transition-colors duration-150"
            title="マイクから直接録音して分析を開始します"
          >
            <Mic className="w-3.5 h-3.5 mr-1.5" />
            マイク録音
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center px-3 py-1 border border-[#111111] bg-[#111111] text-white hover:bg-white hover:text-[#111111] font-bold text-xs uppercase tracking-wider transition-colors duration-150"
            title="音声ファイル（.wav 等）や TextGrid を開きます（同時に複数選択可能）"
          >
            <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
            ファイルを開く
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden bg-[#f9f9fb]">
        {audioMetadata ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-white" onWheel={handleWheel}>
            {/* Minimap */}
            <div className="flex-shrink-0 border-b border-[#e0e0e6]">
              <OverviewMinimap
                peaks={audioMetadata.peaks}
                duration={audioMetadata.duration}
                currentTime={currentTime}
                viewRange={viewRange}
                onRangeChange={setViewRange}
                onSeek={handleSeek}
                height={28}
              />
            </div>

            {/* Toolbar */}
            <div className="flex-shrink-0">
              <ControlToolbar
                isPlaying={isPlaying}
                playbackRate={playbackRate}
                isLooping={isLooping}
                currentTime={currentTime}
                duration={audioMetadata.duration}
                selection={selection}
                hasAudio={true}
                showPitch={showPitch}
                showFormants={showFormants}
                maxDisplayFreq={maxDisplayFreq}
                maxFormantFreq={maxFormantFreq}
                onTogglePlay={handleTogglePlay}
                onPlaySelection={handlePlaySelection}
                onToggleLoop={() => setIsLooping(!isLooping)}
                onChangePlaybackRate={(rate) => {
                  setPlaybackRate(rate);
                  if (audioRef.current) audioRef.current.playbackRate = rate;
                }}
                onChangeMaxFormantFreq={handleChangeMaxFormantFreq}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onResetZoom={handleResetZoom}
                onInsertBoundary={handleInsertBoundary}
                onOpenASRModal={() => setIsASRModalOpen(true)}
                onOpenCustomTextModal={() => setIsCustomTextModalOpen(true)}
                onOpenVowelSpaceModal={() => setIsVowelSpaceModalOpen(true)}
                onTogglePitch={handleTogglePitch}
                onToggleFormants={handleToggleFormants}
                onChangeDisplayFreq={setMaxDisplayFreq}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onExportTextGrid={handleExportTextGrid}
              />
            </div>

            {/* Middle Split: Timelines & Visualizers */}
            <div className="flex-1 flex overflow-hidden border-t border-[#e0e0e6]">
              <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
                {/* Waveform */}
                <div className="flex-shrink-0 bg-white border-b border-[#e0e0e6]">
                  <WaveformCanvas
                    peaks={audioMetadata.peaks}
                    duration={audioMetadata.duration}
                    currentTime={currentTime}
                    selection={selection}
                    viewRange={viewRange}
                    boundaries={projectedBoundaries}
                    hoverTime={hoverTime}
                    onHoverTimeChange={setHoverTime}
                    onSeek={handleSeek}
                    onSelectRange={(r) => {
                      setSelection(r);
                      setSelectedLabel(null);
                    }}
                    height={110}
                  />
                </div>

                {/* Spectrogram / Pitch Canvas (Dynamic Scale: 0-500Hz or 0-5000Hz) */}
                <div className="flex-shrink-0 bg-white border-b border-[#e0e0e6]">
                  <SpectrogramCanvas
                    analysisData={analysisData}
                    duration={audioMetadata.duration}
                    currentTime={currentTime}
                    selection={selection}
                    viewRange={viewRange}
                    boundaries={projectedBoundaries}
                    hoverTime={hoverTime}
                    showPitch={showPitch}
                    showFormants={showFormants}
                    maxDisplayFreq={maxDisplayFreq}
                    onHoverTimeChange={setHoverTime}
                    onSeek={handleSeek}
                    onSelectRange={(r) => {
                      setSelection(r);
                      setSelectedLabel(null);
                    }}
                    height={140}
                  />
                </div>

                {/* TextGrid Timeline */}
                <div className="flex-1 min-h-[160px] bg-white">
                  {textGridData && (
                    <TextGridTimeline
                      tiers={textGridData.tiers}
                      duration={audioMetadata.duration}
                      currentTime={currentTime}
                      viewRange={viewRange}
                      selection={selection}
                      selectedLabel={selectedLabel}
                      hoverTime={hoverTime}
                      activeTierIdx={activeTierIdx}
                      onSelectTier={setActiveTierIdx}
                      onHoverTimeChange={setHoverTime}
                      onUpdateTiers={handleUpdateTiers}
                      onSelectInterval={(s, e, label) => {
                        setSelection({ start: s, end: e });
                        setSelectedLabel(label || null);
                      }}
                      onSeek={handleSeek}
                      onUpdateSelectedLabel={handleUpdateSelectedLabel}
                      onInsertBoundaryAt={handleInsertBoundaryAt}
                      onDeleteBoundary={handleDeleteBoundary}
                      onSelectPrevInterval={handleSelectPrevInterval}
                      onSelectNextInterval={handleSelectNextInterval}
                      onPlaySelection={handlePlaySelection}
                      canUndo={canUndo}
                      canRedo={canRedo}
                      onUndo={handleUndo}
                      onRedo={handleRedo}
                      onBoundaryDragStart={() => pushHistory(textGridData)}
                    />
                  )}
                </div>
              </div>

              {/* Right Side: Acoustic Inspector Panel */}
              <AcousticInspector
                metrics={selectedMetrics}
                selectedLabel={selectedLabel}
                selectedRange={selection}
                isLoading={false}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#f9f9fb]">
            <div className="text-center mb-8">
              <div className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#777780] mb-2 border-b-2 border-[#111111] pb-1">
                Acoustic Analysis & Annotation Workspace
              </div>
              <h2 className="text-xl font-extrabold uppercase tracking-tight text-[#111111]">
                音声分析・アノテーションの開始
              </h2>
              <p className="text-xs text-[#777780] mt-1 font-mono">
                SELECT A LOCAL FILE OR RECORD DIRECTLY IN THE BROWSER
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl w-full">
              {/* Option 1: File Open */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 border-2 border-[#111111] bg-white hover:bg-[#111111] hover:text-white cursor-pointer transition-colors duration-150 flex flex-col group text-left relative"
              >
                <div className="w-12 h-12 border border-[#111111] group-hover:border-white bg-[#f0f0f4] group-hover:bg-white text-[#111111] flex items-center justify-center mb-5 transition-colors">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div className="text-xs font-mono uppercase tracking-widest text-[#777780] group-hover:text-white/60 mb-1">
                  Option 01 / Batch Load
                </div>
                <div className="text-base font-bold uppercase tracking-wider mb-2">
                  ファイルを開く
                </div>
                <div className="text-xs text-[#52525b] group-hover:text-white/80 leading-relaxed font-mono">
                  WAV / MP3 等の音声ファイルと TextGrid を同時に選択可能。ドラッグ＆ドロップにも対応しています。
                </div>
              </div>

              {/* Option 2: Mic Recording */}
              <div
                onClick={() => setIsRecordModalOpen(true)}
                className="p-8 border-2 border-[#E30613] bg-white hover:bg-[#E30613] hover:text-white cursor-pointer transition-colors duration-150 flex flex-col group text-left relative"
              >
                <div className="w-12 h-12 border border-[#E30613] group-hover:border-white bg-[#E30613]/10 group-hover:bg-white text-[#E30613] flex items-center justify-center mb-5 transition-colors">
                  <Mic className="w-6 h-6" />
                </div>
                <div className="text-xs font-mono uppercase tracking-widest text-[#E30613] group-hover:text-white/60 mb-1">
                  Option 02 / Direct Input
                </div>
                <div className="text-base font-bold uppercase tracking-wider mb-2 text-[#E30613] group-hover:text-white">
                  マイクで録音する
                </div>
                <div className="text-xs text-[#52525b] group-hover:text-white/80 leading-relaxed font-mono">
                  ブラウザ内マイクから高品質PCM録音。波形・ピッチ・フォルマントをその場で即座に分析します。
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <ASRModal
        isOpen={isASRModalOpen}
        onClose={() => setIsASRModalOpen(false)}
        onRunASR={handleRunASR}
        isLoading={isASRLoading}
        duration={audioMetadata ? audioMetadata.duration : 0}
      />

      <CustomTextModal
        isOpen={isCustomTextModalOpen}
        onClose={() => setIsCustomTextModalOpen(false)}
        onAlignText={handleAlignCustomText}
        isLoading={isCustomTextLoading}
        existingTierNames={textGridData ? textGridData.tiers.map((t) => t.name) : ['Word']}
      />

      <VowelSpaceModal
        isOpen={isVowelSpaceModalOpen}
        onClose={() => setIsVowelSpaceModalOpen(false)}
        textGridData={textGridData}
        analysisData={analysisData}
        initialMaxFormantFreq={maxFormantFreq}
        onSelectInterval={(s, e) => {
          setSelection({ start: s, end: e });
          handleSeek(s);
        }}
        onChangeMaxFormantFreq={handleChangeMaxFormantFreq}
      />

      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onRecordComplete={handleRecordComplete}
      />
    </div>
  );
}
