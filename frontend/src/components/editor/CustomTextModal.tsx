'use client';

import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';

interface CustomTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlignText: (params: { text: string; tierName: string; splitBy: string; targetMode: 'existing' | 'new' }) => Promise<void>;
  isLoading: boolean;
  existingTierNames: string[];
}

export const CustomTextModal: React.FC<CustomTextModalProps> = ({
  isOpen,
  onClose,
  onAlignText,
  isLoading,
  existingTierNames,
}) => {
  const [text, setText] = useState('');
  const [targetMode, setTargetMode] = useState<'existing' | 'new'>('existing');
  const [selectedTier, setSelectedTier] = useState(existingTierNames.includes('Word') ? 'Word' : (existingTierNames[0] || 'Word'));
  const [newTierName, setNewTierName] = useState('Script');
  const [splitBy, setSplitBy] = useState('line');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      alert('テキストを入力してください。');
      return;
    }
    const targetTierName = targetMode === 'existing' ? selectedTier : newTierName;
    await onAlignText({
      text,
      tierName: targetTierName,
      splitBy,
      targetMode,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden text-gray-900 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-1.5 font-semibold text-gray-800">
            <FileText className="w-4 h-4" />
            <span>台本テキストから自動アノテーション</span>
          </div>
          <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              書き起こしテキスト（台本・発話内容）
            </label>
            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ここに手動で起こしたテキストを貼り付けてください。&#10;改行ごとに1つの区間として自動配置されます。"
              className="w-full bg-white border border-gray-300 rounded p-2 text-xs font-mono outline-none resize-none focus:border-gray-500"
            />
          </div>

          {/* Target Tier Selection */}
          <div>
            <label className="block font-medium text-gray-700 mb-1">区間を追加するティア</label>
            <div className="flex items-center space-x-3 mb-1.5">
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="radio"
                  name="targetMode"
                  checked={targetMode === 'existing'}
                  onChange={() => setTargetMode('existing')}
                />
                <span>既存のティア (Wordなど)</span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="radio"
                  name="targetMode"
                  checked={targetMode === 'new'}
                  onChange={() => setTargetMode('new')}
                />
                <span>新規ティアを作成</span>
              </label>
            </div>

            {targetMode === 'existing' ? (
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 outline-none"
              >
                {existingTierNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={newTierName}
                onChange={(e) => setNewTierName(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 outline-none"
                placeholder="Script"
              />
            )}
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">分割単位</label>
            <select
              value={splitBy}
              onChange={(e) => setSplitBy(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 outline-none"
            >
              <option value="char">一文字ずつ (モーラ・音素単位)</option>
              <option value="word">単語・空白ごと</option>
              <option value="line">改行ごと (文単位)</option>
            </select>
          </div>

          <div className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
            {splitBy === 'char'
              ? '音声波形の発音エネルギーとAI解析に基づき、一文字ずつの実際の発声区間に自動配置します。'
              : splitBy === 'word'
              ? '音声波形と発話タイミングを解析し、単語ごとの発話区間に自動配置します。'
              : '音声波形と発話タイミングを解析し、文・行ごとの発話区間に自動配置します。'}
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
              {isLoading ? '生成中...' : '区間を作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};