import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  Download,
  FileText,
  MapPin,
  Globe,
  User,
  Monitor,
  Clock,
  HardDrive,
  Code,
  Image as ImageIcon,
  Video as VideoIcon,
  Link as LinkIcon,
  ChevronDown,
  ChevronRight,
  Pin,
  CheckCircle2
} from 'lucide-react';
import { Phaste } from '../types';
import { getMediaUrl } from '../api';

interface PhasteDetailModalProps {
  phaste: Phaste | null;
  isOpen: boolean;
  onClose: () => void;
  onPinToggle?: (id: string, current: boolean) => void;
  onToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const PhasteDetailModal: React.FC<PhasteDetailModalProps> = ({
  phaste,
  isOpen,
  onClose,
  onPinToggle,
  onToast,
}) => {
  const [copiedContent, setCopiedContent] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !phaste) return null;

  const shareUrl = `${window.location.origin}/sh/${phaste.public_slug}`;
  const meta: any = phaste.metadata_context || {};
  const author: any = meta.author || {};
  const network: any = meta.network || {};
  const browser: any = meta.browser || {};
  const location: any = meta.location || {};
  const client: any = meta.client || {};
  const og: any = meta.og || {};

  // Resolve content to copy
  const getContentToCopy = (): string => {
    if (phaste.kind === 'text' || phaste.kind === 'richtext') {
      return phaste.content || '';
    }
    if (phaste.kind === 'link') {
      return phaste.source_url || phaste.content || '';
    }
    if (phaste.kind === 'image') {
      if (phaste.ocr_transcript) return phaste.ocr_transcript;
      if (phaste.media_path) return getMediaUrl(phaste.media_path);
    }
    if (phaste.kind === 'video') {
      if (phaste.source_url) return phaste.source_url;
      if (phaste.media_path) return getMediaUrl(phaste.media_path);
    }
    return phaste.content || phaste.source_url || '';
  };

