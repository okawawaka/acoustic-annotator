'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WaveformCanvas } from '@/components/editor/WaveformCanvas';
import { TextGridTimeline } from '@/components/editor/TextGridTimeline';
import { ControlToolbar } from '@/components/editor/ControlToolbar';
import { ASRModal } from '@/components/editor/ASRModal';
import { AudioMetadata, TextGridData } from '@/types';
import { uploadAudio, parseTextGrid, exportTextGrid, transcribeAudio, getApiBaseUrl } from '@/lib/api';
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
  const [isASRModalOpen, setIsASRModalOpen] = useState(false);
  const [isASRLoading, setIsASRLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const textGridInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (audioMetadata) {
      setViewRange({ start: 0, end: Math.min(10, audioMetadata.duration) });
    }
  }, [audioMetadata]);

  // Audio time update event
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    // Loop selection
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

  // Insert boundary at current playhead
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

  // Keyboard Shortcuts
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

  // Zoom controls
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

  // Audio Upload
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const meta = await uploadAudio(file);
      setAudioMetadata(meta);

      if (!textGridData) {
        setTextGridData({
          min_timestamp: 0,
          max_timestamp: meta.duration,
          tiers: [
            {
              name: 'Word',
              tier_type: 'interval',
              min_timestamp: 0,
              max_timestamp: meta.duration,
              entries: [{ start: 0, end: meta.duration, label: '' }],
            },
          ],
        });
      }
    } catch (err: any) {
      alert(`音声の読み込みエラー: ${err.message}`);
    }
  };

  // TextGrid Upload
  const handleTextGridUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const tg = await parseTextGrid(file);
      setTextGridData(tg);
    } catch (err: any) {
      alert(`TextGrid読み込みエラー: ${err.message}`);
    }
  };

  // Export TextGrid
  const handleExportTextGrid = async () => {
    if (!textGridData) return;
    try {
      const filename = audioMetadata ? `${audioMetadata.filename.replace(/\.[^/.]+$/, '')}.TextGrid` : 'annotation.TextGrid';
      await exportTextGrid(textGridData, filename);
    } catch (err: any) {
      alert(`保存エラー: ${err.message}`);
    }
  };

  // ASR Transcription
  const handleRunASR = async (params: { modelSize: string; language?: string; tierName: string }) => {
    if (!audioMetadata) return;
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

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white text-gray-900 font-sans">
      {audioMetadata && (
        <audio
          ref={audioRef}
          src={`${getApiBaseUrl()}/api/audio/${audioMetadata.audio_id}/stream`}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.ogg,.flac,.m4a"
        className="hidden"
        onChange={handleAudioUpload}
      />
      <input
        ref={textGridInputRef}
        type="file"
        accept=".TextGrid,.textgrid"
        className="hidden"
        onChange={handleTextGridUpload}
      />

      {/* Minimal Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-sm tracking-tight text-gray-900">Acoustic Annotator</span>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => audioInputRef.current?.click()}
            className="flex items-center px-2.5 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium"
          >
            <Music className="w-3.5 h-3.5 mr-1" />
            音声を開く
          </button>
          <button
            onClick={() => textGridInputRef.current?.click()}
            className="flex items-center px-2.5 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium"
          >
            <FileText className="w-3.5 h-3.5 mr-1" />
            TextGridを開く
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        {audioMetadata ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ControlToolbar
              isPlaying={isPlaying}
              playbackRate={playbackRate}
              isLooping={isLooping}
              currentTime={currentTime}
              duration={audioMetadata.duration}
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
              onExportTextGrid={handleExportTextGrid}
            />

            <div className="bg-white">
              <WaveformCanvas
                peaks={audioMetadata.peaks}
                duration={audioMetadata.duration}
                currentTime={currentTime}
                selection={selection}
                viewRange={viewRange}
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
              className="p-8 border border-dashed border-gray-300 hover:border-gray-500 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100/60 transition-colors flex flex-col items-center max-w-sm w-full"
            >
              <Upload className="w-8 h-8 text-gray-500 mb-2" />
              <div className="text-xs font-medium text-gray-800 mb-1">音声ファイルを読み込む</div>
              <div className="text-[11px] text-gray-400">クリックまたはドラッグ＆ドロップ</div>
            </div>
          </div>
        )}
      </main>

      <ASRModal
        isOpen={isASRModalOpen}
        onClose={() => setIsASRModalOpen(false)}
        onRunASR={handleRunASR}
        isLoading={isASRLoading}
        duration={audioMetadata ? audioMetadata.duration : 0}
      />
    </div>
  );
}