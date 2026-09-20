'use client';

import React, { useState } from 'react';
import { X, Sliders, Check } from 'lucide-react';
import { AnalysisSettings } from '@/types';

interface AnalysisSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AnalysisSettings;
  onApplySettings: (newSettings: AnalysisSettings) => void;
}

export const AnalysisSettingsModal: React.FC<AnalysisSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onApplySettings,
}) => {
  const [spectrogramType, setSpectrogramType] = useState<'wideband' | 'narrowband'>(settings.spectrogramType);
  const [minPitch, setMinPitch] = useState<number>(settings.minPitch);
  const [maxPitch, setMaxPitch] = useState<number>(settings.maxPitch);
  const [maxFormantFreq, setMaxFormantFreq] = useState<number>(settings.maxFormantFreq);
  const [dynamicRange, setDynamicRange] = useState<number>(settings.dynamicRange);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplySettings({
      spectrogramType,
      minPitch,
      maxPitch,
      maxFormantFreq,
      dynamicRange,
    });
    onClose();
  };

  const setPreset = (type: 'male' | 'female' | 'child') => {
    if (type === 'male') {
      setMinPitch(75);
      setMaxPitch(300);
      setMaxFormantFreq(5000);
    } else if (type === 'female') {
      setMinPitch(100);
      setMaxPitch(500);
      setMaxFormantFreq(5500);
    } else if (type === 'child') {
      setMinPitch(150);
      setMaxPitch(700);
      setMaxFormantFreq(6000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white border-2 border-[#111111] max-w-lg w-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-11 border-b-2 border-[#111111] px-4 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-4 h-4 text-[#111111]" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#111111]">
              Praat Analysis Settings / 音響分析パラメータ設定
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#111111] hover:text-white transition-colors border border-transparent hover:border-[#111111]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-xs text-[#111111]">
          {/* Quick Presets */}
          <div>
            <label className="block font-mono uppercase tracking-widest text-[#777780] font-bold text-[10px] mb-1.5">
              Speaker Presets (話者プリセット)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPreset('male')}
                className="py-1.5 px-2 border border-[#111111] font-mono text-[11px] font-bold hover:bg-[#111111] hover:text-white transition-colors"
              >
                成人男性 (Male)
              </button>
              <button
                type="button"
                onClick={() => setPreset('female')}
                className="py-1.5 px-2 border border-[#111111] font-mono text-[11px] font-bold hover:bg-[#111111] hover:text-white transition-colors"
              >
                成人女性 (Female)
              </button>
              <button
                type="button"
                onClick={() => setPreset('child')}
                className="py-1.5 px-2 border border-[#111111] font-mono text-[11px] font-bold hover:bg-[#111111] hover:text-white transition-colors"
              >
                児童 (Child)
              </button>
            </div>
          </div>

          {/* Spectrogram Type */}
          <div className="border-t border-[#e0e0e6] pt-4">
            <label className="block font-mono uppercase tracking-widest text-[#777780] font-bold text-[10px] mb-1.5">
              Spectrogram Window Length (スペクトログラム窓長)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-2.5 border-2 cursor-pointer flex flex-col transition-colors ${
                  spectrogramType === 'wideband'
                    ? 'border-[#111111] bg-[#f0f0f4]'
                    : 'border-[#e0e0e6] hover:border-[#777780]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold font-mono text-[11px]">広帯域 (Wideband: 5ms)</span>
                  <input
                    type="radio"
                    name="spectrogramType"
                    checked={spectrogramType === 'wideband'}
                    onChange={() => setSpectrogramType('wideband')}
                    className="accent-[#111111]"
                  />
                </div>
                <span className="text-[10px] text-[#777780] font-mono leading-tight">
                  時間分解能優先。フォルマント変化や声帯振動パルス（縦縞）の観察に最適。
                </span>
              </label>

              <label
                className={`p-2.5 border-2 cursor-pointer flex flex-col transition-colors ${
                  spectrogramType === 'narrowband'
                    ? 'border-[#111111] bg-[#f0f0f4]'
                    : 'border-[#e0e0e6] hover:border-[#777780]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold font-mono text-[11px]">狭帯域 (Narrowband: 30ms)</span>
                  <input
                    type="radio"
                    name="spectrogramType"
                    checked={spectrogramType === 'narrowband'}
                    onChange={() => setSpectrogramType('narrowband')}
                    className="accent-[#111111]"
                  />
                </div>
                <span className="text-[10px] text-[#777780] font-mono leading-tight">
                  周波数分解能優先。個々の倍音構造（横縞の調波成分）の観察に最適。
                </span>
              </label>
            </div>
          </div>

          {/* Pitch Range */}
          <div className="border-t border-[#e0e0e6] pt-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-mono uppercase tracking-widest text-[#777780] font-bold text-[10px]">
                Pitch Search Range (F0 検出範囲)
              </label>
              <span className="font-mono text-[11px] font-bold text-[#111111]">
                {minPitch} Hz - {maxPitch} Hz
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-[#777780] font-mono">Floor (下限):</span>
                <input
                  type="number"
                  min={50}
                  max={250}
                  step={5}
                  value={minPitch}
                  onChange={(e) => setMinPitch(Number(e.target.value))}
                  className="w-full mt-1 px-2 py-1 border border-[#111111] font-mono font-bold"
                />
              </div>
              <div>
                <span className="text-[10px] text-[#777780] font-mono">Ceiling (上限):</span>
                <input
                  type="number"
                  min={250}
                  max={900}
                  step={10}
                  value={maxPitch}
                  onChange={(e) => setMaxPitch(Number(e.target.value))}
                  className="w-full mt-1 px-2 py-1 border border-[#111111] font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Formant Ceiling & Dynamic Range */}
          <div className="border-t border-[#e0e0e6] pt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono uppercase tracking-widest text-[#777780] font-bold text-[10px] mb-1">
                Max Formant Freq
              </label>
              <select
                value={maxFormantFreq}
                onChange={(e) => setMaxFormantFreq(Number(e.target.value))}
                className="w-full px-2 py-1 border border-[#111111] bg-white font-mono font-bold"
              >
                <option value={5000}>5000 Hz (成人男性標準)</option>
                <option value={5500}>5500 Hz (成人女性標準)</option>
                <option value={6000}>6000 Hz (児童標準)</option>
              </select>
            </div>

            <div>
              <label className="block font-mono uppercase tracking-widest text-[#777780] font-bold text-[10px] mb-1">
                Dynamic Range: {dynamicRange} dB
              </label>
              <input
                type="range"
                min={30}
                max={70}
                step={5}
                value={dynamicRange}
                onChange={(e) => setDynamicRange(Number(e.target.value))}
                className="w-full accent-[#111111] mt-1.5"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 border-t-2 border-[#111111] px-4 flex items-center justify-between bg-[#f0f0f4]">
          <span className="text-[10px] text-[#777780] font-mono">
            Praat analysis parameters
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1 border border-[#777780] bg-white hover:bg-[#e0e0e6] text-xs font-mono font-bold transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleApply}
              className="px-3 py-1 border border-[#111111] bg-[#111111] text-white hover:bg-white hover:text-[#111111] text-xs font-mono font-bold transition-colors flex items-center"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              適用して再分析
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
