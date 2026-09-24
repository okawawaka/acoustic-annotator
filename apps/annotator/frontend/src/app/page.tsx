'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { OverviewMinimap } from '@/components/editor/OverviewMinimap';
import { WaveformCanvas } from '@/components/editor/WaveformCanvas';
import { SpectrogramCanvas } from '@/components/editor/SpectrogramCanvas';
import { TextGridTimeline } from '@/components/editor/TextGridTimeline';
import { ControlToolbar } from '@/components/editor/ControlToolbar';
import { AcousticInspector } from '@/components/editor/AcousticInspector';
import { EditorModalsContainer } from '@/components/editor/EditorModalsContainer';
import { IpaPaletteBar } from '@/components/editor/IpaPaletteBar';
import { PlayBars } from '@/components/editor/PlayBars';
import { EmptyLandingView } from '@/components/editor/EmptyLandingView';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { MobileBottomBar } from '@/components/editor/MobileBottomBar';
import { MobileToolsDrawer } from '@/components/editor/MobileToolsDrawer';
import { TrackResizeHandle } from '@/components/editor/TrackResizeHandle';
import { ToastNotification } from '@/components/common/ToastNotification';

import {
  AudioMetadata,
  TextGridData,
  IntervalEntry,
  PointEntry,
} from '@/types';

import { copyMetricsToClipboard } from '@/lib/exportUtils';
import { downloadAudioSelectionAsWav } from '@/lib/audioUtils';
import { useBackendHealth } from '@/hooks/useBackendHealth';
import { useModalState } from '@/hooks/useModalState';
import { useAcousticAnalysis } from '@/hooks/useAcousticAnalysis';
import { useTextGridHistory } from '@/hooks/useTextGridHistory';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useViewportZoom } from '@/hooks/useViewportZoom';
import { useFileLoader } from '@/hooks/useFileLoader';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useTextGridOperations } from '@/hooks/useTextGridOperations';
import { useTextGridAlignment } from '@/hooks/useTextGridAlignment';
import { useEditorCommands } from '@/hooks/useEditorCommands';
import { useTrackHeights } from '@/hooks/useTrackHeights';

