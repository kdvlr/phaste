import { useEffect, useState } from 'react';
import { createPhasteText, uploadPhasteFile } from '../api';
import { Phaste } from '../types';

interface AmbientCaptureOptions {
  onSuccess: (phaste: Phaste, message: string) => void;
  onError: (error: string) => void;
}

export function useAmbientCapture({ onSuccess, onError }: AmbientCaptureOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // 1. Global Clipboard Paste Listener (ADR 0011)
    const handlePaste = async (e: ClipboardEvent) => {
      // If typing in an input/textarea and pasting plain text, let normal paste happen
      const activeTag = document.activeElement?.tagName.toLowerCase();
      const isInputFocused = activeTag === 'input' || activeTag === 'textarea';

      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      // Check for Image or File blob first (always capture image even if input is focused)
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            setIsSubmitting(true);
            try {
              const res = await uploadPhasteFile(file, `Pasted File ${new Date().toLocaleTimeString()}`);
              onSuccess(res, `Captured ${file.type.startsWith('image/') ? 'image' : 'file'} in haste!`);
            } catch (err: any) {
              onError(err.message || 'Failed to capture pasted file');
            } finally {
              setIsSubmitting(false);
            }
            return;
          }
        }
      }

      // Check for Text payload
      if (!isInputFocused) {
        const text = e.clipboardData.getData('text/plain');
        if (text && text.trim()) {
          e.preventDefault();
          setIsSubmitting(true);
          try {
            const res = await createPhasteText(text.trim());
            const kindLabel = res.kind === 'video' ? 'video link' : res.kind === 'link' ? 'link' : 'note';
            onSuccess(res, `Captured ${kindLabel} in haste!`);
          } catch (err: any) {
            onError(err.message || 'Failed to capture pasted text');
          } finally {
            setIsSubmitting(false);
          }
        }
      }
    };

    // 2. Global Drag-and-Drop Listener
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only dismiss if leaving window
      if (e.clientX === 0 || e.clientY === 0) {
        setIsDragging(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        setIsSubmitting(true);
        try {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const res = await uploadPhasteFile(file);
            onSuccess(res, `Dropped ${file.name} saved!`);
          }
        } catch (err: any) {
          onError(err.message || 'Failed to upload dropped file');
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      // Fallback for dropped text or URL
      const text = e.dataTransfer?.getData('text/plain');
      if (text && text.trim()) {
        setIsSubmitting(true);
        try {
          const res = await createPhasteText(text.trim());
          onSuccess(res, 'Dropped content saved!');
        } catch (err: any) {
          onError(err.message || 'Failed to capture dropped content');
        } finally {
          setIsSubmitting(false);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onSuccess, onError]);

  return { isDragging, isSubmitting };
}
