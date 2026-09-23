import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastNotificationProps {
  message: string | null;
  onClose?: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="flex items-center space-x-2 bg-[#111111] text-white px-3.5 py-2 border-2 border-white shadow-xl text-xs font-mono font-bold tracking-tight">
        <span className="w-2 h-2 rounded-full bg-[#E30613] inline-block animate-pulse" />
        <span>{message}</span>
      </div>
    </div>
  );
};
