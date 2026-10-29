import React, { useEffect, useRef } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

interface EmptyTrashConfirmDialogProps {
  isOpen: boolean;
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const EmptyTrashConfirmDialog: React.FC<EmptyTrashConfirmDialogProps> = ({
  isOpen,
  count,
  onConfirm,
  onCancel,
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Keyboard navigation: Escape cancels, Enter confirms
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  // Focus the confirm button when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[75] bg-black/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="empty-trash-dialog-title"
    >
      <div
        className="relative w-full max-w-sm rounded-[28px] bg-md3-surface-container-high border border-md3-outline-variant/30 p-6 shadow-md3-3 flex flex-col items-center animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tonal Warning Icon */}
        <div className="w-12 h-12 rounded-full bg-rose-500/15 dark:bg-rose-400/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3.5 shadow-xs">
          <Trash2 className="w-6 h-6 stroke-[2.2]" />
        </div>

        {/* Dialog Title */}
        <h3
          id="empty-trash-dialog-title"
          className="text-lg font-semibold text-md3-on-surface text-center tracking-tight mb-2"
        >
          Empty Trash?
        </h3>

        {/* Informational Message */}
        <p className="text-sm text-md3-on-surface-variant text-center leading-relaxed mb-4">
          Permanently delete {count > 0 ? (
            <span className="font-semibold text-md3-on-surface">{count} {count === 1 ? 'phaste' : 'phastes'}</span>
          ) : (
            'all phastes'
          )} currently in the Trash?
        </p>

        {/* Permanent Warning Box */}
        <div className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs mb-6">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>This action is permanent and cannot be undone.</span>
        </div>

        {/* MD3 Dialog Action Buttons */}
        <div className="w-full flex items-center justify-end space-x-2 pt-1 border-t border-md3-outline-variant/20">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-full text-sm font-medium text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-md3-on-surface/5 active:bg-md3-on-surface/10 transition-colors"
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-full text-sm font-medium bg-[#b3261e] hover:bg-[#8c1d18] active:bg-[#601410] text-white shadow-xs hover:shadow-md transition-all flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-[#b3261e]/50 focus:ring-offset-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Empty Trash</span>
          </button>
        </div>
      </div>
    </div>
  );
};
