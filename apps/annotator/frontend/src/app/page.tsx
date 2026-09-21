'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { OverviewMinimap } from '@/components/editor/OverviewMinimap';
import { WaveformCanvas } from '@/components/editor/WaveformCanvas';
import { SpectrogramCanvas } from '@/components/editor/SpectrogramCanvas';
import { TextGridTimeline } from '@/components/editor/TextGridTimeline';
import { ControlToolbar } from '@/components/editor/ControlToolbar';
import { AcousticInspector } from '@/components/editor/AcousticInspector';
import { ASRModal } from '@/components/editor/ASRModal';
import { CustomTextModal } from '@/components/editor/CustomTextModal';
import { VowelSpaceModal } from '@/components/editor/VowelSpaceModal';
import { RecordModal } from '@/components/editor/RecordModal';
import { SpectralSliceModal } from '@/components/editor/SpectralSliceModal';
import { AnalysisSettingsModal } from '@/components/editor/AnalysisSettingsModal';
import { ShortcutsModal } from '@/components/editor/ShortcutsModal';
import { CommandPaletteModal, CommandItem } from '@/components/editor/CommandPaletteModal';
import { PlayBars } from '@/components/editor/PlayBars';
import { EmptyLandingView } from '@/components/editor/EmptyLandingView';
import { HeaderBar } from '@/components/layout/HeaderBar';

import {
  AudioMetadata,
  TextGridData,
  IntervalEntry,
  PointEntry,
  AcousticAnalysisData,
  IntervalMetrics,
  AnalysisSettings,
} from '@/types';

