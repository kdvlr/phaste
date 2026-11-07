import React from 'react';

/**
 * Escapes characters with special meaning in RegExp.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Counts how many times `searchQuery` appears in `text` (case-insensitive).
 */
export function countSearchMatches(text: string, searchQuery?: string): number {
  if (!text || !searchQuery || !searchQuery.trim()) return 0;
  const escaped = escapeRegExp(searchQuery.trim());
  const regex = new RegExp(escaped, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Extracts a centered snippet around the first match of `searchQuery`.
 */
export function getSearchSnippet(
  text: string,
  searchQuery?: string,
  maxLength: number = 130
): string {
  if (!text) return '';
  const clean = text.replace(/^#+\s+/gm, '').replace(/[\r\n]+/g, ' ').trim();
  if (!searchQuery || !searchQuery.trim()) {
    return clean.slice(0, maxLength) + (clean.length > maxLength ? '...' : '');
  }

  const q = searchQuery.trim().toLowerCase();
  const idx = clean.toLowerCase().indexOf(q);
  if (idx === -1) {
    return clean.slice(0, maxLength) + (clean.length > maxLength ? '...' : '');
  }

  const contextBefore = Math.floor((maxLength - q.length) / 2);
  const start = Math.max(0, idx - contextBefore);
  const end = Math.min(clean.length, start + maxLength);

  const prefix = start > 0 ? '...' : '';
  const suffix = end < clean.length ? '...' : '';

  return prefix + clean.slice(start, end).trim() + suffix;
}

/**
 * Splits plain text by `searchQuery` and wraps occurrences in styled `<mark>` elements.
 * Supports indexing to highlight the currently active match distinctly.
 */
export function highlightSearchText(
  text: string,
  searchQuery?: string,
  currentMatchIndex?: number,
  globalMatchCounter?: { count: number }
): React.ReactNode {
  if (!text) return null;
  if (!searchQuery || !searchQuery.trim()) return text;

  const escaped = escapeRegExp(searchQuery.trim());
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  if (parts.length <= 1) return text;

  return parts.map((part, i) => {
    if (regex.test(part)) {
      const matchIdx = globalMatchCounter ? globalMatchCounter.count++ : 0;
      const isActive = currentMatchIndex !== undefined && currentMatchIndex === matchIdx;
      return (
        <mark
          key={`mark-${matchIdx}-${i}`}
          data-search-match={matchIdx}
          className={`search-highlight rounded px-1 py-0.5 transition-all duration-200 ${
            isActive
              ? 'bg-amber-400 dark:bg-amber-400 text-black font-bold ring-2 ring-amber-600 dark:ring-amber-300 shadow-md scale-105 inline-block z-10'
              : 'bg-amber-200/90 dark:bg-amber-500/35 text-[#3e2723] dark:text-[#ffecb3] border border-amber-300 dark:border-amber-500/40'
          }`}
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}
