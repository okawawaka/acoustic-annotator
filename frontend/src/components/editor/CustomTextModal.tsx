'use client';

import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';

interface CustomTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlignText: (params: { text: string; tierName: string; splitBy: string }) => Promise<void>;
  isLoading: boolean;
}

export const CustomTextModal: React.FC<CustomTextModalProps> = ({
  isOpen,
  onClose,
  onAlignText,
  isLoading,
}) => {
  const [text, setText] = useState('');
  const [tierName, setTierName] = useState('Script');
  const [splitBy, setSplitBy] = useState('line');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      alert('テキストを入力してください。');
      return;
    }
    await onAlignText({
      text,
      tierName,
      splitBy,
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
              書き起こしテキスト（台本・歌詞・発話内容）
            </label>
            <textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ここに手動で起こしたテキストを貼り付けてください。&#10;改行ごとに1つの区間として自動配置されます。"
              className="w-full bg-white border border-gray-300 rounded p-2 text-xs font-mono outline-none resize-none focus:border-gray-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-medium text-gray-700 mb-1">分割単位</label>
              <select
                value={splitBy}
                onChange={(e) => setSplitBy(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 outline-none"
              >
                <option value="line">改行ごと (文単位)</option>
                <option value="word">単語・空白ごと</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">新規ティア名</label>
              <input
                type="text"
                value={tierName}
                onChange={(e) => setTierName(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 outline-none"
                placeholder="Script"
              />
            </div>
          </div>

          <div className="text-[11px] text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
            音声の時間に合わせて区間が自動生成されます。生成後、波形を見ながら境界線をドラッグして位置を微調整できます。
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