  const handleCopyContent = () => {
    const text = getContentToCopy();
    if (!text) {
      onToast('No text content to copy', 'info');
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedContent(true);
    onToast('Content copied to clipboard!', 'success');
    setTimeout(() => setCopiedContent(false), 2000);
  };

  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedShare(true);
    onToast('Public share URL copied to clipboard!', 'success');
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(true);
    onToast(`IP ${ip} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const formatBytes = (bytes?: number | null) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatRelativeTime = (dateStr: string) => {
    const dt = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - dt.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const kindIcons = {
    text: <FileText className="w-4 h-4 text-emerald-400" />,
    richtext: <FileText className="w-4 h-4 text-cyan-400" />,
    image: <ImageIcon className="w-4 h-4 text-purple-400" />,
    video: <VideoIcon className="w-4 h-4 text-rose-400" />,
    link: <LinkIcon className="w-4 h-4 text-blue-400" />,
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-7xl h-[92vh] max-h-[92vh] rounded-2xl bg-md3-surface border border-md3-outline-variant/30 shadow-2xl flex flex-col md:flex-row overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =================================================================== */}
        {/* LEFT PANE: 4/5th Width - Main Content Area */}
        {/* =================================================================== */}
        <div className="w-full md:w-4/5 h-full flex flex-col bg-md3-surface-container-lowest border-b md:border-b-0 md:border-r border-md3-outline-variant/20 overflow-hidden">
          {/* Top Content Toolbar */}
          <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3.5 bg-md3-surface-container-low border-b border-md3-outline-variant/20 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-md3-surface-container-highest text-xs font-semibold uppercase tracking-wider text-md3-primary">
                {kindIcons[phaste.kind as keyof typeof kindIcons] || <Code className="w-4 h-4" />}
                <span>{phaste.kind}</span>
              </span>

              <h2 className="text-base sm:text-lg font-semibold text-md3-on-surface truncate">
                {phaste.title || `${phaste.kind.charAt(0).toUpperCase() + phaste.kind.slice(1)} Phaste`}
              </h2>

              {phaste.is_pinned && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-500/30">
                  <Pin className="w-3.5 h-3.5 fill-current" />
                  <span>Pinned</span>
                </span>
              )}
            </div>

            {/* Content Action Controls */}
            <div className="flex items-center gap-2">
              {/* COPY CONTENT BUTTON (Primary Action) */}
              <button
                onClick={handleCopyContent}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-md3-primary text-md3-on-primary hover:bg-md3-primary/90 text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95"
                title="Copy the actual content (text, code, or media URL) to clipboard"
              >
                {copiedContent ? (
                  <>
                    <Check className="w-4 h-4 text-md3-on-primary stroke-[2.5]" />
                    <span>Copied Content!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Content</span>
                  </>
                )}
              </button>

              {/* COPY SHARE URL BUTTON */}
              <button
                onClick={handleCopyShareUrl}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-md3-surface-container-high hover:bg-md3-surface-container-highest text-md3-on-surface text-xs sm:text-sm font-medium transition-colors border border-md3-outline-variant/30"
                title="Copy public share URL (/sh/slug)"
              >
                {copiedShare ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied Share URL!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-md3-on-surface-variant" />
                    <span>Share Link</span>
                  </>
                )}
              </button>

              {/* External URL if Link or Video Source */}
              {phaste.source_url && (
                <a
                  href={phaste.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-full text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-md3-surface-container-high transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center"
                  title="Open original external URL"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {/* Download if Media File */}
              {phaste.media_path && (
                <a
                  href={getMediaUrl(phaste.media_path)}
                  download
                  className="p-1.5 rounded-full text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-md3-surface-container-high transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center"
                  title="Download media file"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}

              {/* Pin Toggle */}
              {onPinToggle && (
                <button
                  onClick={() => onPinToggle(phaste.id, phaste.is_pinned)}
                  className={`p-1.5 rounded-full min-w-[34px] min-h-[34px] flex items-center justify-center transition-colors ${
                    phaste.is_pinned
                      ? 'text-amber-500 bg-amber-500/15'
                      : 'text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-md3-surface-container-high'
                  }`}
                  title={phaste.is_pinned ? 'Unpin' : 'Pin to top'}
                >
                  <Pin className="w-4 h-4" />
                </button>
              )}

              {/* Close Button on Mobile */}
              <button
                onClick={onClose}
                className="md:hidden p-1.5 rounded-full min-w-[34px] min-h-[34px] flex items-center justify-center text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-md3-surface-container-high transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Content Body */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col justify-start">
            {/* KIND: TEXT or RICHTEXT */}
            {(phaste.kind === 'text' || phaste.kind === 'richtext') && phaste.content && (
              <div className="flex flex-col h-full rounded-xl bg-md3-surface-container/60 border border-md3-outline-variant/30 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-2.5 bg-md3-surface-container-high/60 border-b border-md3-outline-variant/20 text-xs sm:text-sm text-md3-on-surface-variant font-mono">
                  <span>
                    {phaste.content.split('\n').length} lines • {phaste.content.length} characters
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setWordWrap(!wordWrap)}
                      className="hover:text-md3-on-surface font-semibold transition-colors"
                    >
                      {wordWrap ? 'Wrap: On' : 'Wrap: Off'}
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-4 sm:p-6 font-mono text-sm sm:text-base leading-relaxed text-md3-on-surface select-text">
                  <pre className={`${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'} font-mono`}>
                    <code>{phaste.content}</code>
                  </pre>
                </div>
              </div>
            )}

            {/* KIND: IMAGE */}
            {phaste.kind === 'image' && phaste.media_path && (
              <div className="flex flex-col gap-4 items-center justify-center h-full">
                <div className="relative max-h-[68vh] w-full flex items-center justify-center rounded-xl overflow-hidden bg-black/10 dark:bg-black/40 border border-md3-outline-variant/20 p-2">
                  <img
                    src={getMediaUrl(phaste.media_path)}
                    alt={phaste.title || 'Image'}
                    className="max-h-[64vh] max-w-full object-contain rounded-lg shadow-xl"
                  />
                </div>

                {/* Extracted OCR Text Box */}
                {phaste.ocr_transcript && (
                  <div className="w-full rounded-xl bg-md3-surface-container border border-md3-outline-variant/25 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-md3-primary">
                        <FileText className="w-4 h-4" />
                        <span>OCR Extracted Text (Searchable)</span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(phaste.ocr_transcript || '');
                          onToast('OCR transcript copied!', 'success');
                        }}
                        className="text-xs sm:text-sm font-medium text-md3-on-surface-variant hover:text-md3-on-surface flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy OCR</span>
                      </button>
                    </div>
                    <pre className="text-xs sm:text-sm font-mono text-md3-on-surface whitespace-pre-wrap max-h-40 overflow-y-auto select-text p-3 rounded-lg bg-md3-surface-container-lowest border border-md3-outline-variant/20">
                      {phaste.ocr_transcript}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* KIND: VIDEO */}
            {phaste.kind === 'video' && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-full max-h-[70vh] rounded-xl overflow-hidden bg-black flex items-center justify-center border border-md3-outline-variant/20 shadow-2xl">
                  {phaste.media_path ? (
                    <video
                      controls
                      autoPlay
                      playsInline
                      className="max-h-[68vh] w-full object-contain"
                      src={getMediaUrl(phaste.media_path)}
                    >
                      Your browser does not support HTML5 video.
                    </video>
                  ) : phaste.source_url ? (
                    <div className="p-8 text-center flex flex-col items-center gap-3">
                      <VideoIcon className="w-12 h-12 text-md3-primary animate-pulse" />
                      <p className="text-sm font-medium text-md3-on-surface">Video source stream:</p>
                      <a
                        href={phaste.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm font-mono text-blue-500 hover:underline break-all"
                      >
                        {phaste.source_url}
                      </a>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm text-md3-outline">Video unavailable</div>
                  )}
                </div>
              </div>
            )}

            {/* KIND: LINK */}
            {phaste.kind === 'link' && (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-full max-w-2xl rounded-2xl bg-md3-surface-container border border-md3-outline-variant/30 overflow-hidden shadow-xl">
                  {og?.image_url && (
                    <div className="aspect-[2/1] w-full overflow-hidden bg-black/10 dark:bg-black/20">
                      <img
                        src={og.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-md3-on-surface-variant">
                      {og?.favicon_url && (
                        <img
                          src={og.favicon_url}
                          alt=""
                          className="w-4 h-4 rounded-sm object-contain"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      )}
                      <span>{og?.site_name || phaste.source_url}</span>
                    </div>

                    <a
                      href={phaste.source_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold text-md3-primary hover:underline"
                    >
                      {phaste.title || og?.title || phaste.source_url}
                    </a>

                    {og?.description && (
                      <p className="text-sm text-md3-on-surface-variant leading-relaxed">
                        {og.description}
                      </p>
                    )}

                    <div className="pt-3 flex items-center justify-between border-t border-md3-outline-variant/20 text-xs sm:text-sm">
                      <span className="font-mono text-xs text-md3-outline truncate max-w-sm">
                        {phaste.source_url}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(phaste.source_url || '');
                            onToast('Link copied to clipboard!', 'success');
                          }}
                          className="px-3 py-1.5 rounded-full bg-md3-surface-container-high hover:bg-md3-surface-container-highest text-md3-on-surface text-xs font-semibold"
                        >
                          Copy URL
                        </button>
                        <a
                          href={phaste.source_url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 rounded-full bg-md3-primary text-md3-on-primary hover:bg-md3-primary/90 text-xs font-semibold"
                        >
                          Visit Link &rarr;
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* RIGHT PANE: 1/5th Width - Context, Metadata & Inspector */}
        {/* =================================================================== */}
        <div className="w-full md:w-1/5 h-full flex flex-col bg-md3-surface-container-low border-l border-md3-outline-variant/20 overflow-y-auto">
          {/* Header of Sidebar */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-md3-outline-variant/20 bg-md3-surface-container-low sticky top-0 z-10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-md3-on-surface-variant">
              Captured Context
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-md3-surface-container-high transition-colors"
              title="Close modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3.5 sm:p-4 space-y-3.5 text-xs">
            {/* 1. Author & Ownership */}
            <div className="rounded-xl bg-md3-surface-container p-3 sm:p-3.5 border border-md3-outline-variant/20 space-y-2">
              <div className="flex items-center gap-1.5 text-md3-primary font-semibold text-xs uppercase tracking-wider">
                <User className="w-4 h-4" />
                <span>Author</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-md3-on-surface">{author.name || 'You'}</span>
                {author.is_owner ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                    Owner
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-500/30">
                    Guest
                  </span>
                )}
              </div>
              {author.device_name && (
                <div className="text-xs text-md3-on-surface-variant">
                  Device: <span className="font-medium text-md3-on-surface">{author.device_name}</span>
                </div>
              )}
            </div>

            {/* 2. Network & IP Address */}
            <div className="rounded-xl bg-md3-surface-container p-3 sm:p-3.5 border border-md3-outline-variant/20 space-y-2">
              <div className="flex items-center justify-between text-md3-primary font-semibold text-xs uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4" />
                  <span>Network & IP</span>
                </div>
                {network.is_local ? (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 text-xs font-semibold border border-cyan-500/25">
                    LAN
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-500/25">
                    WAN
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-md3-on-surface font-semibold">
                  {network.ip || 'Unknown'}
                </span>
                {network.ip && (
                  <button
                    onClick={() => handleCopyIp(network.ip)}
                    className="p-1 rounded text-md3-outline hover:text-md3-on-surface hover:bg-md3-surface-container-high transition-colors"
                    title="Copy IP"
                  >
                    {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              <div className="text-xs text-md3-on-surface-variant">
                Status:{' '}
                <span className="font-medium text-md3-on-surface">
                  {network.is_local ? 'Local Home LAN (WiFi)' : 'External Public Internet'}
                </span>
              </div>
            </div>

            {/* 3. Location */}
            <div className="rounded-xl bg-md3-surface-container p-3 sm:p-3.5 border border-md3-outline-variant/20 space-y-2">
              <div className="flex items-center gap-1.5 text-md3-primary font-semibold text-xs uppercase tracking-wider">
                <MapPin className="w-4 h-4" />
                <span>Location</span>
              </div>
              <div className="text-sm text-md3-on-surface font-semibold leading-snug">
                {location.formatted_location || location.formatted || location.city || 'Location unavailable'}
              </div>
              {location.latitude && location.longitude && (
                <div className="text-xs font-mono text-md3-on-surface-variant">
                  GPS: {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
                </div>
              )}
              {location.source && (
                <div className="text-xs text-md3-outline">
                  Source: <span className="text-md3-on-surface font-medium capitalize">{location.source.replace('_', ' ')}</span>
                </div>
              )}
            </div>

            {/* 4. Client & Browser */}
            <div className="rounded-xl bg-md3-surface-container p-3 sm:p-3.5 border border-md3-outline-variant/20 space-y-2">
              <div className="flex items-center gap-1.5 text-md3-primary font-semibold text-xs uppercase tracking-wider">
                <Monitor className="w-4 h-4" />
                <span>Browser & System</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-md3-outline">Browser:</span>
                  <span className="text-md3-on-surface font-medium">
                    {browser.browser || browser.browser_name || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-md3-outline">OS:</span>
                  <span className="text-md3-on-surface font-medium">{browser.os || 'Unknown'}</span>
                </div>
                {browser.screen && (
                  <div className="flex justify-between">
                    <span className="text-md3-outline">Screen:</span>
                    <span className="text-md3-on-surface font-mono font-medium">{browser.screen}</span>
                  </div>
                )}
                {browser.timezone && (
                  <div className="flex justify-between">
                    <span className="text-md3-outline">Timezone:</span>
                    <span className="text-md3-on-surface font-medium">{browser.timezone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Date & Time */}
            <div className="rounded-xl bg-md3-surface-container p-3 sm:p-3.5 border border-md3-outline-variant/20 space-y-2">
              <div className="flex items-center gap-1.5 text-md3-primary font-semibold text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                <span>Timestamp</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-sm font-semibold text-md3-on-surface">
                  {new Date(phaste.created_at).toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-xs text-md3-on-surface-variant font-mono">
                  {new Date(phaste.created_at).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
                <div className="text-xs text-md3-outline font-medium">
                  {formatRelativeTime(phaste.created_at)}
                </div>
              </div>
            </div>

            {/* 6. Media / File Specs (if media exists) */}
            {(phaste.media_size_bytes || phaste.media_dimensions || phaste.duration_seconds) && (
              <div className="rounded-xl bg-md3-surface-container p-3 sm:p-3.5 border border-md3-outline-variant/20 space-y-2">
                <div className="flex items-center gap-1.5 text-md3-primary font-semibold text-xs uppercase tracking-wider">
                  <HardDrive className="w-4 h-4" />
                  <span>Media Specs</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {phaste.media_size_bytes && (
                    <div className="flex justify-between">
                      <span className="text-md3-outline">Size:</span>
                      <span className="text-md3-on-surface font-mono font-medium">
                        {formatBytes(phaste.media_size_bytes)}
                      </span>
                    </div>
                  )}
                  {phaste.media_dimensions && (
                    <div className="flex justify-between">
                      <span className="text-md3-outline">Dimensions:</span>
                      <span className="text-md3-on-surface font-mono font-medium">
                        {phaste.media_dimensions.width} &times; {phaste.media_dimensions.height}
                      </span>
                    </div>
                  )}
                  {phaste.duration_seconds && (
                    <div className="flex justify-between">
                      <span className="text-md3-outline">Duration:</span>
                      <span className="text-md3-on-surface font-mono font-medium">
                        {Math.floor(phaste.duration_seconds)}s
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 7. Public Share Link */}
            <div className="rounded-xl bg-md3-surface-container p-3 sm:p-3.5 border border-md3-outline-variant/20 space-y-2">
              <div className="flex items-center justify-between text-md3-primary font-semibold text-xs uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Share2 className="w-4 h-4" />
                  <span>Public Share URL</span>
                </div>
              </div>
              <div className="text-xs font-mono text-md3-on-surface select-all bg-md3-surface-container-lowest p-2 rounded-lg border border-md3-outline-variant/20 truncate">
                {shareUrl}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyShareUrl}
                  className="flex-1 py-1.5 rounded-full bg-md3-primary text-md3-on-primary font-semibold text-xs hover:bg-md3-primary/90 flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedShare ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Link</span>
                </button>
                <a
                  href={`/sh/${phaste.public_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-full bg-md3-surface-container-high hover:bg-md3-surface-container-highest text-md3-on-surface text-xs font-medium flex items-center justify-center transition-colors border border-md3-outline-variant/25"
                  title="Test standalone view"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* 8. Raw JSON Context Toggle */}
            <div className="rounded-xl bg-md3-surface-container border border-md3-outline-variant/20 overflow-hidden shadow-sm">
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="w-full flex items-center justify-between p-3 text-xs font-semibold text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-md3-surface-container-high transition-colors"
              >
                <span>Raw Context JSON</span>
                {showRawJson ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {showRawJson && (
                <div className="p-3 bg-md3-surface-container-lowest border-t border-md3-outline-variant/15 overflow-x-auto">
                  <pre className="text-xs font-mono text-md3-on-surface whitespace-pre-wrap select-text leading-relaxed">
                    {JSON.stringify(meta, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
