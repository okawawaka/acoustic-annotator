'use client';

import React, { useState } from 'react';
import { X, SplitSquareVertical, Sparkles, Mic, Volume2, AlertTriangle } from 'lucide-react';

export interface ASRModalRunParams {
  mode: 'vad' | 'whisper';
  tierName: string;
  minSilenceDuration?: number;
  scriptText?: string;
  modelSize?: string;
  language?: string;
  outputTier?: string;
}

interface ASRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunASR: (params: ASRModalRunParams) => Promise<void>;
  isLoading: boolean;
  duration: number;
  isBackendOnline?: boolean;
}

export const ASRModal: React.FC<ASRModalProps> = ({
  isOpen,
  onClose,
  onRunASR,
  isLoading,
  duration,
  isBackendOnline = false,
}) => {
  const [activeTab, setActiveTab] = useState<'vad' | 'whisper'>(isBackendOnline ? 'whisper' : 'vad');
  const [tierName, setTierName] = useState('Speech');
  const [minSilenceDuration, setMinSilenceDuration] = useState(0.25);
  const [scriptText, setScriptText] = useState('');
  
  // Whisper オプション
  const [whisperModel, setWhisperModel] = useState('base');
  const [whisperLanguage, setWhisperLanguage] = useState('ja');
  const [whisperOutput, setWhisperOutput] = useState('word');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'vad') {
      await onRunASR({
        mode: 'vad',
        tierName: tierName.trim() || 'Speech',
        minSilenceDuration,
        scriptText: scriptText.trim() || undefined,
      });
    } else {
      await onRunASR({
        mode: 'whisper',
        tierName: tierName.trim() || (whisperOutput === 'word' ? 'Words' : 'Utterance'),
        modelSize: whisperModel,
        language: whisperLanguage === 'auto' ? undefined : whisperLanguage,
        outputTier: whisperOutput,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/70 backdrop-blur-none p-4">
      <div className="w-full max-w-lg bg-white border-2 border-[#111111] text-[#111111] text-xs shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#111111] bg-white">
          <div className="flex items-center space-x-2 font-extrabold text-xs uppercase tracking-wider text-[#111111]">
            <SplitSquareVertical className="w-4 h-4 text-[#E30613]" />
            <span>音声アライメント &amp; 自動書き起こし (ASR / VAD)</span>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 border border-[#e0e0e6] hover:border-[#111111] hover:bg-[#111111] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 border-b-2 border-[#111111] bg-[#f0f0f4]">
          <button
            type="button"
            onClick={() => setActiveTab('vad')}
            className={`py-2 px-3 text-center font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 ${
              activeTab === 'vad'
                ? 'bg-white text-[#111111] border-b-2 border-[#E30613] -mb-[2px]'
                : 'text-[#777780] hover:text-[#111111]'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>VAD 無音ポーズ分割 (オフライン)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whisper')}
            className={`py-2 px-3 text-center font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 relative ${
              activeTab === 'whisper'
                ? 'bg-white text-[#111111] border-b-2 border-[#E30613] -mb-[2px]'
                : 'text-[#777780] hover:text-[#111111]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E30613]" />
            <span>Whisper AI 文字起こし</span>
            {isBackendOnline ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1" title="API接続中" />
            ) : (
              <span className="text-[9px] px-1 bg-[#e0e0e6] text-[#777780] rounded font-mono ml-1">ローカル</span>
            )}
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 bg-[#f9f9fb]">
          {activeTab === 'vad' ? (
            <>
              <div className="p-3 bg-white border border-[#e0e0e6] text-[#111111] leading-relaxed text-[11px] font-mono">
                Praat の標準機能 <code className="bg-[#f0f0f4] px-1.5 py-0.5 border border-[#e0e0e6] font-bold">To TextGrid (silences)</code> と同様に、音声波形エネルギーから「声が出ている部分」と「無音（ポーズ）」を一瞬で自動検出し、区間を作成します（完全オフライン・高速）。
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#777780] mb-1">
                  無音ポーズの検出基準:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 0.15, label: '0.15s (密な分割)' },
                    { val: 0.25, label: '0.25s (標準)' },
                    { val: 0.40, label: '0.40s (文・句単位)' },
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
            </>
          ) : (
            <>
              <div className="p-3 bg-white border border-[#e0e0e6] text-[#111111] leading-relaxed text-[11px]">
                <div className="flex items-center space-x-1.5 font-bold mb-1 text-[#111111]">
                  <Sparkles className="w-3.5 h-3.5 text-[#E30613]" />
                  <span>Faster-Whisper 音響エネルギー谷スナッピング認識</span>
                </div>
                音声認識モデルにより音声を自動文字起こしし、さらに音響エネルギーの極小値（acoustic energy valley）にタイムスタンプをスナップ補正して正確な TextGrid 境界を作成します。
              </div>

              {!isBackendOnline && (
                <div className="p-3.5 bg-amber-50 border-2 border-amber-500 text-amber-950 space-y-2 text-xs">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>バックエンドAPIサーバー（FastAPI）が未接続です</span>
                  </div>
                  <p className="leading-relaxed text-[11px] text-amber-900">
                    Whisper AI 文字起こしはローカルPython環境（ポート 8000）で動作します。<br />
                    本機能を利用するには、同梱の <code className="bg-amber-100 px-1.5 py-0.5 font-mono font-bold border border-amber-300">start.bat</code>（Mac/Linuxは <code className="bg-amber-100 px-1.5 py-0.5 font-mono font-bold border border-amber-300">start.sh</code>）を実行してサーバーを起動してください。
                  </p>
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('vad')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center space-x-1"
                    >
                      <span>サーバー不要の「VAD 無音ポーズ分割」を使う →</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#777780] mb-1">
                    モデルサイズ:
                  </label>
                  <select
                    value={whisperModel}
                    onChange={(e) => setWhisperModel(e.target.value)}
                    className="w-full bg-white border border-[#111111] px-2.5 py-1.5 text-base sm:text-xs outline-none font-mono font-semibold"
                  >
                    <option value="tiny">tiny (最速 / 軽量)</option>
                    <option value="base">base (標準 / 推奨)</option>
                    <option value="small">small (高精度)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#777780] mb-1">
                    認識言語:
                  </label>
                  <select
                    value={whisperLanguage}
                    onChange={(e) => setWhisperLanguage(e.target.value)}
                    className="w-full bg-white border border-[#111111] px-2.5 py-1.5 text-xs outline-none font-mono font-semibold"
                  >
                    <option value="ja">日本語 (Japanese)</option>
                    <option value="en">英語 (English)</option>
                    <option value="auto">自動検出 (Auto)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#777780] mb-1">
                  出力ティア構成:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWhisperOutput('word');
                      setTierName('Words');
                    }}
                    className={`py-1.5 px-2 border text-xs font-mono font-bold uppercase transition-colors ${
                      whisperOutput === 'word'
                        ? 'bg-[#111111] border-[#111111] text-white'
                        : 'bg-white border-[#e0e0e6] text-[#777780] hover:border-[#111111] hover:text-[#111111]'
                    }`}
                  >
                    単語単位 (Word-level)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWhisperOutput('sentence');
                      setTierName('Utterance');
                    }}
                    className={`py-1.5 px-2 border text-xs font-mono font-bold uppercase transition-colors ${
                      whisperOutput === 'sentence'
                        ? 'bg-[#111111] border-[#111111] text-white'
                        : 'bg-white border-[#e0e0e6] text-[#777780] hover:border-[#111111] hover:text-[#111111]'
                    }`}
                  >
                    文・発話単位 (Utterance)
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Tier Name */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-[11px] text-[#777780] mb-1">
              生成するティア名
            </label>
            <input
              type="text"
              value={tierName}
              onChange={(e) => setTierName(e.target.value)}
              placeholder="Speech"
              className="w-full bg-white border border-[#111111] px-2.5 py-1.5 text-xs outline-none font-mono font-semibold"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-[#e0e0e6]">
            <span className="text-[10px] text-[#777780] font-mono">
              対象音声長: {duration.toFixed(2)}s
            </span>
            <div className="flex items-center space-x-2">
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
                disabled={isLoading || (!isBackendOnline && activeTab === 'whisper')}
                className="px-4 py-1.5 border border-[#111111] bg-[#111111] text-white hover:bg-white hover:text-[#111111] font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1.5"
              >
                {isLoading ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                    <span>処理中...</span>
                  </>
                ) : !isBackendOnline && activeTab === 'whisper' ? (
                  <span>API未接続 (start.batを起動)</span>
                ) : (
                  <span>{activeTab === 'whisper' ? 'Whisper 認識を開始' : '自動分割を実行'}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};