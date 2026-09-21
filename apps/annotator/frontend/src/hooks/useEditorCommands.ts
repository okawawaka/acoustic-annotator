'use client';

import { useMemo } from 'react';
import { CommandItem } from '@/components/editor/CommandPaletteModal';
import { TextGridData, AudioMetadata, Tier } from '@/types';

export interface UseEditorCommandsOptions {
  isPlaying: boolean;
  isLooping: boolean;
  showPitch: boolean;
  showFormants: boolean;
  showIntensity: boolean;
  textGridData: TextGridData | null;
  audioMetadata: AudioMetadata | null;
  handleTogglePlay: () => void;
  handlePlaySelection: () => void;
  setIsLooping: React.Dispatch<React.SetStateAction<boolean>>;
  handleChangePlaybackRate: (rate: number) => void;
  handleInsertBoundaryAt: () => void;
  handleDeleteBoundary: () => void;
  handleSelectNextInterval: () => void;
  handleSelectPrevInterval: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleUpdateTiers: (tiers: Tier[]) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  setShowPitch: React.Dispatch<React.SetStateAction<boolean>>;
  setShowFormants: React.Dispatch<React.SetStateAction<boolean>>;
  setShowIntensity: React.Dispatch<React.SetStateAction<boolean>>;
  setMaxDisplayFreq: (freq: number) => void;
  handleOpenSpectralSlice: () => void;
  handleCopyMetricsTSV: () => void;
  handleExportTextGrid: () => void;
  setIsVowelSpaceModalOpen: (open: boolean) => void;
  setIsASRModalOpen: (open: boolean) => void;
  setIsCustomTextModalOpen: (open: boolean) => void;
  setIsAnalysisSettingsOpen: (open: boolean) => void;
  setIsAcousticTableOpen: (open: boolean) => void;
  showIpaBar: boolean;
  setShowIpaBar: React.Dispatch<React.SetStateAction<boolean>>;
  setIsRecordModalOpen: (open: boolean) => void;
  setIsShortcutsModalOpen: (open: boolean) => void;
}

export function useEditorCommands({
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
  handleOpenSpectralSlice,
  handleCopyMetricsTSV,
  handleExportTextGrid,
  setIsVowelSpaceModalOpen,
  setIsASRModalOpen,
  setIsCustomTextModalOpen,
  setIsAnalysisSettingsOpen,
  setIsAcousticTableOpen,
  showIpaBar,
  setShowIpaBar,
  setIsRecordModalOpen,
  setIsShortcutsModalOpen,
}: UseEditorCommandsOptions): CommandItem[] {
  return useMemo(() => {
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
      {
        id: 'acoustic-table',
        title: '全区間音響データ集計テーブル・CSVエクスポート (Acoustic Table)',
        category: 'ANALYSIS',
        keywords: ['table', 'csv', 'acoustic', 'しゅうけい', 'ひょう', 'エクセル', 'ぜんくかん'],
        action: () => setIsAcousticTableOpen(true),
      },
      {
        id: 'toggle-ipa',
        title: showIpaBar ? 'IPA記号入力バーを隠す (Hide IPA Bar)' : 'IPA記号入力バーを表示 (Show IPA Bar)',
        category: 'DISPLAY',
        keywords: ['ipa', 'symbol', 'きごう', 'おんせいきごう', 'キーボード'],
        action: () => setShowIpaBar((prev) => !prev),
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
    setIsVowelSpaceModalOpen,
    setIsASRModalOpen,
    setIsCustomTextModalOpen,
    setIsAnalysisSettingsOpen,
    setIsAcousticTableOpen,
    showIpaBar,
    setShowIpaBar,
    setIsRecordModalOpen,
    setIsShortcutsModalOpen,
  ]);
}
