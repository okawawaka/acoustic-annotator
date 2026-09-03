'use client';

import React, { useState } from 'react';
import { Sparkles, X, Cpu, Globe } from 'lucide-react';

interface ASRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunASR: (params: { modelSize: string; language?: string; tierName: string }) => Promise<void>;
  isLoading: boolean;
}

export const ASRModal: React.FC<ASRModalProps> = ({
  isOpen,
  onClose,
  onRunASR,
  isLoading,
}) => {
  const [modelSize, setModelSize] = useState('base');
  const [language, setLanguage] = useState('');
  const [tierName, setTierName] = useState('Whisper-ASR');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRunASR({
      modelSize,
      language: language || undefined,
      tierName,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-slate-100 text-sm">AI自動文字起こし (Faster-Whisper)</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-start p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200">
            <Cpu className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-indigo-400" />
            <span>
              <strong>CPU高速最適化 (INT8)</strong>: GPU非搭載のPCでも高速に推論します。文単位・単語単位の境界が自動でTextGridに配置されます。
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Whisperモデルサイズ
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'tiny', name: 'Tiny', desc: '最速・超軽量' },
                { id: 'base', name: 'Base', desc: '推奨バランス' },
                { id: 'small', name: 'Small', desc: '高精度' },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setModelSize(m.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    modelSize === m.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-200">{m.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center">
              <Globe className="w-3.5 h-3.5 mr-1 text-slate-400" />
              対象言語 (99言語対応)
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="">自動検出 (Auto-Detect)</option>
              <option value="ja">日本語 (Japanese)</option>
              <option value="en">英語 (English)</option>
              <option value="zh">中国語 (Chinese)</option>
              <option value="ko">韓国語 (Korean)</option>
              <option value="es">スペイン語 (Spanish)</option>
              <option value="fr">フランス語 (French)</option>
              <option value="de">ドイツ語 (German)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              出力ティアのプレフィックス
            </label>
            <input
              type="text"
              value={tierName}
              onChange={(e) => setTierName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
              placeholder="Whisper-ASR"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs text-white font-medium shadow-md transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  文字起こし中...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  実行する
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};