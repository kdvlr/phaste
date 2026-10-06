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
  Check
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
  onImageClick: (phaste: Phaste) => void;
  onToast: (msg: string) => void;
}

export const PhasteCard: React.FC<PhasteCardProps> = ({
  phaste,
  onPinToggle,
  onDelete,
  onImageClick,
  onToast,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/s/${phaste.public_slug}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    onToast('Public share link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isProcessing = phaste.status === 'processing';
  const isFailed = phaste.status === 'failed';
  const og = phaste.metadata_context?.og;

  return (
    <div
      className={`group relative rounded-md3-xl bg-md3-surface-container border transition-all duration-200 overflow-hidden flex flex-col ${
        phaste.is_pinned
          ? 'border-amber-500/30 shadow-md3-2 ring-1 ring-amber-500/20'
          : 'border-md3-outline-variant/20 hover:border-md3-outline-variant/40 shadow-md3-1 hover:shadow-md3-2'
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Status Indicator */}
          {isProcessing ? (
            <span className="flex items-center gap-1.5 text-[11px] text-md3-primary font-medium animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Enriching...</span>
            </span>
          ) : isFailed ? (
            <span className="flex items-center gap-1 text-[11px] text-md3-error font-medium" title={phaste.error_message || ''}>
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Failed</span>
            </span>
          ) : null}

          {phaste.title && (
            <h4 className="text-sm font-medium text-md3-on-surface truncate">
              {phaste.title}
            </h4>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {/* Pin */}
          <button
            onClick={() => onPinToggle(phaste.id, phaste.is_pinned)}
            className={`p-1.5 rounded-full transition-colors ${
              phaste.is_pinned
                ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
                : 'text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-md3-surface-container-high'
            }`}
            title={phaste.is_pinned ? 'Unpin' : 'Pin to top'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>

          {/* Copy Public Link */}
          <button
            onClick={handleCopyShare}
            className="p-1.5 rounded-full text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-md3-surface-container-high transition-colors"
            title="Copy public share URL"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(phaste.id)}
            className="p-1.5 rounded-full text-md3-on-surface-variant hover:text-md3-error hover:bg-md3-error/10 transition-colors"
            title="Delete phaste"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="px-4 py-2 flex-1">
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
            onClick={() => onImageClick(phaste)}
            className="relative rounded-md3-md overflow-hidden bg-black/40 cursor-pointer group/img aspect-auto max-h-72 flex items-center justify-center border border-md3-outline-variant/10"
          >
            <img
              src={getMediaUrl(phaste.media_path)}
              alt={phaste.title || 'Image'}
              className="w-full h-auto max-h-72 object-contain group-hover/img:scale-[1.01] transition-transform duration-200"
              loading="lazy"
            />
            {phaste.ocr_transcript && (
              <span className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-[10px] text-white font-medium border border-white/10">
                <FileText className="w-2.5 h-2.5 text-md3-primary" />
                <span>OCR Indexed</span>
              </span>
            )}
          </div>
        )}

        {/* Kind: LINK */}
        {phaste.kind === 'link' && (
          <div className="rounded-md3-md bg-md3-surface-container-lowest border border-md3-outline-variant/20 overflow-hidden">
            {og?.image_url && (
              <div className="aspect-[2/1] w-full overflow-hidden bg-black/20">
                <img
                  src={og.image_url}
                  alt={og.title || 'Preview'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[11px] text-md3-on-surface-variant font-medium">
                {og?.favicon_url && (
                  <img
                    src={og.favicon_url}
                    alt=""
                    className="w-3.5 h-3.5 rounded-sm object-contain"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                )}
                <span className="truncate">{og?.site_name || phaste.source_url}</span>
              </div>
              <a
                href={phaste.source_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-md3-primary hover:underline line-clamp-2"
              >
                {phaste.title || og?.title || phaste.source_url}
              </a>
              {og?.description && (
                <p className="text-[11px] text-md3-on-surface-variant line-clamp-2 leading-relaxed">
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

      {/* Card Footer: Metadata Context */}
      <div className="px-4 py-2.5 bg-md3-surface-container-low/40 border-t border-md3-outline-variant/10 mt-2">
        <MetadataBadge createdAt={phaste.created_at} metadata={phaste.metadata_context || {}} />
      </div>
    </div>
  );
};
