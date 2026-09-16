'use client';

import React, { useState, useEffect } from 'react';
import { X, Mic, Cpu, Cloud, Radio } from 'lucide-react';

export interface ASRModalRunParams {
  mode: 'vad' | 'whisper_api' | 'web_speech';
  tierName: string;
  outputTier: 'word' | 'utterance' | 'both';
  language: string;
  scriptText?: string;
  minSilenceDuration: number;
  apiKey?: string;
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
  const [mode, setMode] = useState<'vad' | 'whisper_api' | 'web_speech'>('vad');
  const [tierName, setTierName] = useState('Speech');
  const [language, setLanguage] = useState('ja');
  const [outputTier, setOutputTier] = useState<'word' | 'utterance' | 'both'>('word');
  const [minSilenceDuration, setMinSilenceDuration] = useState(0.25);
  const [scriptText, setScriptText] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Load saved API key from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('openai_api_key');
      if (savedKey) setApiKey(savedKey);
    }
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'whisper_api') {
      if (!apiKey.trim()) {
        alert('OpenAI APIキーを入力してください。');
        return;
      }
      localStorage.setItem('openai_api_key', apiKey.trim());
    }

    await onRunASR({
      mode,
      tierName: tierName.trim() || (mode === 'whisper_api' ? 'Whisper' : 'Speech'),
      outputTier,
      language,
      scriptText: scriptText.trim() || undefined,
      minSilenceDuration,
      apiKey: apiKey.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden text-gray-900 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-1.5 font-semibold text-gray-800">
            <Mic className="w-4 h-4 text-blue-600" />
            <span>音声認識・自動区間分割 (ASR / VAD)</span>
          </div>
          <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Mode Selection */}
          <div>
            <label className="block font-medium text-gray-700 mb-1.5">処理エンジンの選択</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setMode('vad');
                  if (tierName === 'Whisper') setTierName('Speech');
                }}
                className={`py-2 px-2 rounded border text-left flex flex-col items-center justify-center transition-colors ${
                  mode === 'vad'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 font-semibold'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Cpu className="w-4 h-4 mb-1 text-blue-600" />
                <span className="text-[11px] leading-tight">音響VAD分割</span>
                <span className="text-[9px] text-gray-600 font-normal">オフライン・即時</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('whisper_api');
                  if (tierName === 'Speech') setTierName('Whisper');
                }}
                className={`py-2 px-2 rounded border text-left flex flex-col items-center justify-center transition-colors ${
                  mode === 'whisper_api'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 font-semibold'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Cloud className="w-4 h-4 mb-1 text-purple-600" />
                <span className="text-[11px] leading-tight">Whisper API</span>
                <span className="text-[9px] text-gray-600 font-normal">OpenAIクラウド</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('web_speech')}
                className={`py-2 px-2 rounded border text-left flex flex-col items-center justify-center transition-colors ${
                  mode === 'web_speech'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 font-semibold'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Radio className="w-4 h-4 mb-1 text-emerald-600" />
                <span className="text-[11px] leading-tight">Web Speech</span>
                <span className="text-[9px] text-gray-600 font-normal">ブラウザ認識</span>
              </button>
            </div>
          </div>

          {/* Engine Specific Configuration */}
          {mode === 'vad' && (
            <div className="space-y-2.5 p-2.5 bg-gray-50 rounded border border-gray-200">
              <div className="text-[11px] text-gray-600 leading-relaxed">
                Praat標準の <code className="bg-white px-1 py-0.5 rounded border border-gray-300">To TextGrid (silences)</code> と同様に、音響波形エネルギーから無音・発話区間を瞬時に自動検出してティアを作成します。
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  無音ポーズの検出基準:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { val: 0.15, label: '0.15秒 (細かく分割)' },
                    { val: 0.25, label: '0.25秒 (標準)' },
                    { val: 0.40, label: '0.40秒 (文単位)' },
                  ].map((p) => (
                    <button
                      type="button"
                      key={p.val}
                      onClick={() => setMinSilenceDuration(p.val)}
                      className={`py-1 px-1.5 rounded border text-[10px] text-center ${
                        minSilenceDuration === p.val
                          ? 'bg-white border-blue-600 text-blue-700 font-semibold shadow-xs'
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
                  rows={2}
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="台本や発話テキストがあればここに入力してください。検出された発話区間に順次自動マッピングされます（未入力の場合は [発話 1] 等が付与されます）。"
                  className="w-full bg-white border border-gray-300 rounded p-1.5 text-[11px] outline-none resize-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {mode === 'whisper_api' && (
            <div className="space-y-2.5 p-2.5 bg-gray-50 rounded border border-gray-200">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-gray-700">OpenAI API Key:</label>
                  <span className="text-[10px] text-gray-600">※ ブラウザ内にのみ保存されます</span>
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs outline-none font-mono focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">認識言語</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 outline-none text-xs"
                  >
                    <option value="ja">日本語 (ja)</option>
                    <option value="en">英語 (en)</option>
                    <option value="zh">中国語 (zh)</option>
                    <option value="ko">韓国語 (ko)</option>
                    <option value="">自動検出</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">出力区間</label>
                  <select
                    value={outputTier}
                    onChange={(e) => setOutputTier(e.target.value as any)}
                    className="w-full bg-white border border-gray-300 rounded px-2 py-1 outline-none text-xs"
                  >
                    <option value="word">単語単位 (Word)</option>
                    <option value="utterance">文単位 (Utterance)</option>
                    <option value="both">両方 (Word & 文)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {mode === 'web_speech' && (
            <div className="p-2.5 bg-gray-50 rounded border border-gray-200 text-[11px] text-gray-600 space-y-2">
              <div>
                ブラウザ（Google ChromeまたはEdge推奨）の標準マイク音声認識を使用します。
                開始ボタンを押すと音声を再生しながら自動認識を行います。
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">認識言語</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1 outline-none text-xs"
                >
                  <option value="ja">日本語 (ja-JP)</option>
                  <option value="en">英語 (en-US)</option>
                </select>
              </div>
            </div>
          )}

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