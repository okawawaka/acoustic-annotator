'use client';

import { useState, useCallback } from 'react';

/**
 * 各種解析・設定・パレットモーダルの開閉状態を一元管理するフック
 */
export function useModalState() {
  const [isASRModalOpen, setIsASRModalOpen] = useState(false);
  const [isCustomTextModalOpen, setIsCustomTextModalOpen] = useState(false);
  const [isVowelSpaceModalOpen, setIsVowelSpaceModalOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSpectralSliceOpen, setIsSpectralSliceOpen] = useState(false);
  const [spectralSliceTargetTime, setSpectralSliceTargetTime] = useState(0);
  const [isAnalysisSettingsOpen, setIsAnalysisSettingsOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAcousticTableOpen, setIsAcousticTableOpen] = useState(false);
  const [showIpaBar, setShowIpaBar] = useState(false);

  // パワースペクトル断面モーダルを開くヘルパー
  const handleOpenSpectralSlice = useCallback(
    (target?: number, selection?: { start: number; end: number } | null, currentTime: number = 0) => {
      if (target !== undefined) {
        setSpectralSliceTargetTime(target);
      } else if (selection && selection.start !== selection.end) {
        setSpectralSliceTargetTime((selection.start + selection.end) / 2);
      } else {
        setSpectralSliceTargetTime(currentTime);
      }
      setIsSpectralSliceOpen(true);
    },
    []
  );

  return {
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
    setSpectralSliceTargetTime,
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
    handleOpenSpectralSlice,
  };
}
