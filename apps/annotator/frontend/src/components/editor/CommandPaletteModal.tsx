'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Play,
  Pause,
  RotateCcw,
  SplitSquareVertical,
  Scissors,
  Layers,
  Activity,
  Sliders,
  Download,
  Copy,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Mic,
  HelpCircle,
  Undo2,
  Redo2,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  category: 'PLAYBACK' | 'EDIT' | 'DISPLAY' | 'ANALYSIS' | 'SYSTEM';
  title: string;
  description?: string;
  keywords: string[];
  shortcut?: string;
  icon?: React.ReactNode;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  commands,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands by search term (case-insensitive, matching title or keywords)
  const filteredCommands = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return commands;
    return commands.filter((cmd) => {
      if (cmd.title.toLowerCase().includes(query)) return true;
      if (cmd.description && cmd.description.toLowerCase().includes(query)) return true;
      return cmd.keywords.some((kw) => kw.toLowerCase().includes(query));
    });
  }, [commands, search]);

  // Reset search and selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
    }
  }, [isOpen]);

  // Adjust selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredCommands[selectedIndex];
      if (target) {
        onClose();
        target.action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-[#111111]/70 backdrop-blur-none p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white border-2 border-[#111111] flex flex-col shadow-2xl overflow-hidden text-[#111111]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-3.5 py-2.5 border-b-2 border-[#111111] bg-white">
          <Search className="w-4 h-4 text-[#777780] mr-2 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="コマンドを検索 (例: play, split, slice, vad, zoom, pitch, tsv)..."
            className="w-full bg-transparent text-base sm:text-sm font-semibold outline-none text-[#111111] placeholder:text-[#aaaaaf] font-sans"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-[#f0f0f4] border border-[#e0e0e6] text-[#777780] uppercase tracking-wider ml-2 flex-shrink-0">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto divide-y divide-[#f0f0f4] p-1 bg-white">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    onClose();
                    cmd.action();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors text-xs select-none ${
                    isSelected
                      ? 'bg-[#111111] text-white'
                      : 'hover:bg-[#f0f0f4] text-[#111111]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className={`${isSelected ? 'text-[#E30613]' : 'text-[#777780]'}`}>
                      {cmd.icon || (
                        cmd.category === 'PLAYBACK' ? <Play className="w-3.5 h-3.5" /> :
                        cmd.category === 'EDIT' ? <Scissors className="w-3.5 h-3.5" /> :
                        cmd.category === 'DISPLAY' ? <Activity className="w-3.5 h-3.5" /> :
                        cmd.category === 'ANALYSIS' ? <Sliders className="w-3.5 h-3.5" /> :
                        <Layers className="w-3.5 h-3.5" />
                      )}
                    </span>
                    <span className="font-bold truncate">{cmd.title}</span>
                    {cmd.description && (
                      <span
                        className={`text-[11px] truncate ${
                          isSelected ? 'text-gray-300' : 'text-[#777780]'
                        }`}
                      >
                        {cmd.description}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                    <span
                      className={`text-[9px] font-mono uppercase px-1 py-0.2 border ${
                        isSelected
                          ? 'border-gray-600 bg-gray-900 text-gray-300'
                          : 'border-[#e0e0e6] bg-[#f0f0f4] text-[#777780]'
                      }`}
                    >
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd
                        className={`font-mono text-[10px] px-1.5 py-0.5 border ${
                          isSelected
                            ? 'bg-black border-gray-700 text-white font-bold'
                            : 'bg-white border-[#111111] text-[#111111]'
                        }`}
                      >
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs font-mono text-[#777780]">
              一致するコマンドが見つかりません: &ldquo;{search}&rdquo;
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-3 py-1.5 bg-[#f0f0f4] border-t border-[#e0e0e6] text-[10px] text-[#777780] font-mono flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span>↑↓: 移動</span>
            <span>Enter: 実行</span>
            <span>Esc: 閉じる</span>
          </div>
          <span className="font-sans font-medium text-[#111111]">
            ショートカット: <kbd className="font-mono bg-white border border-[#111111] px-1 py-0.2">Ctrl+K</kbd> または <kbd className="font-mono bg-white border border-[#111111] px-1 py-0.2">:</kbd>
          </span>
        </div>
      </div>
    </div>
  );
};
