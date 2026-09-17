'use client';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden text-gray-900 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-1.5 font-semibold text-gray-800">
            <SplitSquareVertical className="w-4 h-4 text-blue-600" />
            <span>音響自動区間分割 (無音ポーズ検出)</span>
          </div>
          <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div className="p-2.5 bg-blue-50/60 rounded border border-blue-200 text-blue-950 leading-relaxed text-[11px]">
            Praat の標準機能 <code className="bg-white px-1 py-0.5 rounded border border-blue-200 font-mono">To TextGrid (silences)</code> と同様に、音声波形エネルギーから「声が出ている部分」と「無音（ポーズ）」を一瞬で自動検出し、TextGrid 区間を作成します（完全オフライン・API不要）。
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              無音ポーズの検出基準:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { val: 0.15, label: '0.15秒 (細かく分割)' },
                { val: 0.25, label: '0.25秒 (標準)' },
                { val: 0.40, label: '0.40秒 (文・節単位)' },
              ].map((p) => (
                <button
                  type="button"
                  key={p.val}
                  onClick={() => setMinSilenceDuration(p.val)}
                  className={`py-1.5 px-1.5 rounded border text-[10px] text-center transition-colors ${
                    minSilenceDuration === p.val
                      ? 'bg-blue-50 border-blue-600 text-blue-800 font-semibold shadow-2xs'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              台本テキストの自動割り当て (任意):
            </label>
            <textarea
              rows={3}
              value={scriptText}
              onChange={(e) => setScriptText(e.target.value)}
              placeholder="台本や発話テキストがあればここに入力してください。検出された発話区間に順次自動マッピングされます（未入力の場合は空の区間が作成されます）。"
              className="w-full bg-white border border-gray-300 rounded p-2 text-xs outline-none resize-none focus:border-blue-500 font-sans"
            />
          </div>

          {/* Tier Name */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">生成するティア名</label>
            <input
              type="text"
              value={tierName}
              onChange={(e) => setTierName(e.target.value)}
              placeholder="Speech"
              className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 text-xs transition-colors shadow-xs"
            >
              {isLoading ? '処理中...' : '自動分割を実行'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};