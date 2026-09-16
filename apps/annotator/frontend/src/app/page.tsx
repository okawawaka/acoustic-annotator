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
import {
  AudioMetadata,
  TextGridData,
  IntervalEntry,
  PointEntry,
  AcousticAnalysisData,
  IntervalMetrics,
} from '@/types';
import { extractPeaksFromAudioFile, audioBufferToWavBlob } from '@/lib/audioUtils';
import { parseTextGridClient, exportTextGridClient } from '@/lib/textgridUtils';
import { analyzeAudioClient, computeIntervalMetricsClient } from '@/lib/clientAudioAnalysis';
import { computeAcousticVAD, createContiguousIntervalsFromSpeechSegments } from '@/lib/vadUtils';
import { Upload, Music, FileText } from 'lucide-react';

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

  // 音声ファイルの読み込み（完全ブラウザ内処理: サーバー不要）
  const processAudioFile = async (file: File) => {
    try {
      const objectUrl = URL.createObjectURL(file);
      setLocalAudioUrl(objectUrl);

      // Web Audio API で AudioBuffer をデコード
      const arrayBuffer = await file.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      setAudioBuffer(decodedBuffer);

      const duration = decodedBuffer.duration;
      const { peaks, sampleRate } = await extractPeaksFromAudioFile(file);

      const localMeta: AudioMetadata = {
        audio_id: 'local_' + Date.now(),
        filename: file.name,
        duration: duration,
        sample_rate: sampleRate,
        channels: 1,
        peaks: peaks,
      };
      setAudioMetadata(localMeta);
      setViewRange({ start: 0, end: Math.min(10, duration) });

      // 既にTextGridが読み込まれている場合はユーザーのTextGridデータを尊重・維持
      if (!textGridData || textGridData.tiers.length === 0 || (textGridData.tiers.length === 1 && textGridData.tiers[0].entries.length <= 1 && !textGridData.tiers[0].entries[0]?.label)) {
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
      }

      // ブラウザ内音響解析エンジンで F0, Formants, Spectrogram を即時生成
      const analysis = await analyzeAudioClient(decodedBuffer, maxFormantFreq);
      setAnalysisData(analysis);
    } catch (err: any) {
      alert(`音声の読み込みに失敗しました: ${err.message}`);
    }
  };

  // TextGrid の読み込み（完全ブラウザ内処理: UTF-16LE/BE, UTF-8, Shift-JIS自動判定）
  const processTextGridFile = async (file: File) => {
    try {
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

      const tg = parseTextGridClient(text);
      setTextGridData(tg);
      setActiveTierIdx(0);

      // 音声がまだ開かれていない場合でも、ダミーのタイムラインを生成して直ちにTextGridエディタを表示
      if (!audioMetadata) {
        const dur = tg.max_timestamp > 0 ? tg.max_timestamp : 5.0;
        const dummyMeta: AudioMetadata = {
          audio_id: 'tg_only_' + Date.now(),
          filename: file.name.replace(/\.[^/.]+$/, ''),
          duration: dur,
          sample_rate: 44100,
          channels: 1,
          peaks: new Array(1000).fill(0),
        };
        setAudioMetadata(dummyMeta);
        setViewRange({ start: 0, end: Math.min(10, dur) });
      } else {
        setViewRange({ start: 0, end: Math.min(10, audioMetadata.duration) });
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

  // ASR 自動文字起こし & 音響VAD自動区間分割 (完全ブラウザ内処理 / OpenAI Whisper API / Web Speech API)
  const handleRunASR = async (params: ASRModalRunParams) => {
    if (!audioMetadata) return;
    setIsASRLoading(true);

    try {
      if (params.mode === 'vad') {
        // Mode 1: 音響エネルギーVAD自動区間検出 (ブラウザ内即時計算)
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

        setTextGridData({
          min_timestamp: 0,
          max_timestamp: audioMetadata.duration,
          tiers: existingTiers,
        });

        setIsASRModalOpen(false);
      } else if (params.mode === 'whisper_api') {
        // Mode 2: OpenAI Whisper API
        if (!audioBuffer) {
          throw new Error('音声データが読み込まれていません。');
        }
        if (!params.apiKey) {
          throw new Error('OpenAI APIキーを入力してください。');
        }

        const wavBlob = audioBufferToWavBlob(audioBuffer);
        const formData = new FormData();
        formData.append('file', wavBlob, 'audio.wav');
        formData.append('model', 'whisper-1');
        formData.append('response_format', 'verbose_json');
        formData.append('timestamp_granularities[]', 'word');
        formData.append('timestamp_granularities[]', 'segment');
        if (params.language) {
          formData.append('language', params.language);
        }

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${params.apiKey}`,
          },
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Whisper APIエラー (HTTP ${res.status})`);
        }

        const data = await res.json();
        const existingTiers = textGridData ? [...textGridData.tiers] : [];

        if (params.outputTier === 'word' || params.outputTier === 'both') {
          const wordEntries: IntervalEntry[] = [];
          if (data.words && data.words.length > 0) {
            let curTime = 0;
            for (const w of data.words) {
              const start = Math.max(curTime, Math.round(w.start * 1000) / 1000);
              const end = Math.max(start, Math.round(w.end * 1000) / 1000);
              if (start > curTime) {
                wordEntries.push({ start: curTime, end: start, label: '' });
              }
              wordEntries.push({ start, end, label: w.word.trim() });
              curTime = end;
            }
            if (curTime < audioMetadata.duration) {
              wordEntries.push({ start: curTime, end: audioMetadata.duration, label: '' });
            }
          }
          if (wordEntries.length > 0) {
            existingTiers.push({
              name: `${params.tierName}_Word`,
              tier_type: 'interval',
              min_timestamp: 0,
              max_timestamp: audioMetadata.duration,
              entries: wordEntries,
            });
          }
        }

        if (params.outputTier === 'utterance' || params.outputTier === 'both') {
          const uttEntries: IntervalEntry[] = [];
          if (data.segments && data.segments.length > 0) {
            let curTime = 0;
            for (const s of data.segments) {
              const start = Math.max(curTime, Math.round(s.start * 1000) / 1000);
              const end = Math.max(start, Math.round(s.end * 1000) / 1000);
              if (start > curTime) {
                uttEntries.push({ start: curTime, end: start, label: '' });
              }
              uttEntries.push({ start, end, label: s.text.trim() });
              curTime = end;
            }
            if (curTime < audioMetadata.duration) {
              uttEntries.push({ start: curTime, end: audioMetadata.duration, label: '' });
            }
          }
          if (uttEntries.length > 0) {
            existingTiers.push({
              name: `${params.tierName}_Utterance`,
              tier_type: 'interval',
              min_timestamp: 0,
              max_timestamp: audioMetadata.duration,
              entries: uttEntries,
            });
          }
        }

        setTextGridData({
          min_timestamp: 0,
          max_timestamp: audioMetadata.duration,
          tiers: existingTiers,
        });
        setActiveTierIdx(existingTiers.length - 1);
        setIsASRModalOpen(false);
      } else if (params.mode === 'web_speech') {
        // Mode 3: Web Speech API
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          throw new Error('お使いのブラウザはWeb Speech APIに対応していません。Google ChromeまたはEdgeをご利用ください。');
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = params.language === 'ja' ? 'ja-JP' : params.language === 'en' ? 'en-US' : 'ja-JP';

        const capturedUtterances: { start: number; end: number; text: string }[] = [];
        let startTime = currentTime;

        recognition.onresult = (event: any) => {
          const now = audioRef.current ? audioRef.current.currentTime : currentTime;
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const text = event.results[i][0].transcript.trim();
              if (text) {
                capturedUtterances.push({
                  start: Math.round(startTime * 1000) / 1000,
                  end: Math.round(now * 1000) / 1000,
                  text,
                });
                startTime = now;
              }
            }
          }
        };

        recognition.onend = () => {
          if (capturedUtterances.length > 0) {
            const entries: IntervalEntry[] = [];
            let cur = 0;
            for (const u of capturedUtterances) {
              if (u.start > cur) {
                entries.push({ start: cur, end: u.start, label: '' });
              }
              entries.push({ start: u.start, end: u.end, label: u.text });
              cur = u.end;
            }
            if (cur < audioMetadata.duration) {
              entries.push({ start: cur, end: audioMetadata.duration, label: '' });
            }

            const newTier = {
              name: params.tierName || 'WebSpeech',
              tier_type: 'interval' as const,
              min_timestamp: 0,
              max_timestamp: audioMetadata.duration,
              entries,
            };

            const existingTiers = textGridData ? [...textGridData.tiers, newTier] : [newTier];
            setTextGridData({
              min_timestamp: 0,
              max_timestamp: audioMetadata.duration,
              tiers: existingTiers,
            });
            setActiveTierIdx(existingTiers.length - 1);
          }
        };

        recognition.start();
        setIsASRModalOpen(false);
        if (audioRef.current) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    } catch (err: any) {
      alert(`自動文字起こしエラー: ${err.message}`);
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
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-xs tracking-tight text-gray-900">
            Acoustic Annotator & Analyzer
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200" title="サーバー通信不要・ブラウザ内完結動作中">
            Client-side Standalone
          </span>
        </div>

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
                isLoading={false}
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
        textGridData={textGridData}
        analysisData={analysisData}
        initialMaxFormantFreq={maxFormantFreq}
        onSelectInterval={(s, e) => {
          setSelection({ start: s, end: e });
          handleSeek(s);
        }}
        onChangeMaxFormantFreq={handleChangeMaxFormantFreq}
      />
    </div>
  );
}
