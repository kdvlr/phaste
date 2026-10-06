import React from 'react';
import { X } from 'lucide-react';
import { SnackbarMessage } from '../types';

interface SnackbarProps {
  message: SnackbarMessage | null;
  onDismiss: () => void;
}

export const Snackbar: React.FC<SnackbarProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-md3-surface-container-highest text-md3-on-surface border border-md3-outline-variant/40 shadow-md3-3 max-w-md">
        <span className="text-xs font-medium">{message.text}</span>
        {message.actionLabel && message.onAction && (
          <button
            onClick={() => {
              message.onAction?.();
              onDismiss();
            }}
            className="text-xs font-semibold text-md3-primary hover:underline px-1"
          >
            {message.actionLabel}
          </button>
        )}
        <button
          onClick={onDismiss}
          className="p-1 rounded-full text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-white/10 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
