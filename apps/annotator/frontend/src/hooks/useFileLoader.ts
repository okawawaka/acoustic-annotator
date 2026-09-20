'use client';

import { useState, useRef, useCallback } from 'react';
import { AudioMetadata, TextGridData } from '@/types';
import { extractPeaksFromAudioFile } from '@/lib/audioUtils';
import { parseTextGridClient, exportTextGridClient } from '@/lib/textgridUtils';
import { analyzeAudioClient } from '@/lib/clientAudioAnalysis';

interface UseFileLoaderOptions {
  audioMetadata: AudioMetadata | null;
  setAudioMetadata: (meta: AudioMetadata | null) => void;
  setAudioBuffer: (buf: AudioBuffer | null) => void;
  textGridData: TextGridData | null;
  setTextGridData: (tg: TextGridData | null) => void;
  setActiveTierIdx: (idx: number) => void;
  maxFormantFreq: number;
  setAnalysisData: (data: any) => void;
  clearHistory: () => void;
}

export function useFileLoader({
  audioMetadata,
  setAudioMetadata,
  setAudioBuffer,
  textGridData,
  setTextGridData,
  setActiveTierIdx,
  maxFormantFreq,
  setAnalysisData,
  clearHistory,
}: UseFileLoaderOptions) {
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
  const handleBatchFiles = useCallback(async (files: File[]) => {
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
        clearHistory();
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
        }
      } catch (err: any) {
        alert(`TextGrid解析エラー: ${err.message}`);
      }
    } else if (audioFile) {
      // 音声のみ読み込まれ、TextGridがまだ無い（または空のデフォルトのみ）場合は初期Wordティアを作成
      if (!textGridData || textGridData.tiers.length === 0 || (textGridData.tiers.length === 1 && textGridData.tiers[0].entries.length <= 1 && !textGridData.tiers[0].entries[0]?.label)) {
        clearHistory();
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
  }, [audioMetadata, textGridData, maxFormantFreq, setAudioMetadata, setAudioBuffer, setAnalysisData, clearHistory, setTextGridData, setActiveTierIdx]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleBatchFiles(files);
  }, [handleBatchFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handleBatchFiles(files);
    e.target.value = '';
  }, [handleBatchFiles]);

  // TextGrid のエクスポート（完全ブラウザ内 Blob ダウンロード）
  const handleExportTextGrid = useCallback(() => {
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
  }, [textGridData, audioMetadata]);

  return {
    isDraggingFile,
    setIsDraggingFile,
    localAudioUrl,
    fileInputRef,
    handleBatchFiles,
    handleDrop,
    handleFileInput,
    handleExportTextGrid,
  };
}
