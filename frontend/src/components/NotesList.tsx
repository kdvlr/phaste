import React, { useRef, useEffect } from 'react';
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
  Folder,
} from 'lucide-react';
import { Phaste } from '../types';
import { getMediaUrl } from '../api';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { Kbd } from './base/Kbd';
import { ScrollFade, useScrollFade } from './base/ScrollFade';

interface NotesListProps {
  phastes: Phaste[];
  selectedPhaste: Phaste | null;
  onSelectPhaste: (phaste: Phaste) => void;
  activeTitle: string;
  onNewPhaste: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onTogglePin: (phaste: Phaste) => void;
  onDeletePhaste: (phaste: Phaste) => void;
  onOpenMobileSidebar?: () => void;
  onEmptyTrash?: () => void;
  isLoading?: boolean;
}

export const NotesList: React.FC<NotesListProps> = ({
  phastes,
  selectedPhaste,
  onSelectPhaste,
  activeTitle,
  onNewPhaste,
  searchQuery,
  onSearchChange,
  onTogglePin,
  onDeletePhaste,
  onOpenMobileSidebar,
  onEmptyTrash,
  isLoading = false,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fade = useScrollFade();

  // Global ⌘K / Ctrl+K and '/' shortcut to focus persistent search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

          <div className="flex items-center space-x-2 font-semibold text-[#3e2723] dark:text-[#efebe9]">
            <span className="truncate max-w-[150px]">{activeTitle}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#8d6e63]/10 dark:bg-white/10 text-[10px] font-mono text-[#8d6e63] dark:text-[#a1887f]">
              {phastes.length}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {activeTitle === 'Trash' && phastes.length > 0 && onEmptyTrash ? (
            <button
              onClick={onEmptyTrash}
              className="px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-300 hover:text-white bg-rose-100 hover:bg-rose-600 dark:bg-rose-950/50 dark:hover:bg-rose-700 rounded-md transition-all flex items-center space-x-1 shadow-xs"
              title="Empty Trash"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Empty</span>
            </button>
          ) : (
            <button
              onClick={onNewPhaste}
              className="p-1.5 rounded-lg text-[#6d4c41] dark:text-[#d7ccc8] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-transform"
              title="New Phaste (or paste clipboard anywhere)"
            >
              <SquarePen className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Persistent Search Bar (BoardUI SearchField Pattern) */}
      <div className="px-3 pt-2.5 pb-2.5 shrink-0 bg-[#fbfbfa] dark:bg-[#1b1614] border-b border-[#e5e2da]/40 dark:border-[#4e342e]/40">
        <div className="relative flex items-center group">
          <Search className="w-3.5 h-3.5 absolute left-3 text-[#a1887f] group-focus-within:text-[#8d6e63] transition-colors pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (searchQuery) {
                  onSearchChange('');
                } else {
                  searchInputRef.current?.blur();
                }
              }
            }}
            placeholder="Search phastes, tags, OCR..."
            className="w-full pl-9 pr-14 py-1.5 text-xs rounded-xl bg-white dark:bg-[#251e1b] border border-[#e5e2da] dark:border-[#3a2e2a] text-[#3e2723] dark:text-[#efebe9] placeholder-[#a1887f]/70 focus:outline-none focus:ring-2 focus:ring-[#8d6e63]/30 focus:border-[#8d6e63] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all"
          />
          <div className="absolute right-2 flex items-center space-x-1">
            {searchQuery ? (
              <button
                onClick={() => {
                  onSearchChange('');
                  searchInputRef.current?.focus();
                }}
                className="p-1 rounded-md text-[#a1887f] hover:text-[#3e2723] dark:hover:text-[#efebe9] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="Clear search (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Kbd className="hidden sm:inline-flex text-[9px] px-1 py-0.2">⌘K</Kbd>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable Note Cards with BoardUI ScrollFade */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div
          onScroll={fade.onScroll}
          className="flex-1 overflow-y-auto p-2 space-y-1.5"
        >
          {activeTitle === 'Trash' && phastes.length > 0 && (
            <div className="mx-1 mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#6d4c41] dark:text-[#d7ccc8] text-xs flex items-center justify-between">
              <span>Items in Trash can be permanently deleted.</span>
              {onEmptyTrash && (
                <button
                  onClick={onEmptyTrash}
                  className="ml-2 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 underline shrink-0"
                >
                  Empty Trash Now
                </button>
              )}
            </div>
          )}

          {isLoading && phastes.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#a1887f] space-y-2">
              <div className="w-6 h-6 mx-auto border-2 border-[#8d6e63]/30 border-t-[#8d6e63] rounded-full animate-spin" />
              <div>Loading phastes...</div>
            </div>
          ) : phastes.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#a1887f] space-y-3">
              <div>{searchQuery ? 'No matching phastes found' : 'No phastes in this view'}</div>
              {searchQuery ? (
                <button
                  onClick={() => onSearchChange('')}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 text-xs text-[#6d4c41] dark:text-[#d7ccc8] hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <span>Clear Search</span>
                </button>
              ) : (
                <button
                  onClick={onNewPhaste}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#8d6e63] text-white text-xs font-medium hover:bg-[#6d4c41] shadow-xs active:scale-95 transition-all"
                >
                  <SquarePen className="w-3.5 h-3.5" />
                  <span>Create Phaste</span>
                </button>
              )}
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
                  className={`group relative rounded-xl p-3 cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-white dark:bg-[#2d2421] shadow-sm border-[#8d6e63]/40 dark:border-[#8d6e63]/40 ring-1 ring-[#8d6e63]/25'
                      : 'bg-transparent border-transparent hover:bg-black/[0.035] dark:hover:bg-white/[0.035]'
                  }`}
                >
                  {/* Title */}
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h4 className="text-sm font-semibold text-[#3e2723] dark:text-[#efebe9] truncate leading-tight">
                      {p.title || 'Untitled'}
                    </h4>
                  </div>

                  {/* Single Category Badge */}
                  {p.category && (
                    <div className="mb-1.5 flex items-center">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#8d6e63]/10 dark:bg-white/10 text-[#6d4c41] dark:text-[#d7ccc8] text-[10px] font-medium">
                        <Folder className="w-2.5 h-2.5 opacity-70" />
                        <span>{p.category}</span>
                      </span>
                    </div>
                  )}

                  {/* Snippet */}
                  {snippet && (
                    <p className="text-xs text-[#6d4c41]/80 dark:text-[#d7ccc8]/70 line-clamp-2 leading-relaxed mb-2">
                      {snippet}
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
                          📌
                        </span>
                      )}
                      <span>{timeAgo}</span>
                    </div>

                    {/* Actions & Kind indicator icon */}
                    <div className="flex items-center space-x-1.5">
                      {/* Pin Toggle on Hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(p);
                        }}
                        className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                          p.is_pinned
                            ? 'text-[#ff5f56] hover:bg-[#ff5f56]/10'
                            : 'text-[#a1887f] hover:text-[#3e2723] dark:hover:text-[#efebe9] hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                        title={p.is_pinned ? 'Unpin' : 'Pin to top'}
                      >
                        <Pin className="w-3 h-3" />
                      </button>

                      {/* Delete on Hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePhaste(p);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#a1887f] hover:text-[#b3261e] hover:bg-[#b3261e]/10 transition-all"
                        title={p.is_trash ? 'Permanently delete' : 'Move to Trash'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      <div className="flex items-center space-x-1 opacity-70">
                        {p.kind === 'image' && <ImageIcon className="w-3 h-3" />}
                        {p.kind === 'video' && <VideoIcon className="w-3 h-3" />}
                        {p.kind === 'link' && <LinkIcon className="w-3 h-3" />}
                        {p.kind === 'text' && <FileText className="w-3 h-3" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* BoardUI ScrollFade overlay */}
        <ScrollFade
          progress={fade.progress}
          surfaceClassName="from-[#fbfbfa] dark:from-[#1b1614]"
        />
      </div>
    </div>
  );
};
