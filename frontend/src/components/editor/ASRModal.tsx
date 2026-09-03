'use client';

import React, { useState, useEffect } from 'react';
import { X, Mic } from 'lucide-react';

interface ASRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunASR: (params: { modelSize: string; language?: string; tierName: string }) => Promise<void>;
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
  const [modelSize, setModelSize] = useState('base');
  const [language, setLanguage] = useState('');
  const [tierName, setTierName] = useState('Whisper');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer for execution feedback
  useEffect(() => {
    let interval: any = null;
    if (isLoading) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading]);

  if (!isOpen) return null;

  // Calculate rough estimated processing time on standard CPU
  const getEstimatedSeconds = () => {
    if (!duration || duration <= 0) return 10;
    switch (modelSize) {
      case 'tiny':
        return Math.max(2, Math.round(duration * 0.15));
      case 'base':
        return Math.max(3, Math.round(duration * 0.35));
      case 'small':
        return Math.max(5, Math.round(duration * 0.9));
      default:
        return Math.round(duration * 0.4);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRunASR({
      modelSize,
      language: language || undefined,
      tierName,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden text-gray-900 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-1.5 font-semibold text-gray-800">
            <Mic className="w-4 h-4" />
            <span>音声認識 (自動文字起こし)</span>
          </div>
          <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Model Selection */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">モデルサイズ</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'tiny', name: 'Tiny (高速)' },
                { id: 'base', name: 'Base (標準)' },
                { id: 'small', name: 'Small (高精度)' },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setModelSize(m.id)}
                  className={`py-1.5 px-2 rounded border text-center font-medium transition-colors ${
                    modelSize === m.id
                      ? 'bg-gray-900 border-gray-900 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">言語</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 outline-none"
            >
              <option value="">自動判別 (Auto-detect)</option>
              <option value="ja">日本語 (Japanese)</option>
              <option value="en">英語 (English)</option>
              <option value="zh">中国語 (Chinese)</option>
              <option value="ko">韓国語 (Korean)</option>
              <option value="fr">フランス語 (French)</option>
              <option value="de">ドイツ語 (German)</option>
              <option value="es">スペイン語 (Spanish)</option>
            </select>
          </div>

          {/* Estimated Time Indicator */}
          <div className="py-2 px-3 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-600 flex items-center justify-between">
            <span>所要時間の目安:</span>
            <span className="font-semibold text-gray-900">約 {getEstimatedSeconds()} 秒</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-1.5 rounded bg-gray-900 hover:bg-gray-800 text-white font-medium disabled:opacity-50"
            >
              {isLoading ? `処理中... (${elapsedSeconds}秒)` : '開始'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};