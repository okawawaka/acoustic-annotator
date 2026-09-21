'use client';

import React from 'react';
import { ASRModal, ASRModalRunParams } from './ASRModal';
import { CustomTextModal } from './CustomTextModal';
import { VowelSpaceModal } from './VowelSpaceModal';
import { RecordModal } from './RecordModal';
import { SpectralSliceModal } from './SpectralSliceModal';
import { AnalysisSettingsModal } from './AnalysisSettingsModal';
import { ShortcutsModal } from './ShortcutsModal';
import { AcousticTableModal } from './AcousticTableModal';
import { CommandPaletteModal, CommandItem } from './CommandPaletteModal';
import {
  TextGridData,
  AcousticAnalysisData,
  AnalysisSettings,
  AudioMetadata,
} from '@/types';

export interface EditorModalsContainerProps {
  // ASR Modal
  isASRModalOpen: boolean;
  onCloseASRModal: () => void;
  onRunASR: (params: ASRModalRunParams) => Promise<void>;
  isASRLoading: boolean;
  audioDuration: number;
  isBackendOnline?: boolean;

  // Custom Text Modal
  isCustomTextModalOpen: boolean;
  onCloseCustomTextModal: () => void;
  onAlignCustomText: (params: {
    text: string;
    tierName: string;
    splitBy: string;
    targetMode: 'existing' | 'new';
  }) => Promise<void>;
  isCustomTextLoading: boolean;
  existingTierNames: string[];

  // Vowel Space Modal
  isVowelSpaceModalOpen: boolean;
  onCloseVowelSpaceModal: () => void;
  textGridData: TextGridData | null;
  analysisData: AcousticAnalysisData | null;
  maxFormantFreq: number;
  onSelectInterval: (start: number, end: number, label?: string) => void;
  onChangeMaxFormantFreq: (freq: number) => Promise<void>;

  // Record Modal
  isRecordModalOpen: boolean;
  onCloseRecordModal: () => void;
  onRecordComplete: (file: File) => Promise<void>;

  // Spectral Slice Modal
  isSpectralSliceOpen: boolean;
  onCloseSpectralSlice: () => void;
  audioBuffer: AudioBuffer | null;
  spectralSliceTargetTime: number;
  selection: { start: number; end: number } | null;
  selectedLabel: string | null;

  // Analysis Settings Modal
  isAnalysisSettingsOpen: boolean;
  onCloseAnalysisSettings: () => void;
  analysisSettings: AnalysisSettings;
  onApplyAnalysisSettings: (newSettings: AnalysisSettings) => Promise<void>;

  // Shortcuts Modal
  isShortcutsModalOpen: boolean;
  onCloseShortcutsModal: () => void;

  // Acoustic Table Modal
  isAcousticTableOpen: boolean;
  onCloseAcousticTable: () => void;
  onPlayRange: (start: number, end: number) => void;

  // Command Palette Modal
  isCommandPaletteOpen: boolean;
  onCloseCommandPalette: () => void;
  commands: CommandItem[];
}

export const EditorModalsContainer: React.FC<EditorModalsContainerProps> = ({
  // ASR
  isASRModalOpen,
  onCloseASRModal,
  onRunASR,
  isASRLoading,
  audioDuration,
  isBackendOnline = false,

  // Custom Text
  isCustomTextModalOpen,
  onCloseCustomTextModal,
  onAlignCustomText,
  isCustomTextLoading,
  existingTierNames,

  // Vowel Space
  isVowelSpaceModalOpen,
  onCloseVowelSpaceModal,
  textGridData,
  analysisData,
  maxFormantFreq,
  onSelectInterval,
  onChangeMaxFormantFreq,

  // Record
  isRecordModalOpen,
  onCloseRecordModal,
  onRecordComplete,

  // Spectral Slice
  isSpectralSliceOpen,
  onCloseSpectralSlice,
  audioBuffer,
  spectralSliceTargetTime,
  selection,
  selectedLabel,

  // Analysis Settings
  isAnalysisSettingsOpen,
  onCloseAnalysisSettings,
  analysisSettings,
  onApplyAnalysisSettings,

  // Shortcuts
  isShortcutsModalOpen,
  onCloseShortcutsModal,

  // Acoustic Table
  isAcousticTableOpen,
  onCloseAcousticTable,
  onPlayRange,

  // Command Palette
  isCommandPaletteOpen,
  onCloseCommandPalette,
  commands,
}) => {
  return (
    <>
      <ASRModal
        isOpen={isASRModalOpen}
        onClose={onCloseASRModal}
        onRunASR={onRunASR}
        isLoading={isASRLoading}
        duration={audioDuration}
        isBackendOnline={isBackendOnline}
      />

      <CustomTextModal
        isOpen={isCustomTextModalOpen}
        onClose={onCloseCustomTextModal}
        onAlignText={onAlignCustomText}
        isLoading={isCustomTextLoading}
        existingTierNames={existingTierNames}
      />

      <VowelSpaceModal
        isOpen={isVowelSpaceModalOpen}
        onClose={onCloseVowelSpaceModal}
        textGridData={textGridData}
        analysisData={analysisData}
        initialMaxFormantFreq={maxFormantFreq}
        onSelectInterval={(s, e) => onSelectInterval(s, e)}
        onChangeMaxFormantFreq={onChangeMaxFormantFreq}
      />

      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={onCloseRecordModal}
        onRecordComplete={onRecordComplete}
      />

      <SpectralSliceModal
        isOpen={isSpectralSliceOpen}
        onClose={onCloseSpectralSlice}
        channelData={audioBuffer ? audioBuffer.getChannelData(0) : null}
        sampleRate={audioBuffer ? audioBuffer.sampleRate : null}
        targetTime={spectralSliceTargetTime}
        selectedRange={selection}
        selectedLabel={selectedLabel}
      />

      <AnalysisSettingsModal
        isOpen={isAnalysisSettingsOpen}
        onClose={onCloseAnalysisSettings}
        settings={analysisSettings}
        onApplySettings={onApplyAnalysisSettings}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={onCloseShortcutsModal}
      />

      <AcousticTableModal
        isOpen={isAcousticTableOpen}
        onClose={onCloseAcousticTable}
        textGridData={textGridData}
        analysisData={analysisData}
        audioBuffer={audioBuffer}
        onSelectInterval={onSelectInterval}
        onPlayRange={onPlayRange}
      />

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={onCloseCommandPalette}
        commands={commands}
      />
    </>
  );
};
