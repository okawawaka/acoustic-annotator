'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { OverviewMinimap } from '@/components/editor/OverviewMinimap';
import { WaveformCanvas } from '@/components/editor/WaveformCanvas';
import { SpectrogramCanvas } from '@/components/editor/SpectrogramCanvas';
import { TextGridTimeline } from '@/components/editor/TextGridTimeline';
import { ControlToolbar } from '@/components/editor/ControlToolbar';
import { AcousticInspector } from '@/components/editor/AcousticInspector';
import { ASRModal } from '@/components/editor/ASRModal';
import { CustomTextModal } from '@/components/editor/CustomTextModal';
import { VowelSpaceModal } from '@/components/editor/VowelSpaceModal';
import {
  AudioMetadata,
  TextGridData,
  IntervalEntry,
  PointEntry,
  AcousticAnalysisData,
  IntervalMetrics,
} from '@/types';
import {
  uploadAudio,
  parseTextGrid,
  exportTextGrid,
  transcribeAudio,
  alignCustomText,
  fetchAcousticAnalysis,
  fetchIntervalMetrics,
} from '@/lib/api';
import { extractPeaksFromAudioFile } from '@/lib/audioUtils';
import { Upload, Music, FileText } from 'lucide-react';

export default function AnnotatorApp() {
  const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(null);
  const [textGridData, setTextGridData] = useState<TextGridData | null>(null);
  const [analysisData, setAnalysisData] = useState<AcousticAnalysisData | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<IntervalMetrics | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);

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

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [activeTierIdx, setActiveTierIdx] = useState<number>(0);
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const textGridInputRef = useRef<HTMLInputElement | null>(null);

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

  // 話者・上限周波数変更ハンドラ
  const handleChangeMaxFormantFreq = useCallback(async (newFreq: number) => {
    setMaxFormantFreq(newFreq);
    if (!audioMetadata?.audio_id) return;

    try {
      const analysis = await fetchAcousticAnalysis(audioMetadata.audio_id, newFreq);
      setAnalysisData(analysis);
    } catch (err) {
      console.warn('Re-analysis with new formant freq failed:', err);
    }
  }, [audioMetadata?.audio_id]);

  // 「F0」ボタンクリック時：F0をONにし、縦軸を 0-500Hz（ピッチ観察用）に自動調整
  const handleTogglePitch = useCallback(() => {
    const nextShowPitch = !showPitch;
    setShowPitch(nextShowPitch);

    if (nextShowPitch) {
      // F0を観察したいので 0-500Hz スケールに自動切り替え
      setMaxDisplayFreq(500);
      setShowFormants(false); // ピッチカーブを単体でクリアに見るためフォルマントをOFF
    } else {
      // F0を消す場合は標準の 5000Hz に戻す
      setMaxDisplayFreq(5000);
    }
  }, [showPitch]);

  // 「F1-3」ボタンクリック時：フォルマントをONにし、縦軸を 0-5000Hz（広帯域）に自動調整
  const handleToggleFormants = useCallback(() => {
    const nextShowFormants = !showFormants;
    setShowFormants(nextShowFormants);

    if (nextShowFormants) {
      // フォルマント全体（F1-F3）を見るため 0-5000Hz 広帯域スケールに自動拡大
      setMaxDisplayFreq(5000);
    }
  }, [showFormants]);

  // 選択範囲または話者設定が変更された時に区間音響統計を自動取得
  useEffect(() => {
    if (!audioMetadata?.audio_id || !selection) {
      setSelectedMetrics(null);
      return;
    }
    const s = Math.min(selection.start, selection.end);
    const e = Math.max(selection.start, selection.end);
    if (e - s < 0.015) {
      setSelectedMetrics(null);
      return;
    }

    let isSubscribed = true;
    setIsMetricsLoading(true);

    fetchIntervalMetrics(audioMetadata.audio_id, s, e, maxFormantFreq)
      .then((metrics) => {
        if (isSubscribed) {
          setSelectedMetrics(metrics);
          setIsMetricsLoading(false);
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          console.warn('Interval metrics calculation failed:', err);
          setIsMetricsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [selection, audioMetadata?.audio_id, maxFormantFreq]);

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

  const handleInsertBoundary = useCallback(() => {
    if (!textGridData || textGridData.tiers.length === 0) return;
    const targetIdx = Math.max(0, Math.min(activeTierIdx, textGridData.tiers.length - 1));

    const newTiers = textGridData.tiers.map((tier, idx) => {
      if (idx === targetIdx && tier.tier_type === 'interval') {
        const cur = currentTime;
        const entries = [...tier.entries];
        const entryIdx = entries.findIndex(
          (e) => 'start' in e && e.start <= cur && e.end >= cur
        );
        if (entryIdx !== -1) {
          const original = entries[entryIdx] as IntervalEntry;
          if (cur - original.start > 0.01 && original.end - cur > 0.01) {
            entries.splice(
              entryIdx,
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
  }, [textGridData, currentTime, activeTierIdx]);

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
      setActiveTierIdx(0);

      uploadAudio(file)
        .then(async (serverMeta) => {
          setAudioMetadata((prev) => (prev ? { ...prev, audio_id: serverMeta.audio_id } : serverMeta));
          try {
            const analysis = await fetchAcousticAnalysis(serverMeta.audio_id, maxFormantFreq);
            setAnalysisData(analysis);
          } catch (analysisErr) {
            console.warn('Full acoustic analysis delayed:', analysisErr);
          }
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
      setActiveTierIdx(0);
      if (!audioMetadata) {
        const span = Math.min(10, tg.max_timestamp);
        setViewRange({ start: 0, end: span });
      }
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

  // ASR Transcription
  const handleRunASR = async (params: { modelSize: string; language?: string; tierName: string; outputTier: string }) => {
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
        outputTier: params.outputTier,
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

  // Custom Transcript Text Alignment
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

      let newTier: any = null;
      try {
        newTier = await alignCustomText({
          text: params.text,
          duration: audioMetadata.duration,
          tierName: params.tierName,
          splitBy: params.splitBy,
          audioId: audioMetadata.audio_id || undefined,
        });
      } catch (networkErr) {
        console.warn('API alignText fallback to local calculation:', networkErr);
        const intervalLen = audioMetadata.duration / items.length;
        const entries = items.map((item, i) => ({
          start: Math.round(i * intervalLen * 1000) / 1000,
          end: Math.round((i + 1) * intervalLen * 1000) / 1000,
          label: item,
        }));
        newTier = {
          name: params.tierName,
          tier_type: 'interval',
          min_timestamp: 0,
          max_timestamp: audioMetadata.duration,
          entries,
        };
      }

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
        <span className="font-semibold text-xs tracking-tight text-gray-900">
          Acoustic Annotator & Analyzer
        </span>

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
      <main className="flex-1 flex overflow-hidden bg-white">
        {audioMetadata ? (
          <div className="flex-1 flex flex-col overflow-hidden" onWheel={handleWheel}>
            {/* Minimap */}
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
                onExportTextGrid={handleExportTextGrid}
              />
            </div>

            {/* Middle Split: Timelines & Visualizers */}
            <div className="flex-1 flex overflow-hidden">
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
                    height={110}
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
                      hoverTime={hoverTime}
                      activeTierIdx={activeTierIdx}
                      onSelectTier={setActiveTierIdx}
                      onHoverTimeChange={setHoverTime}
                      onUpdateTiers={(updated) => setTextGridData({ ...textGridData, tiers: updated })}
                      onSelectInterval={(s, e, label) => {
                        setSelection({ start: s, end: e });
                        setSelectedLabel(label || null);
                        handleSeek(s);
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Right Side: Acoustic Inspector Panel */}
              <AcousticInspector
                metrics={selectedMetrics}
                selectedLabel={selectedLabel}
                selectedRange={selection}
                isLoading={isMetricsLoading}
              />
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
        audioId={audioMetadata?.audio_id || null}
        textGridData={textGridData}
        initialMaxFormantFreq={maxFormantFreq}
        onSelectInterval={(s, e) => {
          setSelection({ start: s, end: e });
          handleSeek(s);
        }}
      />
    </div>
  );
}
