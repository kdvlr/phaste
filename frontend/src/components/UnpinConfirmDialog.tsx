import React, { useEffect, useRef } from 'react';
import { PinOff, FileText, Image as ImageIcon, Video as VideoIcon, Link as LinkIcon, Code2 } from 'lucide-react';
import { Phaste } from '../types';

interface UnpinConfirmDialogProps {
  isOpen: boolean;
  phaste: Phaste | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const UnpinConfirmDialog: React.FC<UnpinConfirmDialogProps> = ({
  isOpen,
  phaste,
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

  if (!isOpen || !phaste) return null;

  // Resolve preview title or snippet
  const getPreviewText = (): string => {
    if (phaste.title) return phaste.title;
    if (phaste.kind === 'link' && phaste.source_url) return phaste.source_url;
    if (phaste.kind === 'image') {
      const fileName = phaste.metadata_context?.file_name || phaste.media_path?.split('/').pop();
      return fileName || phaste.ocr_transcript || 'Image phaste';
    }
    if (phaste.kind === 'video') {
      const fileName = phaste.metadata_context?.file_name || phaste.media_path?.split('/').pop();
      return fileName || phaste.source_url || 'Video phaste';
    }
    if (phaste.content) {
      const firstLine = phaste.content.trim().split('\n')[0];
      return firstLine.slice(0, 80) + (firstLine.length > 80 ? '...' : '');
    }
    return 'Pinned phaste';
  };

  const getKindIcon = () => {
    switch (phaste.kind) {
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
      case 'video':
        return <VideoIcon className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
      case 'link':
        return <LinkIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
      case 'richtext':
        return <Code2 className="w-3.5 h-3.5 text-cyan-500 shrink-0" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    }
  };

  const previewText = getPreviewText();

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unpin-dialog-title"
    >
      <div
        className="relative w-full max-w-sm rounded-[28px] bg-md3-surface-container-high border border-md3-outline-variant/30 p-6 shadow-md3-3 flex flex-col items-center animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tonal Icon Container */}
        <div className="w-12 h-12 rounded-full bg-amber-500/15 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3.5 shadow-xs">
          <PinOff className="w-6 h-6 stroke-[2.2]" />
        </div>

        {/* Title */}
        <h3
          id="unpin-dialog-title"
          className="text-lg font-bold text-md3-on-surface text-center tracking-tight"
        >
          Unpin this phaste?
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-md3-on-surface-variant text-center mt-1.5 leading-relaxed">
          This item will be removed from the pinned section at the top. It will stay in your timeline.
        </p>

        {/* Snippet preview pill */}
        <div className="mt-3.5 w-full px-3 py-2 rounded-xl bg-md3-surface-container-low border border-md3-outline-variant/25 flex items-center gap-2 overflow-hidden">
          {getKindIcon()}
          <span className="text-xs font-mono text-md3-on-surface truncate flex-1">
            {previewText}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-6 w-full">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold text-md3-primary hover:bg-md3-primary/10 active:bg-md3-primary/20 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white dark:bg-amber-400 dark:text-neutral-950 dark:hover:bg-amber-300 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <PinOff className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Unpin</span>
          </button>
        </div>
      </div>
    </div>
  );
};
