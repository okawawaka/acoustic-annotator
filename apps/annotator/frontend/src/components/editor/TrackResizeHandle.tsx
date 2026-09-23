import React from 'react';

interface TrackResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  isResizing?: boolean;
  label?: string;
}

export const TrackResizeHandle: React.FC<TrackResizeHandleProps> = ({
  onMouseDown,
  isResizing = false,
  label,
}) => {
  return (
    <div
      onMouseDown={onMouseDown}
      className={`group relative h-1.5 w-full cursor-row-resize select-none transition-colors z-10 flex items-center justify-center ${
        isResizing ? 'bg-[#E30613]' : 'bg-[#e0e0e6] hover:bg-[#111111]'
      }`}
      title={label ? `${label} の高さを変更（ドラッグ）` : 'トラックの高さをドラッグで変更'}
    >
      {/* Center grip accent */}
      <div
        className={`h-0.5 w-8 rounded-full transition-colors ${
          isResizing ? 'bg-white' : 'bg-[#777780] group-hover:bg-white'
        }`}
      />
    </div>
  );
};