import { analyzeAudioClient, computeIntervalMetricsClient } from '@/lib/clientAudioAnalysis';
import { useTextGridHistory } from '@/hooks/useTextGridHistory';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useViewportZoom } from '@/hooks/useViewportZoom';
import { useFileLoader } from '@/hooks/useFileLoader';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTextGridOperations } from '@/hooks/useTextGridOperations';
import { useTextGridAlignment } from '@/hooks/useTextGridAlignment';

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
  const [isCustomTextModalOpen, setIsCustomTextModalOpen] = useState(false);
  const [isVowelSpaceModalOpen, setIsVowelSpaceModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSpectralSliceOpen, setIsSpectralSliceOpen] = useState(false);
  const [spectralSliceTargetTime, setSpectralSliceTargetTime] = useState(0);
  const [isAnalysisSettingsOpen, setIsAnalysisSettingsOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

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
    handlePlayRange,
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

  // Custom Hook: TextGrid Operations (Boundary insert/delete, interval nav, label edit)
  const {
    handleInsertBoundaryAt,
    handleUpdateSelectedLabel,
    handleSelectPrevInterval,
    handleSelectNextInterval,
    handleDeleteBoundary,
  } = useTextGridOperations({
    textGridData,
    setTextGridData,
    activeTierIdx,
    selection,
    setSelection,
    setSelectedLabel,
    currentTime,
    handleSeek,
    pushHistory,
    recordTypingSession,
  });

  // Custom Hook: TextGrid Alignment & VAD (Auto-segmentation & script alignment)
  const {
    isASRLoading,
    isCustomTextLoading,
    handleRunASR,
    handleAlignCustomText,
  } = useTextGridAlignment({
    audioMetadata,
    audioBuffer,
    textGridData,
    setTextGridData,
    setActiveTierIdx,
    pushHistory,
    setIsASRModalOpen,
    setIsCustomTextModalOpen,
  });

  // Custom Hook: Global Keyboard Shortcuts
  useKeyboardShortcuts({
    onTogglePlay: handleTogglePlay,
    onPlaySelection: handlePlaySelection,
    onInsertBoundaryAt: () => handleInsertBoundaryAt(),
    onSelectNextInterval: handleSelectNextInterval,
    onSelectPrevInterval: handleSelectPrevInterval,
    onDeleteBoundary: handleDeleteBoundary,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onOpenShortcutsModal: () => setIsShortcutsModalOpen(true),
    onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
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
  const handleChangeMaxFormantFreq = useCallback(
    async (newFreq: number) => {
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
    },
    [audioBuffer, analysisSettings]
  );

  // Apply new Praat analysis settings and re-run client analysis
  const handleApplyAnalysisSettings = useCallback(
    async (newSettings: AnalysisSettings) => {
      setAnalysisSettings(newSettings);
      setMaxFormantFreq(newSettings.maxFormantFreq);
      if (!audioBuffer) return;
      try {
        const analysis = await analyzeAudioClient(audioBuffer, newSettings);
        setAnalysisData(analysis);
      } catch (err) {
        console.warn('Client re-analysis with settings failed:', err);
      }
    },
    [audioBuffer]
  );

  // Open Spectral Slice Modal
  const handleOpenSpectralSlice = useCallback(
    (target?: number) => {
      if (target !== undefined) {
        setSpectralSliceTargetTime(target);
      } else if (selection && selection.start !== selection.end) {
        setSpectralSliceTargetTime((selection.start + selection.end) / 2);
      } else {
        setSpectralSliceTargetTime(currentTime);
      }
      setIsSpectralSliceOpen(true);
    },
    [selection, currentTime]
  );

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

  // Modal Action Handlers
  const handleRecordComplete = async (file: File) => {
    setIsRecordModalOpen(false);
    await handleBatchFiles([file]);
  };

  // Copy selected interval acoustic metrics as TSV
  const handleCopyMetricsTSV = useCallback(() => {
    if (!selection) return;
    const durMs = selectedMetrics ? selectedMetrics.duration_ms : (selection.end - selection.start) * 1000;
    const headers = [
      'Label',
      'Start(s)',
      'End(s)',
      'Duration(ms)',
      'Mean_F0(Hz)',
      'Min_F0(Hz)',
      'Max_F0(Hz)',
      'Mean_F1(Hz)',
      'Mean_F2(Hz)',
      'Mean_F3(Hz)',
      'Mean_Intensity(dB)',
      'Min_Intensity(dB)',
      'Max_Intensity(dB)',
      'COG(Hz)',
    ];
    const row = [
      selectedLabel || '',
      selection.start.toFixed(4),
      selection.end.toFixed(4),
      durMs.toFixed(2),
      selectedMetrics?.mean_f0 ? selectedMetrics.mean_f0.toFixed(1) : '',
      selectedMetrics?.min_f0 ? selectedMetrics.min_f0.toFixed(1) : '',
      selectedMetrics?.max_f0 ? selectedMetrics.max_f0.toFixed(1) : '',
      selectedMetrics?.f1 ? selectedMetrics.f1.toFixed(1) : '',
      selectedMetrics?.f2 ? selectedMetrics.f2.toFixed(1) : '',
      selectedMetrics?.f3 ? selectedMetrics.f3.toFixed(1) : '',
      selectedMetrics?.mean_intensity ? selectedMetrics.mean_intensity.toFixed(1) : '',
      selectedMetrics?.min_intensity ? selectedMetrics.min_intensity.toFixed(1) : '',
      selectedMetrics?.max_intensity ? selectedMetrics.max_intensity.toFixed(1) : '',
      selectedMetrics?.spectral_moments?.cog ? selectedMetrics.spectral_moments.cog.toFixed(1) : '',
    ];
    const tsv = `${headers.join('\t')}\n${row.join('\t')}`;
    navigator.clipboard.writeText(tsv);
  }, [selection, selectedMetrics, selectedLabel]);

  // Command Palette Items definition
  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // 再生 / Playback
      {
        id: 'play-toggle',
        title: isPlaying ? '再生を一時停止 (Pause)' : '音声を再生 (Play)',
        category: 'PLAYBACK',
        shortcut: 'Space',
        keywords: ['play', 'pause', 'さいせい', 'いちじとうし', 'スペース'],
        action: handleTogglePlay,
      },
      {
        id: 'play-selection',
        title: '選択範囲を再生 (Play Selection)',
        category: 'PLAYBACK',
        shortcut: 'Tab',
        keywords: ['tab', 'selection', 'はんいさいせい', 'せんたく'],
        action: handlePlaySelection,
      },
      {
        id: 'loop-toggle',
        title: isLooping ? 'ループ再生を解除 (Disable Loop)' : 'ループ再生を有効化 (Enable Loop)',
        category: 'PLAYBACK',
        keywords: ['loop', 'くりかえし', 'るーぷ'],
        action: () => setIsLooping((prev) => !prev),
      },
      {
        id: 'rate-1-0',
        title: '再生速度を等倍にする (1.0x Speed)',
        category: 'PLAYBACK',
        keywords: ['speed', 'rate', 'そくど', '1.0', 'とうばい'],
        action: () => handleChangePlaybackRate(1.0),
      },
      {
        id: 'rate-0-75',
        title: '再生速度をゆっくりにする (0.75x Speed)',
        category: 'PLAYBACK',
        keywords: ['speed', 'slow', 'そくど', '0.75'],
        action: () => handleChangePlaybackRate(0.75),
      },
      {
        id: 'rate-0-5',
        title: '再生速度を半速にする (0.5x Speed)',
        category: 'PLAYBACK',
        keywords: ['speed', 'slow', 'そくど', '0.5', 'はんそく'],
        action: () => handleChangePlaybackRate(0.5),
      },
      {
        id: 'rate-1-25',
        title: '再生速度を速くする (1.25x Speed)',
        category: 'PLAYBACK',
        keywords: ['speed', 'fast', 'そくど', '1.25'],
        action: () => handleChangePlaybackRate(1.25),
      },
      {
        id: 'rate-1-5',
        title: '再生速度を倍速にする (1.5x Speed)',
        category: 'PLAYBACK',
        keywords: ['speed', 'fast', 'そくど', '1.5'],
        action: () => handleChangePlaybackRate(1.5),
      },

      // 区間・TextGrid 操作 / Tier & Intervals
      {
        id: 'insert-boundary',
        title: 'カーソル位置に境界を挿入 (Insert Boundary)',
        category: 'EDIT',
        shortcut: 'Enter',
        keywords: ['boundary', 'split', 'きょうかい', 'ぶんかつ', 'enter'],
        action: () => handleInsertBoundaryAt(),
      },
      {
        id: 'delete-boundary',
        title: '選択中の境界を削除 (Delete Boundary)',
        category: 'EDIT',
        shortcut: 'Alt+Del',
        keywords: ['delete', 'remove', 'さくじょ', 'けす'],
        action: handleDeleteBoundary,
      },
      {
        id: 'select-next',
        title: '次の区間を選択 (Next Interval)',
        category: 'EDIT',
        shortcut: 'Alt+→',
        keywords: ['next', 'つぎ', 'みぎ'],
        action: handleSelectNextInterval,
      },
      {
        id: 'select-prev',
        title: '前の区間を選択 (Previous Interval)',
        category: 'EDIT',
        shortcut: 'Alt+←',
        keywords: ['previous', 'prev', 'まえ', 'ひだり'],
        action: handleSelectPrevInterval,
      },
      {
        id: 'undo',
        title: '操作を元に戻す (Undo)',
        category: 'EDIT',
        shortcut: 'Ctrl+Z',
        keywords: ['undo', 'もどす', 'とりけし'],
        action: handleUndo,
      },
      {
        id: 'redo',
        title: '操作をやり直す (Redo)',
        category: 'EDIT',
        shortcut: 'Ctrl+Y',
        keywords: ['redo', 'やりなおし'],
        action: handleRedo,
      },
      {
        id: 'add-interval-tier',
        title: '新規インターバル段を追加 (Add Interval Tier)',
        category: 'EDIT',
        keywords: ['tier', 'add', 'つか', 'だん', 'いんたーばる'],
        action: () => {
          if (!textGridData || !audioMetadata) return;
          const newTierName = `Tier ${textGridData.tiers.length + 1}`;
          handleUpdateTiers([
            ...textGridData.tiers,
            {
              name: newTierName,
              tier_type: 'interval',
              min_timestamp: 0,
              max_timestamp: audioMetadata.duration,
              entries: [{ start: 0, end: audioMetadata.duration, label: '' }],
            },
          ]);
        },
      },
      {
        id: 'add-point-tier',
        title: '新規ポイント段を追加 (Add Point Tier)',
        category: 'EDIT',
        keywords: ['tier', 'point', 'ぽいんと', 'だんついか'],
        action: () => {
          if (!textGridData || !audioMetadata) return;
          const newTierName = `Point ${textGridData.tiers.length + 1}`;
          handleUpdateTiers([
            ...textGridData.tiers,
            {
              name: newTierName,
              tier_type: 'point',
              min_timestamp: 0,
              max_timestamp: audioMetadata.duration,
              entries: [],
            },
          ]);
        },
      },

      // 表示・ズーム / View & Zoom
      {
        id: 'zoom-in',
        title: '波形・スペクトログラムを拡大 (Zoom In)',
        category: 'DISPLAY',
        keywords: ['zoom', 'in', 'かくだい', 'プラス'],
        action: handleZoomIn,
      },
      {
        id: 'zoom-out',
        title: '波形・スペクトログラムを縮小 (Zoom Out)',
        category: 'DISPLAY',
        keywords: ['zoom', 'out', 'しゅくしょう', 'マイナス'],
        action: handleZoomOut,
      },
      {
        id: 'zoom-reset',
        title: '音声全体を表示 (Reset Zoom / Fit)',
        category: 'DISPLAY',
        keywords: ['reset', 'all', 'ぜんたい', 'フィット'],
        action: handleResetZoom,
      },
      {
        id: 'toggle-pitch',
        title: showPitch ? 'ピッチ (F0) 曲線を非表示' : 'ピッチ (F0) 曲線の表示 (Show Pitch)',
        category: 'DISPLAY',
        keywords: ['pitch', 'f0', 'ぴっち', 'きほんしゅうはすう'],
        action: () => setShowPitch((prev) => !prev),
      },
      {
        id: 'toggle-formants',
        title: showFormants ? 'フォルマント (F1-F4) を非表示' : 'フォルマント (F1-F4) の表示 (Show Formants)',
        category: 'DISPLAY',
        keywords: ['formant', 'f1', 'f2', 'ふぉるまんと'],
        action: () => setShowFormants((prev) => !prev),
      },
      {
        id: 'toggle-intensity',
        title: showIntensity ? '強度 (Intensity) 曲線を非表示' : '強度 (Intensity) 曲線の表示 (Show Intensity)',
        category: 'DISPLAY',
        keywords: ['intensity', 'きょうど', 'おんりょう', 'パワー'],
        action: () => setShowIntensity((prev) => !prev),
      },
      {
        id: 'freq-5000',
        title: '周波数上限を 5000Hz (標準音声分析) に変更',
        category: 'DISPLAY',
        keywords: ['5000hz', 'freq', 'ひょうじゅん', 'しゅうはすう'],
        action: () => setMaxDisplayFreq(5000),
      },
      {
        id: 'freq-500',
        title: '周波数上限を 500Hz (ピッチ・イントネーション詳細) に変更',
        category: 'DISPLAY',
        keywords: ['500hz', 'pitch', 'ぴっち', 'ていき'],
        action: () => setMaxDisplayFreq(500),
      },
      {
        id: 'freq-8000',
        title: '周波数上限を 8000Hz (摩擦音・広帯域) に変更',
        category: 'DISPLAY',
        keywords: ['8000hz', 'fricative', 'まさつおん', 'こういき'],
        action: () => setMaxDisplayFreq(8000),
      },
      {
        id: 'freq-3000',
        title: '周波数上限を 3000Hz (母音・低域フォルマント) に変更',
        category: 'DISPLAY',
        keywords: ['3000hz', 'formant', 'ぼいん'],
        action: () => setMaxDisplayFreq(3000),
      },

      // 音響分析・ツール / Acoustic Analysis
      {
        id: 'spectral-slice',
        title: 'パワースペクトル断面を表示 (FFT / LPC Spectral Slice)',
        category: 'ANALYSIS',
        keywords: ['slice', 'spectrum', 'fft', 'lpc', 'だんめん', 'すぺくとる'],
        action: () => handleOpenSpectralSlice(),
      },
      {
        id: 'vowel-space',
        title: '母音空間プロットを表示 (F1 / F2 Vowel Chart)',
        category: 'ANALYSIS',
        keywords: ['vowel', 'f1', 'f2', 'ぼいん', 'ぼいんくうかん', 'チャート'],
        action: () => setIsVowelSpaceModalOpen(true),
      },
      {
        id: 'vad-segment',
        title: '無音検出による自動区間分割 (VAD Segmentation)',
        category: 'ANALYSIS',
        keywords: ['vad', 'asr', 'むおん', 'じどうぶんかつ', 'はつわ'],
        action: () => setIsASRModalOpen(true),
      },
      {
        id: 'script-align',
        title: '台本テキストの自動整音・配置 (Script Text Alignment)',
        category: 'ANALYSIS',
        keywords: ['script', 'text', 'だいほん', 'せいおん', 'てきすと'],
        action: () => setIsCustomTextModalOpen(true),
      },
      {
        id: 'analysis-settings',
        title: 'Praat 音響分析パラメータ設定 (Settings)',
        category: 'ANALYSIS',
        keywords: ['settings', 'praat', 'せってい', 'パラメータ'],
        action: () => setIsAnalysisSettingsOpen(true),
      },

      // エクスポート・データ / Export & Data
      {
        id: 'copy-tsv',
        title: '選択区間の音響特徴量をTSVコピー (Copy TSV to Clipboard)',
        category: 'SYSTEM',
        keywords: ['copy', 'tsv', 'clipboard', 'こぴー', 'とくちょうりょう', 'エクセル'],
        action: handleCopyMetricsTSV,
      },
      {
        id: 'export-textgrid',
        title: 'Praat TextGrid 形式で保存・エクスポート (Export TextGrid)',
        category: 'SYSTEM',
        keywords: ['export', 'save', 'textgrid', 'ほぞん', 'えくすぽーと'],
        action: handleExportTextGrid,
      },

      // 一般 / General
      {
        id: 'record-audio',
        title: 'マイクから新規録音 (Record Audio)',
        category: 'SYSTEM',
        keywords: ['record', 'mic', 'ろくおん', 'マイク'],
        action: () => setIsRecordModalOpen(true),
      },
      {
        id: 'shortcuts-modal',
        title: 'キーボードショートカット一覧を表示 (Shortcuts Help)',
        category: 'SYSTEM',
        shortcut: '?',
        keywords: ['shortcuts', 'help', 'しょーとかっと', 'へるぷ'],
        action: () => setIsShortcutsModalOpen(true),
      },
    ];

    return list;
  }, [
    isPlaying,
    isLooping,
    handleTogglePlay,
    handlePlaySelection,
    setIsLooping,
    handleChangePlaybackRate,
    handleInsertBoundaryAt,
    handleDeleteBoundary,
    handleSelectNextInterval,
    handleSelectPrevInterval,
    handleUndo,
    handleRedo,
    textGridData,
    audioMetadata,
    handleUpdateTiers,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    showPitch,
    showFormants,
    showIntensity,
    handleOpenSpectralSlice,
    handleCopyMetricsTSV,
    handleExportTextGrid,
  ]);

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

      {/* Swiss Style Masthead / Header */}
      <HeaderBar
        onOpenMicRecord={() => setIsRecordModalOpen(true)}
        onOpenFileSelect={() => fileInputRef.current?.click()}
      />

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
                onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
                onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
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

                {/* Praat-style Segment Play Bars (Window, Selection, Total) */}
                <PlayBars
                  duration={audioMetadata.duration}
                  viewRange={viewRange}
                  selection={selection}
                  onPlayRange={handlePlayRange}
                  onPlaySelection={handlePlaySelection}
                />

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
          <EmptyLandingView
            isDraggingFile={isDraggingFile}
            onOpenFileSelect={() => fileInputRef.current?.click()}
            onOpenMicRecord={() => setIsRecordModalOpen(true)}
          />
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

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />
    </div>
  );
}