export default function AnnotatorApp() {
  // Backend Connection State (Polling & Status)
  const { backendStatus } = useBackendHealth();

  // Core Domain State
  const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [textGridData, setTextGridData] = useState<TextGridData | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [activeTierIdx, setActiveTierIdx] = useState<number>(0);

  // Acoustic Analysis State & Settings Handlers
  const {
    analysisData,
    setAnalysisData,
    selectedMetrics,
    maxFormantFreq,
    setMaxFormantFreq,
    maxDisplayFreq,
    setMaxDisplayFreq,
    colorMap,
    setColorMap,
    showPitch,
    setShowPitch,
    showFormants,
    setShowFormants,
    showIntensity,
    setShowIntensity,
    analysisSettings,
    handleChangeMaxFormantFreq,
    handleApplyAnalysisSettings,
  } = useAcousticAnalysis({ audioBuffer, selection });

  // Modals Visibility State & Helpers
  const {
    isASRModalOpen,
    setIsASRModalOpen,
    isCustomTextModalOpen,
    setIsCustomTextModalOpen,
    isVowelSpaceModalOpen,
    setIsVowelSpaceModalOpen,
    isRecordModalOpen,
    setIsRecordModalOpen,
    isSpectralSliceOpen,
    setIsSpectralSliceOpen,
    spectralSliceTargetTime,
    isAnalysisSettingsOpen,
    setIsAnalysisSettingsOpen,
    isShortcutsModalOpen,
    setIsShortcutsModalOpen,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isAcousticTableOpen,
    setIsAcousticTableOpen,
    showIpaBar,
    setShowIpaBar,
    handleOpenSpectralSlice: openSpectralSliceHelper,
  } = useModalState();

  // Mobile UI States
  const [isMobileInspectorOpen, setIsMobileInspectorOpen] = useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2500);
  }, []);

  // Track dynamic heights resizing hook
  const {
    waveformHeight,
    spectrogramHeight,
    resizingTrack,
    handleStartResizeWaveform,
    handleStartResizeSpectrogram,
  } = useTrackHeights();


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

  // Open Spectral Slice Modal
  const handleOpenSpectralSlice = useCallback(
    (target?: number) => {
      openSpectralSliceHelper(target, selection, currentTime);
    },
    [openSpectralSliceHelper, selection, currentTime]
  );

  // Modal Action Handlers
  const handleRecordComplete = async (file: File) => {
    setIsRecordModalOpen(false);
    await handleBatchFiles([file]);
  };

  // Insert IPA symbol into active interval label
  const handleInsertIpaSymbol = useCallback(
    (symbol: string) => {
      if (!textGridData || !selection) return;
      const currentTier = textGridData.tiers[activeTierIdx];
      if (!currentTier || currentTier.tier_type !== 'interval') return;

      const targetEntry = (currentTier.entries as IntervalEntry[]).find(
        (e) => Math.abs(e.start - selection.start) < 0.005 && Math.abs(e.end - selection.end) < 0.005
      );

      const baseLabel = targetEntry ? targetEntry.label : selectedLabel || '';
      const newLabel = baseLabel + symbol;
      handleUpdateSelectedLabel(newLabel);
    },
    [textGridData, selection, activeTierIdx, selectedLabel, handleUpdateSelectedLabel]
  );

  // Copy selected interval acoustic metrics as TSV
  const handleCopyMetricsTSV = useCallback(async () => {
    if (!selection) return;
    const ok = await copyMetricsToClipboard({
      selection,
      selectedLabel,
      metrics: selectedMetrics,
    });
    if (ok) {
      showToast('音響統計メトリクスを TSV コピーしました');
    }
  }, [selection, selectedLabel, selectedMetrics, showToast]);

  // Export selected audio range as 16-bit PCM WAV (Praat: Extract selected sound)
  const handleExportSelectedAudio = useCallback(
    (start?: number, end?: number, label?: string | null) => {
      if (!audioBuffer) return;
      const s = start !== undefined ? start : selection?.start;
      const e = end !== undefined ? end : selection?.end;
      const lbl = label !== undefined ? label : selectedLabel;
      if (s === undefined || e === undefined || s === e) return;
      downloadAudioSelectionAsWav(audioBuffer, s, e, lbl);
      showToast(`選択区間音声を WAV 保存しました (${Math.abs(e - s).toFixed(3)}s)`);
    },
    [audioBuffer, selection, selectedLabel, showToast]
  );


  // Command Palette Items definition hook
  const commands = useEditorCommands({
    isPlaying,
    isLooping,
    showPitch,
    showFormants,
    showIntensity,
    textGridData,
    audioMetadata,
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
    handleUpdateTiers,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    setShowPitch,
    setShowFormants,
    setShowIntensity,
    setMaxDisplayFreq,
    setColorMap,
    handleOpenSpectralSlice,
    handleCopyMetricsTSV,
    handleExportTextGrid,
    handleExportSelectedAudio,
    setIsVowelSpaceModalOpen,
    setIsASRModalOpen,
    setIsCustomTextModalOpen,
    setIsAnalysisSettingsOpen,
    setIsAcousticTableOpen,
    showIpaBar,
    setShowIpaBar,
    setIsRecordModalOpen,
    setIsShortcutsModalOpen,
  });

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
        backendStatus={backendStatus}
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

            {/* Toolbar (Desktop Only) */}
            <div className="hidden md:block flex-shrink-0">
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
                colorMap={colorMap}
                onChangeColorMap={setColorMap}
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
                onOpenAcousticTable={() => setIsAcousticTableOpen(true)}
                showIpaBar={showIpaBar}
                onToggleIpaBar={() => setShowIpaBar((prev) => !prev)}
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
                onExportTextGrid={() => {
                  handleExportTextGrid();
                  showToast('TextGrid を保存しました');
                }}
                onExportSelectedAudio={() => handleExportSelectedAudio()}
              />

            </div>

            {/* Middle Split: Timelines & Visualizers */}
            <div className="flex-1 flex overflow-hidden border-t border-[#e0e0e6]">
              <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
                {/* Waveform */}
                <div className="flex-shrink-0 bg-white">
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
                    height={waveformHeight}
                  />
                  <TrackResizeHandle
                    onMouseDown={handleStartResizeWaveform}
                    onPointerDown={handleStartResizeWaveform}
                    isResizing={resizingTrack === 'waveform'}
                    label="波形"
                  />
                </div>

                {/* Spectrogram / Pitch Canvas (Dynamic Scale: 0-500Hz or 0-5000Hz) */}
                <div className="flex-shrink-0 bg-white">
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
                    colorMap={colorMap}
                    onHoverTimeChange={setHoverTime}
                    onSeek={handleSeek}
                    onSelectRange={(r) => {
                      setSelection(r);
                      setSelectedLabel(null);
                    }}
                    height={spectrogramHeight}
                  />
                  <TrackResizeHandle
                    onMouseDown={handleStartResizeSpectrogram}
                    onPointerDown={handleStartResizeSpectrogram}
                    isResizing={resizingTrack === 'spectrogram'}
                    label="スペクトログラム"
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

                {/* IPA Quick Input Ribbon */}
                {showIpaBar && (
                  <IpaPaletteBar
                    onInsertSymbol={handleInsertIpaSymbol}
                    onClose={() => setShowIpaBar(false)}
                    selectedLabel={selectedLabel}
                  />
                )}

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
                className="w-64 flex-shrink-0 border-l-2 border-[#111111] bg-white hidden md:flex flex-col h-full overflow-y-auto text-[#111111]"
                metrics={selectedMetrics}
                selectedLabel={selectedLabel}
                selectedRange={selection}
                currentTime={currentTime}
                hoverTime={hoverTime}
                analysisData={analysisData}
                audioBuffer={audioBuffer}
                isLoading={false}
                onOpenSpectralSlice={handleOpenSpectralSlice}
                onExportSelectedAudio={handleExportSelectedAudio}
              />

              {/* Mobile Bottom Sheet Inspector */}
              {isMobileInspectorOpen && (
                <div className="fixed inset-0 z-40 md:hidden flex flex-col justify-end bg-[#111111]/60 backdrop-blur-none">
                  <div className="bg-white border-t-2 border-[#111111] max-h-[75vh] flex flex-col shadow-2xl">
                    <AcousticInspector
                      className="w-full flex-1 flex flex-col overflow-y-auto bg-white text-[#111111]"
                      metrics={selectedMetrics}
                      selectedLabel={selectedLabel}
                      selectedRange={selection}
                      currentTime={currentTime}
                      hoverTime={hoverTime}
                      analysisData={analysisData}
                      audioBuffer={audioBuffer}
                      isLoading={false}
                      isMobileDrawer={true}
                      onClose={() => setIsMobileInspectorOpen(false)}
                      onOpenSpectralSlice={handleOpenSpectralSlice}
                      onExportSelectedAudio={handleExportSelectedAudio}
                    />
                  </div>
                </div>
              )}
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

      {/* Mobile Bottom Bar (Thumb-friendly Navigation & Controls) */}
      <MobileBottomBar
        isPlaying={isPlaying}
        hasAudio={!!audioMetadata}
        hasSelection={!!selection && selection.start !== selection.end}
        onTogglePlay={handleTogglePlay}
        onPlaySelection={handlePlaySelection}
        onOpenRecordModal={() => setIsRecordModalOpen(true)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onToggleInspector={() => setIsMobileInspectorOpen((prev) => !prev)}
        isInspectorOpen={isMobileInspectorOpen}
        onOpenToolsMenu={() => setIsMobileToolsOpen(true)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Mobile Tools Drawer (Collapsible Complete Toolbar for Mobile) */}
      <MobileToolsDrawer
        isOpen={isMobileToolsOpen}
        onClose={() => setIsMobileToolsOpen(false)}
        showPitch={showPitch}
        showFormants={showFormants}
        showIntensity={showIntensity}
        onTogglePitch={() => setShowPitch((prev) => !prev)}
        onToggleFormants={() => setShowFormants((prev) => !prev)}
        onToggleIntensity={() => setShowIntensity((prev) => !prev)}
        colorMap={colorMap}
        onChangeColorMap={setColorMap}
        onOpenASRModal={() => setIsASRModalOpen(true)}
        onOpenCustomTextModal={() => setIsCustomTextModalOpen(true)}
        onOpenVowelSpaceModal={() => setIsVowelSpaceModalOpen(true)}
        onOpenSpectralSliceModal={() => handleOpenSpectralSlice()}
        onOpenAnalysisSettingsModal={() => setIsAnalysisSettingsOpen(true)}
        onOpenAcousticTable={() => setIsAcousticTableOpen(true)}
        showIpaBar={showIpaBar}
        onToggleIpaBar={() => setShowIpaBar((prev) => !prev)}
        onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onExportTextGrid={() => {
          handleExportTextGrid();
          showToast('TextGrid を保存しました');
        }}
        onExportSelectedAudio={() => handleExportSelectedAudio()}
        hasAudio={!!audioMetadata}
        hasSelection={!!selection && selection.start !== selection.end}
      />

      {/* Modals Container */}
      <EditorModalsContainer
        isASRModalOpen={isASRModalOpen}
        onCloseASRModal={() => setIsASRModalOpen(false)}
        onRunASR={handleRunASR}
        isASRLoading={isASRLoading}
        audioDuration={audioMetadata ? audioMetadata.duration : 0}
        isBackendOnline={backendStatus === 'online'}
        isCustomTextModalOpen={isCustomTextModalOpen}
        onCloseCustomTextModal={() => setIsCustomTextModalOpen(false)}
        onAlignCustomText={handleAlignCustomText}
        isCustomTextLoading={isCustomTextLoading}
        existingTierNames={textGridData ? textGridData.tiers.map((t) => t.name) : ['Word']}
        isVowelSpaceModalOpen={isVowelSpaceModalOpen}
        onCloseVowelSpaceModal={() => setIsVowelSpaceModalOpen(false)}
        textGridData={textGridData}
        analysisData={analysisData}
        maxFormantFreq={maxFormantFreq}
        onSelectInterval={(s, e, label) => {
          setSelection({ start: s, end: e });
          setSelectedLabel(label || null);
          handleSeek(s);
        }}
        onChangeMaxFormantFreq={handleChangeMaxFormantFreq}
        isRecordModalOpen={isRecordModalOpen}
        onCloseRecordModal={() => setIsRecordModalOpen(false)}
        onRecordComplete={handleRecordComplete}
        isSpectralSliceOpen={isSpectralSliceOpen}
        onCloseSpectralSlice={() => setIsSpectralSliceOpen(false)}
        audioBuffer={audioBuffer}
        spectralSliceTargetTime={spectralSliceTargetTime}
        selection={selection}
        selectedLabel={selectedLabel}
        isAnalysisSettingsOpen={isAnalysisSettingsOpen}
        onCloseAnalysisSettings={() => setIsAnalysisSettingsOpen(false)}
        analysisSettings={analysisSettings}
        onApplyAnalysisSettings={handleApplyAnalysisSettings}
        isShortcutsModalOpen={isShortcutsModalOpen}
        onCloseShortcutsModal={() => setIsShortcutsModalOpen(false)}
        isAcousticTableOpen={isAcousticTableOpen}
        onCloseAcousticTable={() => setIsAcousticTableOpen(false)}
        onPlayRange={handlePlayRange}
        isCommandPaletteOpen={isCommandPaletteOpen}
        onCloseCommandPalette={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />

      {/* Global Swiss-style Toast Feedback */}
      <ToastNotification message={toastMessage} />
    </div>
  );
}

