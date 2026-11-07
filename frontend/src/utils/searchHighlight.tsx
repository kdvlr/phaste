import React from 'react';

/**
 * Escapes characters with special meaning in RegExp.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Splits a search query into clean, unique search tokens (words).
 * Supports quoted phrases (e.g. `"southwest airlines" kiran`).
 */
export function extractSearchTokens(searchQuery?: string): string[] {
  if (!searchQuery || !searchQuery.trim()) return [];

  const raw = searchQuery.trim();
  const tokens: string[] = [];

  // 1. Extract quoted phrases first
  const quotedRegex = /"([^"]+)"/g;
  let match;
  while ((match = quotedRegex.exec(raw)) !== null) {
    const phrase = match[1].trim();
    if (phrase.length > 0) {
      tokens.push(phrase);
    }
  }

  // 2. Remove quoted segments, split the rest by whitespace
  const remaining = raw.replace(/"[^"]*"/g, ' ');
  const words = remaining.split(/\s+/).map((w) => w.trim()).filter((w) => w.length > 0);

  for (const w of words) {
    // Skip filter tags like kind:image or city:chicago
    if (!/^[a-zA-Z]+:/.test(w)) {
      tokens.push(w);
    }
  }

  // Deduplicate case-insensitively while preserving original casing
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of tokens) {
    const lower = t.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      unique.push(t);
    }
  }

  return unique;
}

/**
 * Builds a RegExp that matches all search tokens as well as the full query phrase.
 * Tokens are sorted by length descending so longer words/phrases match first.
 */
export function buildSearchRegex(searchQuery?: string): RegExp | null {
  const tokens = extractSearchTokens(searchQuery);
  if (tokens.length === 0) return null;

  const rawTrimmed = searchQuery!.trim();
  const allTokens = [...tokens];
  if (tokens.length > 1 && !tokens.some((t) => t.toLowerCase() === rawTrimmed.toLowerCase())) {
    allTokens.unshift(rawTrimmed);
  }

  const escaped = allTokens
    .map(escapeRegExp)
    .sort((a, b) => b.length - a.length)
    .join('|');

  return new RegExp(`(${escaped})`, 'gi');
}

/**
 * Counts total search matches across `text` for any of the search query words.
 */
export function countSearchMatches(text: string, searchQuery?: string): number {
  if (!text || !searchQuery || !searchQuery.trim()) return 0;
  const regex = buildSearchRegex(searchQuery);
  if (!regex) return 0;

  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

/**
 * Identifies the match index of the occurrence that appears on the line with
 * the highest co-occurrence of search query tokens.
 *
 * For example, if searching "kiran southwest", it finds the first match on a line
 * where BOTH "kiran" and "southwest" appear, allowing the canvas to scroll there first.
 */
export function findBestMatchIndex(text: string, searchQuery?: string): number {
  if (!text || !searchQuery || !searchQuery.trim()) return 0;

  const tokens = extractSearchTokens(searchQuery);
  if (tokens.length <= 1) return 0;

  const regex = buildSearchRegex(searchQuery);
  if (!regex) return 0;

  // Split text into lines to compute per-line token co-occurrence
  const lines = text.split(/\r?\n/);
  let bestLineIdx = -1;
  let maxDistinctTokens = 0;

  lines.forEach((line, idx) => {
    const lineLower = line.toLowerCase();
    let distinctCount = 0;
    for (const token of tokens) {
      if (lineLower.includes(token.toLowerCase())) {
        distinctCount++;
      }
    }
    if (distinctCount > maxDistinctTokens) {
      maxDistinctTokens = distinctCount;
      bestLineIdx = idx;
    }
  });

  // If no line has multiple tokens, start from the first match (index 0)
  if (bestLineIdx === -1 || maxDistinctTokens <= 1) {
    return 0;
  }

  // Count matches preceding the best line to determine the target matchIndex
  let matchCounter = 0;
  let targetMatchIdx = 0;
  let found = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineMatches = line.match(regex);
    if (i === bestLineIdx) {
      targetMatchIdx = matchCounter;
      found = true;
      break;
    }
    if (lineMatches) {
      matchCounter += lineMatches.length;
    }
  }

  return found ? targetMatchIdx : 0;
}

/**
 * Extracts a centered snippet from `text` prioritizing lines where MULTIPLE
 * search words co-occur (e.g. a line containing both "kiran" and "southwest").
 */
export function getSearchSnippet(
  text: string,
  searchQuery?: string,
  maxLength: number = 130
): string {
  if (!text) return '';

  const cleanFull = text.replace(/^#+\s+/gm, '').replace(/[\r\n]+/g, ' ').trim();
  const tokens = extractSearchTokens(searchQuery);

  if (tokens.length === 0) {
    return cleanFull.slice(0, maxLength) + (cleanFull.length > maxLength ? '...' : '');
  }

  // Break text into lines/sentences to find the highest-scoring segment
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  let bestLine = '';
  let bestScore = -1;

  for (const rawLine of lines) {
    // Strip markdown formatting characters for clean preview
    const lineClean = rawLine.replace(/^[|#*_\-\s>]+|[|#*_\-\s>]+$/g, '').trim();
    if (!lineClean) continue;

    const lower = lineClean.toLowerCase();
    let distinctTokensMatched = 0;
    let totalMatches = 0;

    for (const t of tokens) {
      const tLower = t.toLowerCase();
      if (lower.includes(tLower)) {
        distinctTokensMatched++;
        // count occurrences of token in this line
        const count = (lower.split(tLower).length - 1);
        totalMatches += count;
      }
    }

    if (distinctTokensMatched > 0) {
      // Prioritize lines with the highest number of distinct search words
      const score = distinctTokensMatched * 1000 + totalMatches * 10 - Math.min(lineClean.length, 200) * 0.1;
      if (score > bestScore) {
        bestScore = score;
        bestLine = lineClean;
      }
    }
  }

  // Fallback to searching the full clean text if lines didn't match
  const targetText = bestLine || cleanFull;
  const targetLower = targetText.toLowerCase();

  // Find position of the earliest matched token in targetText
  let earliestIdx = -1;
  let matchedTokenLen = tokens[0]?.length || 5;

  for (const t of tokens) {
    const idx = targetLower.indexOf(t.toLowerCase());
    if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
      earliestIdx = idx;
      matchedTokenLen = t.length;
    }
  }

  if (earliestIdx === -1) {
    return cleanFull.slice(0, maxLength) + (cleanFull.length > maxLength ? '...' : '');
  }

  // Center the window around the match
  const contextBefore = Math.floor((maxLength - matchedTokenLen) / 2);
  const start = Math.max(0, earliestIdx - contextBefore);
  const end = Math.min(targetText.length, start + maxLength);

  const prefix = start > 0 ? '...' : '';
  const suffix = end < targetText.length ? '...' : '';

  return prefix + targetText.slice(start, end).trim() + suffix;
}

/**
 * Splits plain text by all search query words and wraps occurrences in styled `<mark>` elements.
 * Supports sequential indexing to highlight the currently active match distinctly.
 */
export function highlightSearchText(
  text: string,
  searchQuery?: string,
  currentMatchIndex?: number,
  globalMatchCounter?: { count: number }
): React.ReactNode {
  if (!text) return null;
  const regex = buildSearchRegex(searchQuery);
  if (!regex) return text;

  const parts = text.split(regex);
  if (parts.length <= 1) return text;

  return parts.map((part, i) => {
    // Test if this part matches any search token
    if (part && regex.test(part)) {
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
