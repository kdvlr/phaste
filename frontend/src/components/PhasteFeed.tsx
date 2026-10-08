import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Phaste, SearchResultItem } from '../types';
import { PhasteCard } from './PhasteCard';
import { Sparkles, Inbox, Calendar, Pin, ChevronDown } from 'lucide-react';
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
  isToday?: boolean;
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
    const isTodayGroup = isToday(date);

    if (isTodayGroup) {
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
      isToday: isTodayGroup,
      items,
    });
  }

  return groups;
}

interface DateSectionProps {
  group: DateGroup;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const DateSection: React.FC<DateSectionProps> = ({
  group,
  isCollapsed,
  onToggle,
  children,
}) => {
  return (
    <section
      className={`rounded-2xl sm:rounded-3xl border transition-all duration-200 ${
        group.isPinnedSection
          ? 'border-amber-500/35 bg-amber-500/[0.02] dark:bg-amber-500/[0.03] ring-1 ring-amber-500/20 shadow-md3-1'
          : group.isToday
          ? 'border-md3-primary/30 bg-md3-surface-container-low/40 dark:bg-md3-surface-container-low/20 ring-1 ring-md3-primary/15 shadow-md3-1'
          : 'border-md3-outline-variant/25 bg-md3-surface-container-low/25 dark:bg-md3-surface-container-low/10 shadow-sm'
      }`}
    >
      {/* Header bar inside the boundary - clickable to collapse/expand */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={!isCollapsed}
        className={`w-full sticky top-[4.25rem] z-10 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 cursor-pointer select-none transition-colors ${
          isCollapsed
            ? 'rounded-2xl sm:rounded-3xl bg-md3-surface-container-low/90 hover:bg-md3-surface-container-high/90'
            : 'rounded-t-2xl sm:rounded-t-3xl bg-md3-surface-container/90 hover:bg-md3-surface-container-high/90 border-b border-md3-outline-variant/20'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`p-2 rounded-xl flex items-center justify-center transition-colors ${
              group.isPinnedSection
                ? 'bg-amber-500/15 text-amber-500'
                : group.isToday
                ? 'bg-md3-primary/15 text-md3-primary'
                : 'bg-md3-surface-container-highest text-md3-on-surface-variant'
            }`}
          >
            {group.isPinnedSection ? (
              <Pin className="w-4 h-4 fill-current" />
            ) : (
              <Calendar className="w-4 h-4" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 min-w-0">
            <span className="text-base sm:text-lg font-bold text-md3-on-surface tracking-tight">
              {group.title}
            </span>
            {group.subtitle && (
              <span className="text-xs sm:text-sm text-md3-on-surface-variant font-medium flex items-center gap-1.5 truncate">
                <span className="text-md3-outline font-bold">•</span>
                <span>{group.subtitle}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className="text-xs font-semibold px-2.5 sm:px-3 py-1 rounded-full bg-md3-surface-container-high text-md3-on-surface-variant border border-md3-outline-variant/20">
            {group.items.length}{' '}
            {group.items.length === 1
              ? group.isPinnedSection
                ? 'pinned'
                : 'paste'
              : group.isPinnedSection
              ? 'pinned'
              : 'pastes'}
          </span>

          <div
            className={`p-1.5 rounded-full text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-md3-surface-container-high transition-transform duration-200 ${
              isCollapsed ? '-rotate-90' : 'rotate-0'
            }`}
            title={isCollapsed ? 'Expand section' : 'Collapse section'}
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Pastes enclosed INSIDE the boundary */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 md:p-6 rounded-b-2xl sm:rounded-b-3xl bg-md3-surface-container-lowest/50 dark:bg-md3-surface-container-lowest/20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {children}
          </div>
        </div>
      )}
    </section>
  );
};

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

  // Collapsed groups state persisted in localStorage
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('phaste_collapsed_groups');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('phaste_collapsed_groups', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Auto-expand Today when a new item is captured so newly added pastes are never hidden
  const firstItemId = items[0]?.id;
  const prevFirstItemIdRef = useRef(firstItemId);
  useEffect(() => {
    if (firstItemId && firstItemId !== prevFirstItemIdRef.current) {
      prevFirstItemIdRef.current = firstItemId;
      const todayKey = format(new Date(), 'yyyy-MM-dd');
      setCollapsedGroups((prev) => {
        if (prev[todayKey]) {
          const next = { ...prev, [todayKey]: false };
          try {
            localStorage.setItem('phaste_collapsed_groups', JSON.stringify(next));
          } catch (e) {}
          return next;
        }
        return prev;
      });
    }
  }, [firstItemId]);

  const allCollapsed = useMemo(() => {
    return dateGroups.length > 0 && dateGroups.every((g) => collapsedGroups[g.key]);
  }, [dateGroups, collapsedGroups]);

  const handleToggleAll = () => {
    const nextState = !allCollapsed;
    const newMap: Record<string, boolean> = {};
    for (const g of dateGroups) {
      newMap[g.key] = nextState;
    }
    setCollapsedGroups(newMap);
    try {
      localStorage.setItem('phaste_collapsed_groups', JSON.stringify(newMap));
    } catch (e) {}
  };

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

    const allSearchCollapsed = searchGroups.length > 0 && searchGroups.every((g) => collapsedGroups[g.key]);

    const handleToggleAllSearch = () => {
      const nextState = !allSearchCollapsed;
      const newMap: Record<string, boolean> = { ...collapsedGroups };
      for (const g of searchGroups) {
        newMap[g.key] = nextState;
      }
      setCollapsedGroups(newMap);
      try {
        localStorage.setItem('phaste_collapsed_groups', JSON.stringify(newMap));
      } catch (e) {}
    };

    return (
      <div className="space-y-6 sm:space-y-8">
        {searchGroups.length > 1 && (
          <div className="flex items-center justify-between px-1 text-xs text-md3-on-surface-variant font-medium">
            <span>
              {searchResults.length} search {searchResults.length === 1 ? 'match' : 'matches'} across {searchGroups.length} dates
            </span>
            <button
              type="button"
              onClick={handleToggleAllSearch}
              className="px-3 py-1 rounded-full bg-md3-surface-container-high hover:bg-md3-surface-container-highest text-md3-on-surface text-xs font-semibold border border-md3-outline-variant/20 transition-colors cursor-pointer"
            >
              {allSearchCollapsed ? 'Expand all' : 'Collapse all'}
            </button>
          </div>
        )}

        {searchGroups.map((group) => (
          <DateSection
            key={group.key}
            group={group}
            isCollapsed={Boolean(collapsedGroups[group.key])}
            onToggle={() => toggleGroup(group.key)}
          >
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
          </DateSection>
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
    <div className="space-y-6 sm:space-y-8">
      {dateGroups.length > 1 && (
        <div className="flex items-center justify-between px-1 text-xs text-md3-on-surface-variant font-medium">
          <span>
            {items.length} {items.length === 1 ? 'paste' : 'pastes'} across {dateGroups.length} dates
          </span>
          <button
            type="button"
            onClick={handleToggleAll}
            className="px-3 py-1 rounded-full bg-md3-surface-container-high hover:bg-md3-surface-container-highest text-md3-on-surface text-xs font-semibold border border-md3-outline-variant/20 transition-colors cursor-pointer"
          >
            {allCollapsed ? 'Expand all dates' : 'Collapse all dates'}
          </button>
        </div>
      )}

      {dateGroups.map((group) => (
        <DateSection
          key={group.key}
          group={group}
          isCollapsed={Boolean(collapsedGroups[group.key])}
          onToggle={() => toggleGroup(group.key)}
        >
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
        </DateSection>
      ))}
    </div>
  );
};
