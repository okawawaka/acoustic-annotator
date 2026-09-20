'use client';

import React, { useState } from 'react';
import { X, SplitSquareVertical } from 'lucide-react';

export interface ASRModalRunParams {
  mode: 'vad';
  tierName: string;
  minSilenceDuration: number;
  scriptText?: string;
}

interface ASRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunASR: (params: ASRModalRunParams) => Promise<void>;
  isLoading: boolean;
  duration: number;
}

export const ASRModal: React.FC<ASRModalProps> = ({
  isOpen,
  onClose,
  onRunASR,
  isLoading,
  duration,
}) => {
  const [tierName, setTierName] = useState('Speech');
  const [minSilenceDuration, setMinSilenceDuration] = useState(0.25);
  const [scriptText, setScriptText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRunASR({
      mode: 'vad',
      tierName: tierName.trim() || 'Speech',
      minSilenceDuration,
      scriptText: scriptText.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/70 backdrop-blur-none p-4">
      <div className="w-full max-w-md bg-white border-2 border-[#111111] text-[#111111] text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#111111] bg-white">
          <div className="flex items-center space-x-2 font-extrabold text-xs uppercase tracking-wider text-[#111111]">
            <SplitSquareVertical className="w-4 h-4" />
            <span>音響自動区間分割 (無音ポーズ検出)</span>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 border border-[#e0e0e6] hover:border-[#111111] hover:bg-[#111111] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 bg-[#f9f9fb]">
          <div className="p-3 bg-[#f0f0f4] border border-[#e0e0e6] text-[#111111] leading-relaxed text-[11px] font-mono">
            Praat の標準機能 <code className="bg-white px-1.5 py-0.5 border border-[#e0e0e6] font-bold">To TextGrid (silences)</code> と同様に、音声波形エネルギーから「声が出ている部分」と「無音（ポーズ）」を一瞬で自動検出し、TextGrid 区間を作成します（完全オフライン）。
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#777780] mb-1">
              無音ポーズの検出基準:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 0.15, label: '0.15s (密)' },
                { val: 0.25, label: '0.25s (標準)' },
                { val: 0.40, label: '0.40s (文単位)' },
              ].map((p) => (
                <button
                  type="button"
                  key={p.val}
                  onClick={() => setMinSilenceDuration(p.val)}
                  className={`py-1.5 px-2 border text-xs font-mono font-bold uppercase transition-colors ${
                    minSilenceDuration === p.val
                      ? 'bg-[#111111] border-[#111111] text-white'
                      : 'bg-white border-[#e0e0e6] text-[#777780] hover:border-[#111111] hover:text-[#111111]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#777780] mb-1">
              台本テキストの自動割り当て (任意):
            </label>
            <textarea
              rows={3}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="台本や発話テキストがあればここに入力してください。検出された発話区間に順次自動マッピングされます。"
              className="w-full bg-white border border-[#111111] p-2 text-xs outline-none resize-none font-mono"
            />
          </div>

          {/* Tier Name */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-[11px] text-[#777780] mb-1">生成するティア名</label>
            <input
              type="text"
              value={tierName}
              onChange={(e) => setTierName(e.target.value)}
              placeholder="Speech"
              className="w-full bg-white border border-[#111111] px-2.5 py-1.5 text-xs outline-none font-mono font-semibold"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#e0e0e6]">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-3.5 py-1.5 border border-[#e0e0e6] hover:border-[#111111] bg-white hover:bg-[#f0f0f4] text-[#111111] font-bold text-xs uppercase tracking-wider transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-1.5 border border-[#111111] bg-[#111111] text-white hover:bg-white hover:text-[#111111] font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-20"
            >
              {isLoading ? '処理中...' : '自動分割を実行'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};