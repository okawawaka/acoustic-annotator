'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { OverviewMinimap } from '@/components/editor/OverviewMinimap';
import { WaveformCanvas } from '@/components/editor/WaveformCanvas';
import { TextGridTimeline } from '@/components/editor/TextGridTimeline';
import { ControlToolbar } from '@/components/editor/ControlToolbar';
import { ASRModal } from '@/components/editor/ASRModal';
import { CustomTextModal } from '@/components/editor/CustomTextModal';
import { AudioMetadata, TextGridData, IntervalEntry, PointEntry } from '@/types';
import { uploadAudio, parseTextGrid, exportTextGrid, transcribeAudio, alignCustomText } from '@/lib/api';
import { extractPeaksFromAudioFile } from '@/lib/audioUtils';
import { Upload, Music, FileText } from 'lucide-react';

export default function AnnotatorApp() {
  const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(null);
  const [textGridData, setTextGridData] = useState<TextGridData | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [viewRange, setViewRange] = useState({ start: 0, end: 10 });
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isASRModalOpen, setIsASRModalOpen] = useState(false);
  const [isASRLoading, setIsASRLoading] = useState(false);
  const [isCustomTextModalOpen, setIsCustomTextModalOpen] = useState(false);
  const [isCustomTextLoading, setIsCustomTextLoading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const textGridInputRef = useRef<HTMLInputElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (audioMetadata) {
      const initSpan = Math.min(10, audioMetadata.duration);
      setViewRange({ start: 0, end: initSpan });
    }
  }, [audioMetadata]);

  // Extract all boundaries from TextGrid for waveform projection
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

  // Audio time update event with Auto-Scroll on playback
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    if (isPlaying && time > viewRange.end) {
      const span = viewRange.end - viewRange.start;
      const newStart = time;
      const newEnd = Math.min(audioMetadata ? audioMetadata.duration : time + span, newStart + span);
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

  const handleInsertBoundary = useCallback(() => {
    if (!textGridData || textGridData.tiers.length === 0) return;

    const newTiers = textGridData.tiers.map((tier) => {
      if (tier.tier_type === 'interval') {
        const cur = currentTime;
        const entries = [...tier.entries];
        const targetIdx = entries.findIndex(
          (e) => 'start' in e && e.start <= cur && e.end >= cur
        );
        if (targetIdx !== -1) {
          const original = entries[targetIdx] as any;
          if (cur - original.start > 0.01 && original.end - cur > 0.01) {
            entries.splice(
              targetIdx,
              1,
              { start: original.start, end: cur, label: original.label },
              { start: cur, end: original.end, label: '' }
            );
          }
        }
        return { ...tier, entries };
      }
      return tier;
    });

    setTextGridData({ ...textGridData, tiers: newTiers });
  }, [textGridData, currentTime]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'Tab') {
        e.preventDefault();
        handlePlaySelection();
      } else if (e.code === 'Enter') {
        e.preventDefault();
        handleInsertBoundary();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handlePlaySelection, handleInsertBoundary]);

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

  const processAudioFile = async (file: File) => {
    try {
      const objectUrl = URL.createObjectURL(file);
      setLocalAudioUrl(objectUrl);

      const { duration, peaks, sampleRate } = await extractPeaksFromAudioFile(file);

      const localMeta: AudioMetadata = {
        audio_id: '',
        filename: file.name,
        duration: duration,
        sample_rate: sampleRate,
        channels: 1,
        peaks: peaks,
      };
      setAudioMetadata(localMeta);

      setTextGridData({
        min_timestamp: 0,
        max_timestamp: duration,
        tiers: [
          {
            name: 'Word',
            tier_type: 'interval',
            min_timestamp: 0,
            max_timestamp: duration,
            entries: [{ start: 0, end: duration, label: '' }],
          },
        ],
      });

      uploadAudio(file)
        .then((serverMeta) => {
          setAudioMetadata((prev) => (prev ? { ...prev, audio_id: serverMeta.audio_id } : serverMeta));
        })
        .catch((err) => {
          console.warn('Backend upload delayed, local editing remains active:', err);
        });
    } catch (err: any) {
      alert(`音声の読み込みに失敗しました: ${err.message}`);
    }
  };

  const processTextGridFile = async (file: File) => {
    try {
      const tg = await parseTextGrid(file);
      setTextGridData(tg);
    } catch (err: any) {
      alert(`TextGrid解析エラー: ${err.message}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    for (const file of files) {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.textgrid')) {
        processTextGridFile(file);
      } else if (file.type.startsWith('audio/') || lower.match(/\.(wav|mp3|ogg|flac|m4a|aac)$/)) {
        processAudioFile(file);
      }
    }
  };

  const handleAudioInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processAudioFile(file);
    e.target.value = '';
  };

  const handleTextGridInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processTextGridFile(file);
    e.target.value = '';
  };

  const handleExportTextGrid = async () => {
    if (!textGridData) return;
    try {
      const filename = audioMetadata ? `${audioMetadata.filename.replace(/\.[^/.]+$/, '')}.TextGrid` : 'annotation.TextGrid';
      await exportTextGrid(textGridData, filename);
    } catch (err: any) {
      alert(`保存エラー: ${err.message}`);
    }
  };

  // ASR Transcription (Complete from start to finish)
  const handleRunASR = async (params: { modelSize: string; language?: string; tierName: string }) => {
    if (!audioMetadata || !audioMetadata.audio_id) {
      alert('バックエンドに音声が登録されていません。少し待ってから再度お試しください。');
      return;
    }
    setIsASRLoading(true);
    try {
      const result = await transcribeAudio({
        audioId: audioMetadata.audio_id,
        modelSize: params.modelSize,
        language: params.language,
        tierName: params.tierName,
      });

      const existingTiers = textGridData ? textGridData.tiers : [];
      setTextGridData({
        min_timestamp: 0,
        max_timestamp: audioMetadata.duration,
        tiers: [...existingTiers, ...result.textgrid.tiers],
      });

      setIsASRModalOpen(false);
    } catch (err: any) {
      alert(`文字起こしエラー: ${err.message}`);
    } finally {
      setIsASRLoading(false);
    }
  };

  // Custom Transcript Alignment from User Text
  const handleAlignCustomText = async (params: { text: string; tierName: string; splitBy: string }) => {
    if (!audioMetadata) return;
    setIsCustomTextLoading(true);
    try {
      const newTier = await alignCustomText({
        text: params.text,
        duration: audioMetadata.duration,
        tierName: params.tierName,
        splitBy: params.splitBy,
      });

      const existingTiers = textGridData ? textGridData.tiers : [];
      setTextGridData({
        min_timestamp: 0,
        max_timestamp: audioMetadata.duration,
        tiers: [...existingTiers, newTier],
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
        ref={audioInputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a"
        className="hidden"
        onChange={handleAudioInput}
      />
      <input
        ref={textGridInputRef}
        type="file"
        accept=".TextGrid,.textgrid"
        className="hidden"
        onChange={handleTextGridInput}
      />

      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-blue-50/80 border-2 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
          <div className="bg-white px-6 py-4 rounded-lg shadow-lg border border-blue-200 text-sm font-semibold text-blue-700">
            音声ファイルまたはTextGridをここにドロップ
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-10 flex-shrink-0 flex items-center justify-between px-3 border-b border-gray-200 bg-white">
        <span className="font-semibold text-xs tracking-tight text-gray-900">Acoustic Annotator</span>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => audioInputRef.current?.click()}
            className="flex items-center px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium"
          >
            <Music className="w-3.5 h-3.5 mr-1" />
            音声を開く
          </button>
          <button
            onClick={() => textGridInputRef.current?.click()}
            className="flex items-center px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium"
          >
            <FileText className="w-3.5 h-3.5 mr-1" />
            TextGridを開く
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white" onWheel={handleWheel}>
        {audioMetadata ? (
          <div ref={workspaceRef} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-shrink-0">
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

            <div className="flex-shrink-0">
              <ControlToolbar
                isPlaying={isPlaying}
                playbackRate={playbackRate}
                isLooping={isLooping}
                currentTime={currentTime}
                duration={audioMetadata.duration}
                selection={selection}
                hasAudio={true}
                onTogglePlay={handleTogglePlay}
                onPlaySelection={handlePlaySelection}
                onToggleLoop={() => setIsLooping(!isLooping)}
                onChangePlaybackRate={(rate) => {
                  setPlaybackRate(rate);
                  if (audioRef.current) audioRef.current.playbackRate = rate;
                }}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onResetZoom={handleResetZoom}
                onInsertBoundary={handleInsertBoundary}
                onOpenASRModal={() => setIsASRModalOpen(true)}
                onOpenCustomTextModal={() => setIsCustomTextModalOpen(true)}
                onExportTextGrid={handleExportTextGrid}
              />
            </div>

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
                onSelectRange={setSelection}
                height={150}
              />
            </div>

            <div className="flex-1 overflow-y-auto bg-white">
              {textGridData && (
                <TextGridTimeline
                  tiers={textGridData.tiers}
                  duration={audioMetadata.duration}
                  currentTime={currentTime}
                  viewRange={viewRange}
                  selection={selection}
                  hoverTime={hoverTime}
                  onHoverTimeChange={setHoverTime}
                  onUpdateTiers={(updated) => setTextGridData({ ...textGridData, tiers: updated })}
                  onSelectInterval={(s, e) => {
                    setSelection({ start: s, end: e });
                    handleSeek(s);
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
            <div
              onClick={() => audioInputRef.current?.click()}
              className="p-8 border border-dashed border-gray-300 hover:border-gray-500 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100/60 transition-colors flex flex-col items-center max-w-xs w-full"
            >
              <Upload className="w-7 h-7 text-gray-400 mb-2" />
              <div className="text-xs font-medium text-gray-800 mb-0.5">音声ファイルを読み込む</div>
              <div className="text-[11px] text-gray-400">クリックまたはドラッグ＆ドロップ</div>
            </div>
          </div>
        )}
      </main>

      {/* ASR Modal */}
      <ASRModal
        isOpen={isASRModalOpen}
        onClose={() => setIsASRModalOpen(false)}
        onRunASR={handleRunASR}
        isLoading={isASRLoading}
        duration={audioMetadata ? audioMetadata.duration : 0}
      />

      {/* Custom Transcript Text Alignment Modal */}
      <CustomTextModal
        isOpen={isCustomTextModalOpen}
        onClose={() => setIsCustomTextModalOpen(false)}
        onAlignText={handleAlignCustomText}
        isLoading={isCustomTextLoading}
      />
    </div>
  );
}