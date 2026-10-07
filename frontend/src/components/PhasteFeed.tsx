import React, { useMemo } from 'react';
import { Phaste, SearchResultItem } from '../types';
import { PhasteCard } from './PhasteCard';
import { Sparkles, Inbox, Calendar, Pin } from 'lucide-react';
import { isToday, isYesterday, format } from 'date-fns';

interface PhasteFeedProps {
  items: Phaste[];
  searchResults?: SearchResultItem[] | null;
  isLoading: boolean;
  onPinToggle: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  onSelect: (phaste: Phaste) => void;
  onImageClick?: (phaste: Phaste) => void;
  onInspect?: (phaste: Phaste) => void;
  onToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

interface DateGroup {
  key: string;
  title: string;
  subtitle?: string;
  isPinnedSection?: boolean;
  items: Phaste[];
}

function groupPastesByDate(phastes: Phaste[]): DateGroup[] {
  const groups: DateGroup[] = [];

  // 1. Pinned items group (if any)
  const pinnedItems = phastes.filter((p) => p.is_pinned);
  if (pinnedItems.length > 0) {
    groups.push({
      key: 'pinned',
      title: 'Pinned Pastes',
      subtitle: 'Quick access & favorites',
      isPinnedSection: true,
      items: pinnedItems,
    });
  }

  // 2. Unpinned items grouped by date
  const unpinnedItems = phastes.filter((p) => !p.is_pinned);
  const dayBuckets = new Map<string, { date: Date; items: Phaste[] }>();

  for (const item of unpinnedItems) {
    const d = new Date(item.created_at);
    // Key by YYYY-MM-DD in local time
    const dayKey = format(d, 'yyyy-MM-dd');
    if (!dayBuckets.has(dayKey)) {
      dayBuckets.set(dayKey, { date: d, items: [] });
    }
    dayBuckets.get(dayKey)!.items.push(item);
  }

  // Build sorted groups (latest date first)
  for (const [dayKey, { date, items }] of dayBuckets.entries()) {
    let title: string;
    let subtitle: string;

    if (isToday(date)) {
      title = 'Today';
      subtitle = format(date, 'EEEE, MMMM d, yyyy');
    } else if (isYesterday(date)) {
      title = 'Yesterday';
      subtitle = format(date, 'EEEE, MMMM d, yyyy');
    } else {
      title = format(date, 'EEEE, MMMM d');
      subtitle = format(date, 'yyyy');
    }

    groups.push({
      key: dayKey,
      title,
      subtitle,
      items,
    });
  }

  return groups;
}

export const PhasteFeed: React.FC<PhasteFeedProps> = ({
  items,
  searchResults,
  isLoading,
  onPinToggle,
  onDelete,
  onSelect,
  onImageClick,
  onInspect,
  onToast,
}) => {
  // Memoize date grouping
  const dateGroups = useMemo(() => groupPastesByDate(items), [items]);

  // If search results are active, render them with match indicators and date grouping
  if (searchResults !== null && searchResults !== undefined) {
    if (searchResults.length === 0 && !isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center text-md3-on-surface-variant">
          <Sparkles className="w-10 h-10 text-md3-outline mb-3 stroke-1" />
          <h3 className="text-base font-semibold text-md3-on-surface">No matches found</h3>
          <p className="text-sm text-md3-on-surface-variant/80 mt-1">
            Try adjusting your query or remove filter tags
          </p>
        </div>
      );
    }

    // Group search results by date as well
    const searchPhastes = searchResults.map((r) => r.phaste);
    const searchGroups = groupPastesByDate(searchPhastes);

    // Map phaste ID to its search score & match type
    const searchMetaMap = new Map(searchResults.map((r) => [r.phaste.id, r]));

    return (
      <div className="space-y-8">
        {searchGroups.map((group) => (
          <section key={group.key} className="space-y-4">
            {/* Sticky Date Section Header */}
            <div className="sticky top-[4.25rem] z-10 backdrop-blur-md bg-md3-surface/90 py-2.5 px-4 rounded-full border border-md3-outline-variant/30 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                {group.isPinnedSection ? (
                  <Pin className="w-4 h-4 text-amber-500 fill-current flex-shrink-0" />
                ) : (
                  <Calendar className="w-4 h-4 text-md3-primary flex-shrink-0" />
                )}
                <span className="text-sm sm:text-base font-semibold text-md3-on-surface truncate">
                  {group.title}
                </span>
                {group.subtitle && (
                  <span className="text-xs sm:text-sm text-md3-on-surface-variant font-medium hidden sm:inline truncate">
                    • {group.subtitle}
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-md3-surface-container-high text-md3-on-surface-variant flex-shrink-0 border border-md3-outline-variant/20">
                {group.items.length} {group.items.length === 1 ? 'result' : 'results'}
              </span>
            </div>

            {/* Grid of Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((phaste) => {
                const searchMeta = searchMetaMap.get(phaste.id);
                const matchType = searchMeta?.match_type;
                return (
                  <div key={phaste.id} className="relative">
                    {matchType && matchType !== 'filter' && (
                      <span className="absolute top-2 right-2 z-10 px-2.5 py-0.5 rounded-full bg-md3-primary-container text-md3-on-primary-container text-xs font-semibold shadow-md3-1 border border-md3-primary/20">
                        {matchType === 'hybrid' ? '⚡ Hybrid' : matchType === 'semantic' ? '🔮 Visual' : '📝 Text'}
                      </span>
                    )}
                    <PhasteCard
                      phaste={phaste}
                      onPinToggle={onPinToggle}
                      onDelete={onDelete}
                      onSelect={onSelect}
                      onImageClick={onImageClick}
                      onInspect={onInspect}
                      onToast={onToast}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  // Normal Feed Empty State
  if (items.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-md3-on-surface-variant">
        <div className="w-16 h-16 rounded-full bg-md3-surface-container-high flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-md3-primary stroke-1" />
        </div>
        <h3 className="text-lg font-semibold text-md3-on-surface">Your Phastebin is empty</h3>
        <p className="text-sm text-md3-on-surface-variant mt-1.5 max-w-sm leading-relaxed">
          Press <kbd className="px-2 py-0.5 bg-md3-surface-container-high rounded font-mono font-semibold text-md3-primary border border-md3-outline-variant/30">Cmd+V</kbd> anywhere
          or drag and drop files onto the window to capture in haste.
        </p>
      </div>
    );
  }

  // Normal Feed Split by Date
  return (
    <div className="space-y-8">
      {dateGroups.map((group) => (
        <section key={group.key} className="space-y-4">
          {/* Sticky Date Section Header */}
          <div className="sticky top-[4.25rem] z-10 backdrop-blur-md bg-md3-surface/90 py-2.5 px-4 rounded-full border border-md3-outline-variant/30 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              {group.isPinnedSection ? (
                <Pin className="w-4 h-4 text-amber-500 fill-current flex-shrink-0" />
              ) : (
                <Calendar className="w-4 h-4 text-md3-primary flex-shrink-0" />
              )}
              <span className="text-sm sm:text-base font-semibold text-md3-on-surface truncate">
                {group.title}
              </span>
              {group.subtitle && (
                <span className="text-xs sm:text-sm text-md3-on-surface-variant font-medium hidden sm:inline truncate">
                  • {group.subtitle}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-md3-surface-container-high text-md3-on-surface-variant flex-shrink-0 border border-md3-outline-variant/20">
              {group.items.length} {group.items.length === 1 ? 'paste' : 'pastes'}
            </span>
          </div>

          {/* Grid of Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((phaste) => (
              <PhasteCard
                key={phaste.id}
                phaste={phaste}
                onPinToggle={onPinToggle}
                onDelete={onDelete}
                onSelect={onSelect}
                onImageClick={onImageClick}
                onInspect={onInspect}
                onToast={onToast}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
