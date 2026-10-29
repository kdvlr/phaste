import React, { useState } from 'react';
import {
  SquarePen,
  Search,
  Pin,
  Trash2,
  Menu,
  X,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Link as LinkIcon,
} from 'lucide-react';
import { Phaste } from '../types';
import { getMediaUrl } from '../api';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';

interface NotesListProps {
  phastes: Phaste[];
  selectedPhaste: Phaste | null;
  onSelectPhaste: (phaste: Phaste) => void;
  activeTitle: string;
  onNewNote: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onTogglePin: (phaste: Phaste) => void;
  onDeletePhaste: (phaste: Phaste) => void;
  onOpenMobileSidebar?: () => void;
  isLoading?: boolean;
}

export const NotesList: React.FC<NotesListProps> = ({
  phastes,
  selectedPhaste,
  onSelectPhaste,
  activeTitle,
  onNewNote,
  searchQuery,
  onSearchChange,
  onTogglePin,
  onDeletePhaste,
  onOpenMobileSidebar,
  isLoading = false,
}) => {
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const formatTimestamp = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      const dist = formatDistanceToNowStrict(d, { addSuffix: false });
      if (dist.includes('second') || dist.includes('0 minute')) return 'Just now';
      return dist;
    } catch {
      return '';
    }
  };

  const getThumbnailSrc = (p: Phaste): string | null => {
    if (p.thumbnail_path) return getMediaUrl(p.thumbnail_path);
    if (p.media_path && p.kind === 'image') return getMediaUrl(p.media_path);
    if (p.metadata_context?.og?.image_url) return p.metadata_context.og.image_url;
    return null;
  };

  return (
    <div className="w-full md:w-80 lg:w-88 shrink-0 flex flex-col h-full bg-[#fbfbfa] dark:bg-[#1b1614] border-r border-[#e5e2da]/40 dark:border-[#4e342e]/40 select-none">
      {/* Top Header */}
      <div className="h-12 px-4 border-b border-[#e5e2da]/40 dark:border-[#4e342e]/40 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          {onOpenMobileSidebar && (
            <button
              onClick={onOpenMobileSidebar}
              className="p-1 rounded text-[#8d6e63] dark:text-[#a1887f] hover:bg-black/5 dark:hover:bg-white/5 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center space-x-1.5 font-semibold text-[#3e2723] dark:text-[#efebe9]">
            <span className="truncate max-w-[150px]">{activeTitle}</span>
            <span className="text-xs text-[#8d6e63] dark:text-[#a1887f]">&#709;</span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={onNewNote}
            className="p-1.5 rounded-lg text-[#6d4c41] dark:text-[#d7ccc8] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-transform"
            title="New Note (or paste clipboard anywhere)"
          >
            <SquarePen className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setIsSearchVisible(!isSearchVisible);
              if (isSearchVisible) onSearchChange('');
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              isSearchVisible || searchQuery
                ? 'bg-[#8d6e63]/20 text-[#3e2723] dark:text-white'
                : 'text-[#6d4c41] dark:text-[#d7ccc8] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title="Search Notes"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Inline Search Bar */}
      {(isSearchVisible || searchQuery) && (
        <div className="p-2 border-b border-[#e5e2da]/40 dark:border-[#4e342e]/40 bg-white/50 dark:bg-[#241e1b]/50">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-[#a1887f]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search in notes, OCR, tags..."
              autoFocus
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg bg-white dark:bg-[#2d2421] border border-[#e5e2da] dark:border-[#4e342e]/50 text-[#3e2723] dark:text-[#efebe9] focus:outline-none focus:ring-1 focus:ring-[#8d6e63]"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 p-0.5 text-[#a1887f] hover:text-[#3e2723]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Note Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading && phastes.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#a1887f]">
            Loading notes...
          </div>
        ) : phastes.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#a1887f] space-y-2">
            <div>No notes found.</div>
            <button
              onClick={onNewNote}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#8d6e63] text-white text-xs font-medium hover:bg-[#6d4c41] transition-colors"
            >
              <SquarePen className="w-3.5 h-3.5" />
              <span>Create Note</span>
            </button>
          </div>
        ) : (
          phastes.map((p) => {
            const isSelected = selectedPhaste?.id === p.id;
            const thumb = getThumbnailSrc(p);
            const timeAgo = formatTimestamp(p.created_at);

            // Snippet preview (strip markdown headings/tags)
            const snippet = (p.content || p.ocr_transcript || '')
              .replace(/^#+\s+/gm, '')
              .slice(0, 120);

            return (
              <div
                key={p.id}
                onClick={() => onSelectPhaste(p)}
                className={`relative rounded-xl p-3 cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-white dark:bg-[#2d2421] shadow-sm border-[#8d6e63]/40 dark:border-[#8d6e63]/40 ring-1 ring-[#8d6e63]/20'
                    : 'bg-transparent border-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                }`}
              >
                {/* Title */}
                <div className="flex items-start justify-between gap-1 mb-1">
                  <h4 className="text-sm font-semibold text-[#3e2723] dark:text-[#efebe9] truncate leading-tight">
                    {p.title || 'Untitled'}
                  </h4>
                </div>

                {/* Snippet */}
                {snippet && (
                  <p className="text-xs text-[#6d4c41]/80 dark:text-[#d7ccc8]/70 line-clamp-2 leading-relaxed mb-2">
                    {renderSnippetWithHighlightedTags(snippet)}
                  </p>
                )}

                {/* Thumbnail Preview Card (if media exists) */}
                {thumb && (
                  <div className="mb-2 w-28 h-16 rounded-lg overflow-hidden border border-[#e5e2da]/60 dark:border-[#4e342e]/60 bg-black/5">
                    <img
                      src={thumb}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Bottom line: Pin indicator + Relative Date */}
                <div className="flex items-center justify-between text-[11px] text-[#a1887f]">
                  <div className="flex items-center space-x-1.5">
                    {p.is_pinned && (
                      <span className="text-[#ff5f56]" title="Pinned">
                        &#128204;
                      </span>
                    )}
                    <span>{timeAgo}</span>
                  </div>

                  {/* Kind indicator icon */}
                  <div className="flex items-center space-x-1 opacity-70">
                    {p.kind === 'image' && <ImageIcon className="w-3 h-3" />}
                    {p.kind === 'video' && <VideoIcon className="w-3 h-3" />}
                    {p.kind === 'link' && <LinkIcon className="w-3 h-3" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

function renderSnippetWithHighlightedTags(text: string) {
  const parts = text.split(/(#[a-zA-Z0-9_\-]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return (
        <span
          key={i}
          className="inline-block px-1 py-0.2 mx-0.5 rounded bg-[#e5e2da]/70 dark:bg-[#3a2e2a] text-[#8d6e63] dark:text-[#d7ccc8] font-mono text-[10px]"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}
