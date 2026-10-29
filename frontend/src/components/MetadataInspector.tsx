import React, { useState } from 'react';
import {
  X,
  Copy,
  ExternalLink,
  Sparkles,
  MapPin,
  Laptop,
  Clock,
  Shield,
  FileCode,
  Tag,
  Check,
} from 'lucide-react';
import { Phaste } from '../types';
import { aiEnrichPhaste } from '../api';

interface MetadataInspectorProps {
  phaste: Phaste;
  onClose: () => void;
  onPhasteUpdated: (updated: Phaste) => void;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const MetadataInspector: React.FC<MetadataInspectorProps> = ({
  phaste,
  onClose,
  onPhasteUpdated,
  onShowToast,
}) => {
  const [isEnriching, setIsEnriching] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [hasCopiedUrl, setHasCopiedUrl] = useState(false);

  const shareUrl = `${window.location.origin}/sh/${phaste.public_slug}`;
  const meta = phaste.metadata_context || {};
  const author = (meta.author || {}) as Record<string, any>;
  const browser = (meta.browser || {}) as Record<string, any>;
  const location = (meta.location || {}) as Record<string, any>;
  const ai = (meta.ai || {}) as Record<string, any>;

  const wordCount = (phaste.content || '').trim().split(/\s+/).filter(Boolean).length;
  const lineCount = (phaste.content || '').split('\n').length;
  const charCount = (phaste.content || '').length;

  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setHasCopiedUrl(true);
      onShowToast('Share URL copied to clipboard!', 'success');
      setTimeout(() => setHasCopiedUrl(false), 2000);
    });
  };

  const handleEnrichWithAI = async () => {
    setIsEnriching(true);
    try {
      const res = await aiEnrichPhaste(phaste.id);
      onPhasteUpdated(res);
      onShowToast('Enriched with LiteLLM AI summary & tags!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'AI enrichment failed', 'error');
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <div className="w-80 md:w-88 shrink-0 h-full bg-[#fdfcfb] dark:bg-[#1f1a18] border-l border-[#e5e2da]/40 dark:border-[#4e342e]/40 flex flex-col select-none overflow-hidden shadow-xl">
      {/* Header */}
      <div className="h-12 px-4 border-b border-[#e5e2da]/40 dark:border-[#4e342e]/40 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 text-sm font-semibold text-[#3e2723] dark:text-[#efebe9]">
          <span className="w-5 h-5 rounded-full bg-[#8d6e63]/20 flex items-center justify-center text-xs text-[#8d6e63] dark:text-[#d7ccc8]">
            i
          </span>
          <span>Phaste Inspector</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#a1887f] hover:text-[#3e2723] dark:hover:text-[#efebe9] hover:bg-black/5 dark:hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Details */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-[#6d4c41] dark:text-[#d7ccc8]">
        {/* Share Link Card */}
        <div className="p-3 rounded-xl bg-white dark:bg-[#2d2421] border border-[#e5e2da] dark:border-[#4e342e]/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#3e2723] dark:text-[#efebe9]">Public Share</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#27c93f]/15 text-[#27c93f] font-mono">
              Bypasses OTP
            </span>
          </div>

          <div className="p-2 rounded bg-[#f5f5f7] dark:bg-[#1b1614] font-mono text-[11px] text-[#3e2723] dark:text-[#efebe9] truncate border border-[#e5e2da]/50 dark:border-[#4e342e]/30">
            {shareUrl}
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={handleCopyShareUrl}
              className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg bg-[#8d6e63] text-white hover:bg-[#6d4c41] transition-colors"
            >
              {hasCopiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{hasCopiedUrl ? 'Copied' : 'Copy Link'}</span>
            </button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg border border-[#e5e2da] dark:border-[#4e342e] text-[#6d4c41] dark:text-[#d7ccc8] hover:bg-black/5"
              title="Open public view in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* AI Analysis Section */}
        <div className="p-3 rounded-xl bg-white dark:bg-[#2d2421] border border-[#e5e2da] dark:border-[#4e342e]/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 font-semibold text-[#3e2723] dark:text-[#efebe9]">
              <Sparkles className="w-3.5 h-3.5 text-[#ffbd2e]" />
              <span>LiteLLM Insights</span>
            </div>
            <button
              onClick={handleEnrichWithAI}
              disabled={isEnriching}
              className="text-[11px] px-2 py-0.5 rounded bg-[#8d6e63]/15 text-[#8d6e63] dark:text-[#d7ccc8] hover:bg-[#8d6e63]/25 disabled:opacity-50"
            >
              {isEnriching ? 'Analyzing...' : 'Re-analyze'}
            </button>
          </div>

          {ai.summary ? (
            <p className="text-[11px] leading-relaxed text-[#6d4c41]/90 dark:text-[#d7ccc8]/90 italic">
              "{ai.summary}"
            </p>
          ) : (
            <p className="text-[11px] text-[#a1887f] italic">
              No AI summary yet. Click Re-analyze to generate with LiteLLM.
            </p>
          )}

          {/* Tags */}
          <div className="pt-1">
            <div className="text-[10px] uppercase font-semibold text-[#a1887f] mb-1">
              Detected Categories / Tags
            </div>
            <div className="flex flex-wrap gap-1">
              {phaste.tags && phaste.tags.length > 0 ? (
                phaste.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#8d6e63]/15 text-[#6d4c41] dark:text-[#efebe9] font-mono text-[10px]"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    <span>#{t}</span>
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-[#a1887f] italic">No tags</span>
              )}
            </div>
          </div>
        </div>

        {/* Phaste Statistics */}
        <div className="p-3 rounded-xl bg-white dark:bg-[#2d2421] border border-[#e5e2da] dark:border-[#4e342e]/50 space-y-2">
          <span className="font-semibold text-[#3e2723] dark:text-[#efebe9]">Statistics</span>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2 rounded bg-[#f5f5f7] dark:bg-[#1b1614]">
              <div className="font-bold text-sm text-[#3e2723] dark:text-[#efebe9]">{wordCount}</div>
              <div className="text-[10px] text-[#a1887f]">Words</div>
            </div>
            <div className="p-2 rounded bg-[#f5f5f7] dark:bg-[#1b1614]">
              <div className="font-bold text-sm text-[#3e2723] dark:text-[#efebe9]">{lineCount}</div>
              <div className="text-[10px] text-[#a1887f]">Lines</div>
            </div>
            <div className="p-2 rounded bg-[#f5f5f7] dark:bg-[#1b1614]">
              <div className="font-bold text-sm text-[#3e2723] dark:text-[#efebe9]">{charCount}</div>
              <div className="text-[10px] text-[#a1887f]">Chars</div>
            </div>
          </div>
        </div>

        {/* Origin & Environment */}
        <div className="p-3 rounded-xl bg-white dark:bg-[#2d2421] border border-[#e5e2da] dark:border-[#4e342e]/50 space-y-2.5">
          <span className="font-semibold text-[#3e2723] dark:text-[#efebe9]">Context & Origin</span>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-[#a1887f]">
                <Shield className="w-3 h-3" />
                <span>Author:</span>
              </span>
              <span className="font-medium text-[#3e2723] dark:text-[#efebe9]">
                {author.label || author.name || 'You'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-[#a1887f]">
                <Laptop className="w-3 h-3" />
                <span>Device:</span>
              </span>
              <span className="text-[#3e2723] dark:text-[#efebe9]">
                {browser.os || 'Unknown'} &bull; {browser.browser_name || 'Browser'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-[#a1887f]">
                <MapPin className="w-3 h-3" />
                <span>Location:</span>
              </span>
              <span className="text-[#3e2723] dark:text-[#efebe9] truncate max-w-[140px]">
                {location.formatted || location.city || 'Local Network'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-[#a1887f]">
                <Clock className="w-3 h-3" />
                <span>Created:</span>
              </span>
              <span className="text-[#3e2723] dark:text-[#efebe9]">
                {new Date(phaste.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Collapsible Raw JSON */}
        <div className="pt-2">
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="flex items-center space-x-1.5 text-[11px] text-[#a1887f] hover:text-[#3e2723] dark:hover:text-[#efebe9]"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{showRawJson ? 'Hide Raw Metadata' : 'View Raw Metadata (JSON)'}</span>
          </button>

          {showRawJson && (
            <pre className="mt-2 p-2 rounded-lg bg-[#241e1b] text-[#f5f5f7] font-mono text-[10px] overflow-x-auto max-h-48 border border-[#4e342e]/40">
              {JSON.stringify(phaste.metadata_context, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
