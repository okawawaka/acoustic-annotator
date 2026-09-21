'use client';

import React, { useState } from 'react';
import { QUICK_IPA_SYMBOLS, IPA_CATEGORIES } from '@/constants/ipa';
import { Languages, ChevronDown, ChevronUp, X, Sparkles } from 'lucide-react';

interface IpaPaletteBarProps {
  onInsertSymbol: (symbol: string) => void;
  onClose?: () => void;
  selectedLabel?: string | null;
}

export const IpaPaletteBar: React.FC<IpaPaletteBarProps> = ({
  onInsertSymbol,
  onClose,
  selectedLabel,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);

  return (
    <div className="bg-white border-t border-b border-[#111111] flex flex-col flex-shrink-0 z-20 select-none">
      {/* Quick IPA Ribbon */}
      <div className="h-9 px-3 flex items-center justify-between bg-[#f8f8fa] text-[#111111] text-xs">
        <div className="flex items-center space-x-2 flex-shrink-0 mr-3">
          <div className="flex items-center space-x-1 font-bold text-[11px] tracking-wider uppercase text-[#111111]">
            <Languages className="w-3.5 h-3.5 text-[#E30613]" />
            <span>IPA Quick</span>
          </div>
          {selectedLabel !== undefined && (
            <span className="text-[10px] text-gray-500 font-mono hidden sm:inline">
              (選択区間に挿入)
            </span>
          )}
        </div>

        {/* Horizontal Quick Symbols list */}
        <div className="flex-1 flex items-center space-x-1 overflow-x-auto py-1 scrollbar-thin">
          {QUICK_IPA_SYMBOLS.map((item) => (
            <button
              key={item.sym}
              onClick={() => onInsertSymbol(item.sym)}
              className="px-2 py-0.5 min-w-[28px] h-6 bg-white hover:bg-[#111111] hover:text-white border border-[#e0e0e6] hover:border-[#111111] font-mono text-sm font-semibold rounded-none transition-colors shadow-xs"
              title={`${item.sym} : ${item.name}`}
            >
              {item.sym}
            </button>
          ))}
        </div>

        {/* Expand / Collapse & Close buttons */}
        <div className="flex items-center space-x-1.5 flex-shrink-0 ml-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center space-x-1 px-2 py-1 text-[11px] font-bold border transition-colors ${
              isExpanded
                ? 'bg-[#111111] text-white border-[#111111]'
                : 'bg-white hover:bg-gray-100 text-[#111111] border-[#111111]'
            }`}
            title="すべてのIPA音声記号パレットを展開"
          >
            <span>全記号</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-[#111111] hover:bg-gray-200 transition-colors"
              title="IPAパレットを閉じる"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Categorized IPA Drawer */}
      {isExpanded && (
        <div className="p-3 bg-white border-t border-[#e0e0e6] flex flex-col space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Category Tabs */}
          <div className="flex items-center space-x-1 border-b border-[#e0e0e6] pb-1 overflow-x-auto">
            {IPA_CATEGORIES.map((cat, idx) => (
              <button
                key={cat.category}
                onClick={() => setActiveCategoryIdx(idx)}
                className={`px-3 py-1 text-xs font-bold transition-colors whitespace-nowrap ${
                  activeCategoryIdx === idx
                    ? 'border-b-2 border-[#E30613] text-[#111111]'
                    : 'text-gray-500 hover:text-[#111111]'
                }`}
              >
                {cat.category}
              </button>
            ))}
          </div>

          {/* Category Symbols Grid */}
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5 pt-1 max-h-48 overflow-y-auto p-1">
            {IPA_CATEGORIES[activeCategoryIdx]?.symbols.map((item) => (
              <button
                key={item.sym}
                onClick={() => onInsertSymbol(item.sym)}
                className="flex flex-col items-center justify-center p-1.5 bg-[#f8f8fa] hover:bg-[#111111] hover:text-white border border-[#e0e0e6] hover:border-[#111111] transition-all group"
                title={`${item.sym} : ${item.name}`}
              >
                <span className="font-mono text-base font-bold leading-tight">{item.sym}</span>
                <span className="text-[9px] text-gray-500 group-hover:text-gray-300 truncate w-full text-center mt-0.5">
                  {item.name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
