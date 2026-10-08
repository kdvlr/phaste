import React, { useState } from 'react';
import {
  Pin,
  Trash2,
  Share2,
  ExternalLink,
  Loader2,
  FileText,
  AlertCircle,
  Copy,
  Check,
  Maximize2
} from 'lucide-react';
import { Phaste } from '../types';
import { MetadataBadge } from './MetadataBadge';
import { CodeBlock } from './CodeBlock';
import { VideoPlayer } from './VideoPlayer';
import { getMediaUrl } from '../api';

interface PhasteCardProps {
  phaste: Phaste;
  onPinToggle: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  onSelect: (phaste: Phaste) => void;
  onImageClick?: (phaste: Phaste) => void;
  onInspect?: (phaste: Phaste) => void;
  onToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const PhasteCard: React.FC<PhasteCardProps> = ({
  phaste,
  onPinToggle,
  onDelete,
  onSelect,
  onImageClick,
  onInspect,
  onToast,
}) => {
  const [copiedContent, setCopiedContent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const getContentToCopy = (): string => {
    if (phaste.kind === 'text' || phaste.kind === 'richtext') {
      return phaste.content || '';
    }
    if (phaste.kind === 'link') {
      return phaste.source_url || phaste.content || '';
    }
    if (phaste.kind === 'image') {
      if (phaste.ocr_transcript) return phaste.ocr_transcript;
      if (phaste.media_path) return `${window.location.origin}${getMediaUrl(phaste.media_path)}`;
    }
    if (phaste.kind === 'video') {
      if (phaste.source_url) return phaste.source_url;
      if (phaste.media_path) return `${window.location.origin}${getMediaUrl(phaste.media_path)}`;
    }
    return phaste.content || phaste.source_url || '';
  };

  const handleCopyContent = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = getContentToCopy();
    if (!text) {
      onToast('No content to copy', 'info');
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedContent(true);
    onToast('Content copied to clipboard!', 'success');
    setTimeout(() => setCopiedContent(false), 2000);
  };

  const handleCopyShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/sh/${phaste.public_slug}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    onToast('Public share link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isProcessing = phaste.status === 'processing';
  const isFailed = phaste.status === 'failed';
  const og = phaste.metadata_context?.og;

  return (
    <div
      onClick={() => onSelect(phaste)}
      className={`group relative rounded-md3-xl bg-md3-surface-container border transition-all duration-200 overflow-hidden flex flex-col cursor-pointer ${
        phaste.is_pinned
          ? 'border-amber-500/40 shadow-md3-2 ring-1 ring-amber-500/30'
          : 'border-md3-outline-variant/30 hover:border-md3-outline-variant/60 shadow-md3-1 hover:shadow-md3-2'
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          {/* Status Indicator */}
          {isProcessing ? (
            <span className="flex items-center gap-1.5 text-xs text-md3-primary font-medium animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Enriching...</span>
            </span>
          ) : isFailed ? (
            <span className="flex items-center gap-1 text-xs text-md3-error font-medium" title={phaste.error_message || ''}>
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Failed</span>
            </span>
          ) : null}

          {phaste.title ? (
            <h4 className="text-sm font-semibold text-md3-on-surface truncate">
              {phaste.title}
            </h4>
          ) : (
            <span className="text-[11px] uppercase font-bold text-md3-outline tracking-wider">
              {phaste.kind}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          {/* Pin */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPinToggle(phaste.id, phaste.is_pinned);
            }}
            className={`p-1 rounded-full min-w-[30px] min-h-[30px] flex items-center justify-center transition-colors ${
              phaste.is_pinned
                ? 'text-amber-500 bg-amber-500/15 hover:bg-amber-500/25'
                : 'text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-md3-surface-container-high'
            }`}
            title={phaste.is_pinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>

          {/* COPY CONTENT BUTTON */}
          <button
            onClick={handleCopyContent}
            className="p-1 rounded-full min-w-[30px] min-h-[30px] flex items-center justify-center text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-md3-surface-container-high transition-colors"
            title="Copy actual paste content (text, link, or media)"
          >
            {copiedContent ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* COPY PUBLIC SHARE URL */}
          <button
            onClick={handleCopyShare}
            className="p-1 rounded-full min-w-[30px] min-h-[30px] flex items-center justify-center text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-md3-surface-container-high transition-colors"
            title="Copy public share URL (/sh/slug)"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 stroke-[2.5]" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>

          {/* Expand to Big 4/5th Modal */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(phaste);
            }}
            className="p-1 rounded-full min-w-[30px] min-h-[30px] flex items-center justify-center text-md3-on-surface-variant hover:text-md3-primary hover:bg-md3-primary/10 transition-colors"
            title="Expand into full 4/5 view with metadata"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(phaste.id);
            }}
            className="p-1 rounded-full min-w-[30px] min-h-[30px] flex items-center justify-center text-md3-on-surface-variant hover:text-md3-error hover:bg-md3-error/10 transition-colors"
            title="Delete phaste"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="px-3 py-1 flex-1">
        {/* Kind: VIDEO */}
        {phaste.kind === 'video' && (
          <VideoPlayer
            mediaPath={phaste.media_path}
            thumbnailPath={phaste.thumbnail_path}
            sourceUrl={phaste.source_url}
            status={phaste.status}
            title={phaste.title}
          />
        )}

        {/* Kind: IMAGE */}
        {phaste.kind === 'image' && phaste.media_path && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect(phaste);
            }}
            className="relative rounded-md3-md overflow-hidden bg-black/40 cursor-pointer group/img aspect-auto max-h-72 flex items-center justify-center border border-md3-outline-variant/10"
          >
            <img
              src={getMediaUrl(phaste.media_path)}
              alt={phaste.title || 'Image'}
              className="w-full h-auto max-h-72 object-contain group-hover/img:scale-[1.01] transition-transform duration-200"
              loading="lazy"
            />
            {phaste.ocr_transcript && (
              <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur text-xs text-white font-medium border border-white/15 shadow-sm">
                <FileText className="w-3.5 h-3.5 text-md3-primary" />
                <span>OCR Indexed</span>
              </span>
            )}
          </div>
        )}

        {/* Kind: LINK */}
        {phaste.kind === 'link' && (
          <div className="rounded-md3-md bg-md3-surface-container-lowest border border-md3-outline-variant/30 overflow-hidden shadow-sm">
            {og?.image_url && (
              <div className="aspect-[2/1] w-full overflow-hidden bg-black/10 dark:bg-black/30">
                <img
                  src={og.image_url}
                  alt={og.title || 'Preview'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-3.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-xs text-md3-on-surface-variant font-medium">
                {og?.favicon_url && (
                  <img
                    src={og.favicon_url}
                    alt=""
                    className="w-4 h-4 rounded-sm object-contain"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                )}
                <span className="truncate">{og?.site_name || phaste.source_url}</span>
              </div>
              <a
                href={phaste.source_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-semibold text-md3-primary hover:underline line-clamp-2 leading-snug"
              >
                {phaste.title || og?.title || phaste.source_url}
              </a>
              {og?.description && (
                <p className="text-xs text-md3-on-surface-variant line-clamp-2 leading-relaxed">
                  {og.description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Kind: TEXT or RICHTEXT */}
        {(phaste.kind === 'text' || phaste.kind === 'richtext') && phaste.content && (
          <CodeBlock content={phaste.content} />
        )}
      </div>

      {/* Card Footer: Metadata Context (Compact single-line) */}
      <div className="px-3 py-1.5 bg-md3-surface-container-low/50 border-t border-md3-outline-variant/15 mt-1">
        <MetadataBadge
          createdAt={phaste.created_at}
          metadata={phaste.metadata_context || {}}
          onInspect={() => onSelect(phaste)}
        />
      </div>
    </div>
  );
};
