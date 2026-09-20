'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { SpectralSliceModal } from '@/components/editor/SpectralSliceModal';
import { AnalysisSettingsModal } from '@/components/editor/AnalysisSettingsModal';

import {
  AudioMetadata,
  TextGridData,
  Tier,
  IntervalEntry,
  PointEntry,
  AcousticAnalysisData,
  IntervalMetrics,
  AnalysisSettings,
} from '@/types';

import { analyzeAudioClient, computeIntervalMetricsClient } from '@/lib/clientAudioAnalysis';
import { computeAcousticVAD, createContiguousIntervalsFromSpeechSegments } from '@/lib/vadUtils';

import { useTextGridHistory } from '@/hooks/useTextGridHistory';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useViewportZoom } from '@/hooks/useViewportZoom';
import { useFileLoader } from '@/hooks/useFileLoader';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

import { FolderOpen, Mic } from 'lucide-react';

export default function AnnotatorApp() {
  // Core Domain State
  const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [textGridData, setTextGridData] = useState<TextGridData | null>(null);
  const [analysisData, setAnalysisData] = useState<AcousticAnalysisData | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<IntervalMetrics | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [activeTierIdx, setActiveTierIdx] = useState<number>(0);

  // Analysis Configuration State
  const [maxFormantFreq, setMaxFormantFreq] = useState<number>(5500);
  const [maxDisplayFreq, setMaxDisplayFreq] = useState<number>(5000);
  const [showPitch, setShowPitch] = useState(true);
  const [showFormants, setShowFormants] = useState(true);
  const [showIntensity, setShowIntensity] = useState(true);
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>({
    spectrogramType: 'wideband',
    minPitch: 75,
    maxPitch: 600,
    maxFormantFreq: 5500,
    dynamicRange: 50,
  });

  // Modals Visibility State
  const [isASRModalOpen, setIsASRModalOpen] = useState(false);
  const [isASRLoading, setIsASRLoading] = useState(false);
  const [isCustomTextModalOpen, setIsCustomTextModalOpen] = useState(false);
  const [isCustomTextLoading, setIsCustomTextLoading] = useState(false);
  const [isVowelSpaceModalOpen, setIsVowelSpaceModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSpectralSliceOpen, setIsSpectralSliceOpen] = useState(false);
  const [spectralSliceTargetTime, setSpectralSliceTargetTime] = useState(0);
  const [isAnalysisSettingsOpen, setIsAnalysisSettingsOpen] = useState(false);

  // Custom Hook: Undo / Redo History
  const {
    canUndo,
    canRedo,
    pushHistory,
    clearHistory,
    handleUndo,
    handleRedo,
    recordTypingSession,
    handleUpdateTiers,
  } = useTextGridHistory({
    textGridData,
    setTextGridData,
    selection,
    setSelection,
    selectedLabel,
    setSelectedLabel,
    activeTierIdx,
    setActiveTierIdx,
  });

  // Custom Hook: Viewport Zoom & Panning
  const {
    viewRange,
    setViewRange,
    hoverTime,
    setHoverTime,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleWheel,
  } = useViewportZoom({
    audioMetadata,
    currentTime: 0,
  });

  // Custom Hook: Audio Player & Playhead
  const {
    currentTime,
    isPlaying,
    playbackRate,
    isLooping,
    setIsLooping,
    audioRef,
    handleTimeUpdate,
    handleTogglePlay,
    handlePlaySelection,
    handleSeek,
    handleChangePlaybackRate,
  } = useAudioPlayer({
    audioMetadata,
    viewRange,
    setViewRange,
    selection,
  });

  // Custom Hook: File Loader & Encodings
  const {
    isDraggingFile,
    localAudioUrl,
    fileInputRef,
    handleBatchFiles,
    handleDrop,
    handleFileInput,
    handleExportTextGrid,
  } = useFileLoader({
    audioMetadata,
    setAudioMetadata,
    setAudioBuffer,
    textGridData,
    setTextGridData,
    setActiveTierIdx,
    maxFormantFreq,
    setAnalysisData,
    clearHistory,
  });

  // Keep active tier in valid bounds
  useEffect(() => {
    if (textGridData && textGridData.tiers.length > 0) {
      if (activeTierIdx >= textGridData.tiers.length) {
        setActiveTierIdx(0);
      }
    }
  }, [textGridData, activeTierIdx]);

  // Projected boundary times across all tiers
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

  // Re-analyze client-side when speaker max formant freq changes
  const handleChangeMaxFormantFreq = useCallback(async (newFreq: number) => {
    setMaxFormantFreq(newFreq);
    setAnalysisSettings((prev) => ({ ...prev, maxFormantFreq: newFreq }));
    if (!audioBuffer) return;
    try {
      const analysis = await analyzeAudioClient(audioBuffer, {
        ...analysisSettings,
        maxFormantFreq: newFreq,
      });
      setAnalysisData(analysis);
    } catch (err) {
      console.warn('Client re-analysis failed:', err);
    }
  }, [audioBuffer, analysisSettings]);

  // Apply new Praat analysis settings and re-run client analysis
  const handleApplyAnalysisSettings = useCallback(async (newSettings: AnalysisSettings) => {
    setAnalysisSettings(newSettings);
    setMaxFormantFreq(newSettings.maxFormantFreq);
    if (!audioBuffer) return;
    try {
      const analysis = await analyzeAudioClient(audioBuffer, newSettings);
      setAnalysisData(analysis);
    } catch (err) {
      console.warn('Client re-analysis with settings failed:', err);
    }
  }, [audioBuffer]);

  // Open Spectral Slice Modal
  const handleOpenSpectralSlice = useCallback((target?: number) => {
    if (target !== undefined) {
      setSpectralSliceTargetTime(target);
    } else if (selection && selection.start !== selection.end) {
      setSpectralSliceTargetTime((selection.start + selection.end) / 2);
    } else {
      setSpectralSliceTargetTime(currentTime);
    }
    setIsSpectralSliceOpen(true);
  }, [selection, currentTime]);

  // Compute selected interval acoustic metrics on the fly
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

  // Boundary Operations
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
  }, [textGridData, currentTime, activeTierIdx, pushHistory, setTextGridData]);

  const handleUpdateSelectedLabel = useCallback((newLabel: string) => {
    setSelectedLabel(newLabel);
    if (!textGridData || !selection) return;

    recordTypingSession();

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
  }, [textGridData, selection, activeTierIdx, recordTypingSession, setTextGridData]);

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
  }, [textGridData, activeTierIdx, selection, currentTime, handleSeek]);

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
  }, [textGridData, activeTierIdx, selection, currentTime, handleSeek]);

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
  }, [textGridData, activeTierIdx, selection, pushHistory, setTextGridData]);

  // Keyboard Shortcuts Registration
  useKeyboardShortcuts({
    onTogglePlay: handleTogglePlay,
    onPlaySelection: handlePlaySelection,
    onInsertBoundaryAt: () => handleInsertBoundaryAt(),
    onSelectNextInterval: handleSelectNextInterval,
    onSelectPrevInterval: handleSelectPrevInterval,
    onDeleteBoundary: handleDeleteBoundary,
    onUndo: handleUndo,
    onRedo: handleRedo,
  });

  // Modal Action Handlers
  const handleRecordComplete = async (file: File) => {
    setIsRecordModalOpen(false);
    await handleBatchFiles([file]);
  };

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

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden bg-white text-[#111111] font-sans"
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInputRef.current && (e.dataTransfer.dropEffect = 'copy');
      }}
      onDrop={handleDrop}
    >
      {localAudioUrl && (
        <audio
          ref={audioRef}
          src={localAudioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => handleTogglePlay()}
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
                showIntensity={showIntensity}
                maxDisplayFreq={maxDisplayFreq}
                maxFormantFreq={maxFormantFreq}
                onTogglePlay={handleTogglePlay}
                onPlaySelection={handlePlaySelection}
                onToggleLoop={() => setIsLooping(!isLooping)}
                onChangePlaybackRate={handleChangePlaybackRate}
                onChangeMaxFormantFreq={handleChangeMaxFormantFreq}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onResetZoom={handleResetZoom}
                onInsertBoundary={() => handleInsertBoundaryAt()}
                onOpenASRModal={() => setIsASRModalOpen(true)}
                onOpenCustomTextModal={() => setIsCustomTextModalOpen(true)}
                onOpenVowelSpaceModal={() => setIsVowelSpaceModalOpen(true)}
                onOpenSpectralSliceModal={() => handleOpenSpectralSlice()}
                onOpenAnalysisSettingsModal={() => setIsAnalysisSettingsOpen(true)}
                onTogglePitch={() => setShowPitch((prev) => !prev)}
                onToggleFormants={() => setShowFormants((prev) => !prev)}
                onToggleIntensity={() => setShowIntensity((prev) => !prev)}
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
                    showIntensity={showIntensity}
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
                currentTime={currentTime}
                hoverTime={hoverTime}
                analysisData={analysisData}
                isLoading={false}
                onOpenSpectralSlice={handleOpenSpectralSlice}
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

      <SpectralSliceModal
        isOpen={isSpectralSliceOpen}
        onClose={() => setIsSpectralSliceOpen(false)}
        channelData={audioBuffer ? audioBuffer.getChannelData(0) : null}
        sampleRate={audioBuffer ? audioBuffer.sampleRate : null}
        targetTime={spectralSliceTargetTime}
        selectedRange={selection}
        selectedLabel={selectedLabel}
      />

      <AnalysisSettingsModal
        isOpen={isAnalysisSettingsOpen}
        onClose={() => setIsAnalysisSettingsOpen(false)}
        settings={analysisSettings}
        onApplySettings={handleApplyAnalysisSettings}
      />
    </div>
  );
}
