import { useEffect, useState } from 'react';
import { createPhasteText, uploadPhasteFile } from '../api';
import { Phaste } from '../types';

interface AmbientCaptureOptions {
  onOptimisticCreate?: (tempPhaste: Phaste) => void;
  onSuccess: (phaste: Phaste, message: string, tempId?: string) => void;
  onError: (error: string, tempId?: string) => void;
}

function isLikelyUrl(text: string): boolean {
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(text.trim());
}

function extractClientHashtags(text: string): string[] {
  const matches = text.match(/#([a-zA-Z0-9_\-]+)/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
}

export function useAmbientCapture({
  onOptimisticCreate,
  onSuccess,
  onError,
}: AmbientCaptureOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // 1. Global Clipboard Paste Listener
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
            const tempId = `temp-${Date.now()}`;
            const isImg = file.type.startsWith('image/');
            const isVid = file.type.startsWith('video/');

            const optimistic: Phaste = {
              id: tempId,
              public_slug: 'pending',
              kind: isImg ? 'image' : isVid ? 'video' : 'text',
              status: 'processing',
              title: file.name || `Pasted File ${new Date().toLocaleTimeString()}`,
              content: null,
              tags: [],
              is_pinned: false,
              is_archived: false,
              is_trash: false,
              is_todo: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              metadata_context: {
                author: { name: 'You', label: 'You', is_owner: true, source: 'local' },
              },
            };

            onOptimisticCreate?.(optimistic);

            try {
              const res = await uploadPhasteFile(
                file,
                file.name || `Pasted File ${new Date().toLocaleTimeString()}`
              );
              onSuccess(
                res,
                `Captured ${isImg ? 'image' : 'file'} in haste!`,
                tempId
              );
            } catch (err: any) {
              onError(err.message || 'Failed to capture pasted file', tempId);
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

          const trimmed = text.trim();
          const tempId = `temp-${Date.now()}`;
          const isUrl = isLikelyUrl(trimmed);
          const isVideo =
            isUrl &&
            /youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|instagram\.com\/reel/i.test(
              trimmed
            );
          const kind = isVideo ? 'video' : isUrl ? 'link' : 'text';
          const firstLine = trimmed
            .split('\n')[0]
            .replace(/^#+\s*/, '')
            .slice(0, 60);
          const initialTitle = isUrl
            ? trimmed
            : firstLine || '📝 Untitled Phaste';

          const optimistic: Phaste = {
            id: tempId,
            public_slug: 'pending',
            kind: kind,
            status: 'processing',
            title: initialTitle,
            content: trimmed,
            tags: extractClientHashtags(trimmed),
            is_pinned: false,
            is_archived: false,
            is_trash: false,
            is_todo: trimmed.includes('- [ ]') || trimmed.includes('- [x]'),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata_context: {
              author: { name: 'You', label: 'You', is_owner: true, source: 'local' },
            },
          };

          // Deliver immediately (<1ms) so the UI renders without delay!
          onOptimisticCreate?.(optimistic);

          try {
            const res = await createPhasteText(trimmed);
            const kindLabel =
              res.kind === 'video'
                ? 'video link'
                : res.kind === 'link'
                ? 'link'
                : 'phaste';
            onSuccess(res, `Captured ${kindLabel} in haste!`, tempId);
          } catch (err: any) {
            onError(err.message || 'Failed to capture pasted text', tempId);
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
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const tempId = `temp-${Date.now()}-${i}`;
          const isImg = file.type.startsWith('image/');
          const isVid = file.type.startsWith('video/');

          const optimistic: Phaste = {
            id: tempId,
            public_slug: 'pending',
            kind: isImg ? 'image' : isVid ? 'video' : 'text',
            status: 'processing',
            title: file.name,
            content: null,
            tags: [],
            is_pinned: false,
            is_archived: false,
            is_trash: false,
            is_todo: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata_context: {
              author: { name: 'You', label: 'You', is_owner: true, source: 'local' },
            },
          };

          onOptimisticCreate?.(optimistic);

          try {
            const res = await uploadPhasteFile(file);
            onSuccess(res, `Dropped ${file.name} saved!`, tempId);
          } catch (err: any) {
            onError(err.message || 'Failed to upload dropped file', tempId);
          }
        }
        setIsSubmitting(false);
        return;
      }

      // Fallback for dropped text or URL
      const text = e.dataTransfer?.getData('text/plain');
      if (text && text.trim()) {
        const trimmed = text.trim();
        const tempId = `temp-${Date.now()}`;
        const isUrl = isLikelyUrl(trimmed);
        const optimistic: Phaste = {
          id: tempId,
          public_slug: 'pending',
          kind: isUrl ? 'link' : 'text',
          status: 'processing',
          title: isUrl ? trimmed : trimmed.split('\n')[0].slice(0, 60),
          content: trimmed,
          tags: extractClientHashtags(trimmed),
          is_pinned: false,
          is_archived: false,
          is_trash: false,
          is_todo: trimmed.includes('- [ ]'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata_context: {
            author: { name: 'You', label: 'You', is_owner: true, source: 'local' },
          },
        };

        onOptimisticCreate?.(optimistic);
        setIsSubmitting(true);
        try {
          const res = await createPhasteText(trimmed);
          onSuccess(res, 'Dropped content saved!', tempId);
        } catch (err: any) {
          onError(err.message || 'Failed to capture dropped content', tempId);
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
  }, [onOptimisticCreate, onSuccess, onError]);

  return { isDragging, isSubmitting };
}
