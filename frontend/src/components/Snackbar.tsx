import React, { useEffect, useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { SnackbarMessage } from '../types';

interface SnackbarProps {
  message: SnackbarMessage | null;
  onDismiss: () => void;
}

export const Snackbar: React.FC<SnackbarProps> = ({ message, onDismiss }) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(20);

  useEffect(() => {
    if (!message) return;

    const duration = message.duration ?? 4000;
    if (duration <= 0) return;

    setRemainingSeconds(Math.ceil(duration / 1000));

    // Countdown interval for visual remaining seconds display
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-dismiss timeout
    const dismissTimer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(dismissTimer);
    };
  }, [message?.id, message?.duration, onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200 select-none">
      <div className="relative overflow-hidden flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#2d2421] text-[#efebe9] border border-[#4e342e] shadow-2xl max-w-md">
        <span className="text-xs font-medium">{message.text}</span>

        {message.actionLabel && message.onAction && (
          <button
            onClick={() => {
              message.onAction?.();
              onDismiss();
            }}
            className="flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#8d6e63] text-white hover:bg-[#a1887f] active:scale-95 transition-all shadow-sm"
          >
            <RotateCcw className="w-3 h-3" />
            <span>
              {message.actionLabel}{' '}
              {message.duration && message.duration >= 5000 ? `(${remainingSeconds}s)` : ''}
            </span>
          </button>
        )}

        <button
          onClick={onDismiss}
          className="p-1 rounded-full text-[#a1887f] hover:text-[#efebe9] hover:bg-white/10 transition"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Subtle Progress Bar */}
        {message.duration && message.duration > 0 && (
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-[#8d6e63] transition-all ease-linear"
            style={{
              width: `${(remainingSeconds / (message.duration / 1000)) * 100}%`,
              transitionDuration: '1000ms',
            }}
          />
        )}
      </div>
    </div>
  );
};
