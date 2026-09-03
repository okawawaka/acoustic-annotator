'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WaveformCanvas } from '@/components/editor/WaveformCanvas';
import { TextGridTimeline } from '@/components/editor/TextGridTimeline';
import { ControlToolbar } from '@/components/editor/ControlToolbar';
import { ASRModal } from '@/components/editor/ASRModal';
import { AudioMetadata, TextGridData } from '@/types';
import { uploadAudio, parseTextGrid, exportTextGrid, transcribeAudio, getApiBaseUrl } from '@/lib/api';
import { Upload, Music, FileText, CheckCircle2 } from 'lucide-react';

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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const textGridInputRef = useRef<HTMLInputElement | null>(null);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  useEffect(() => {
    if (audioMetadata) {
      setViewRange({ start: 0, end: Math.min(10, audioMetadata.duration) });
    }
  }, [audioMetadata]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);

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
    if (!textGridData || textGridData.tiers.length === 0) {
      showStatus('境界を追加するティアが存在しません。ティアを追加してください。');
      return;
    }

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
        } else {
          entries.push({ start: cur, end: Math.min(textGridData.max_timestamp, cur + 0.5), label: '' });
        }
        return { ...tier, entries };
      }
      return tier;
    });

    setTextGridData({ ...textGridData, tiers: newTiers });
    showStatus(`位置 ${currentTime.toFixed(3)}s に境界を挿入しました`);
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

  const handleZoomIn = () => {
    const span = viewRange.end - viewRange.start;
    const newSpan = Math.max(0.2, span * 0.7);
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

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showStatus('音声ファイルを処理・ピーク抽出中...');
      const meta = await uploadAudio(file);
      setAudioMetadata(meta);

      if (!textGridData) {
        setTextGridData({
          min_timestamp: 0,
          max_timestamp: meta.duration,
          tiers: [
            {
              name: 'Transcribe',
              tier_type: 'interval',
              min_timestamp: 0,
              max_timestamp: meta.duration,
              entries: [{ start: 0, end: meta.duration, label: '' }],
            },
          ],
        });
      }
      showStatus(`音声「${file.name}」を読み込みました (${meta.duration.toFixed(1)}秒)`);
    } catch (err: any) {
      alert(`音声の読み込みに失敗しました: ${err.message}`);
    }
  };

  const handleTextGridUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showStatus('TextGridファイルを解析中...');
      const tg = await parseTextGrid(file);
      setTextGridData(tg);
      showStatus(`TextGrid「${file.name}」をインポートしました (${tg.tiers.length} ティア)`);
    } catch (err: any) {
      alert(`TextGridのインポートに失敗しました: ${err.message}`);
    }
  };

  const handleExportTextGrid = async () => {
    if (!textGridData) {
      alert('エクスポートするTextGridデータがありません。');
      return;
    }
    try {
      const filename = audioMetadata ? `${audioMetadata.filename.replace(/\.[^/.]+$/, '')}.TextGrid` : 'annotation.TextGrid';
      await exportTextGrid(textGridData, filename);
      showStatus(`Praat互換の「${filename}」をダウンロードしました`);
    } catch (err: any) {
      alert(`エクスポートに失敗しました: ${err.message}`);
    }
  };

  const handleRunASR = async (params: { modelSize: string; language?: string; tierName: string }) => {
    if (!audioMetadata) return;
    setIsASRLoading(true);
    try {
      showStatus(`Whisper (${params.modelSize}) によるCPU高速文字起こしを実行中...`);
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
      showStatus(`文字起こし完了！(言語: ${result.language}, 精度: ${(result.language_probability * 100).toFixed(0)}%)`);
    } catch (err: any) {
      alert(`文字起こしに失敗しました: ${err.message}`);
    } finally {
      setIsASRLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-100">
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

      <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/90 backdrop-blur z-20">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-bold text-base">
            波
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              Acoustic Annotator
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-slate-700">
                Praat互換 Webエディション
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">PC / iPad / タブレット両用 音響分析・TextGridアノテーション</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => audioInputRef.current?.click()}
            className="flex items-center px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors"
          >
            <Music className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
            音声を開く
          </button>
          <button
            onClick={() => textGridInputRef.current?.click()}
            className="flex items-center px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            TextGridを開く
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {statusMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center px-4 py-2 rounded-xl bg-slate-800/95 border border-sky-500/40 text-sky-200 text-xs shadow-2xl backdrop-blur animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 mr-2 text-sky-400" />
            {statusMessage}
          </div>
        )}

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
              onImportClick={() => audioInputRef.current?.click()}
            />

            <div className="bg-slate-950">
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

            <div className="flex-1 overflow-y-auto bg-slate-900/40">
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
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950/60">
            <div
              onClick={() => audioInputRef.current?.click()}
              className="max-w-md w-full p-10 border-2 border-dashed border-slate-800 hover:border-sky-500/60 rounded-3xl cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-all flex flex-col items-center group"
            >
              <div className="w-16 h-16 rounded-2xl bg-sky-500/10 group-hover:bg-sky-500/20 text-sky-400 flex items-center justify-center mb-4 transition-colors">
                <Upload className="w-8 h-8" />
              </div>
              <h2 className="text-base font-semibold text-slate-200 mb-1">音声ファイルをドロップまたはクリック</h2>
              <p className="text-xs text-slate-400 mb-4">WAV, MP3, FLAC, M4A, OGG 形式に対応</p>
              <div className="flex items-center space-x-2 text-[11px] text-slate-500 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
                <span>⚡ CPU高速Whisper文字起こし ＆ Praat TextGrid互換</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <ASRModal
        isOpen={isASRModalOpen}
        onClose={() => setIsASRModalOpen(false)}
        onRunASR={handleRunASR}
        isLoading={isASRLoading}
      />
    </div>
  );
}