import React from 'react';
import { Phaste, SearchResultItem } from '../types';
import { PhasteCard } from './PhasteCard';
import { Sparkles, Inbox } from 'lucide-react';

interface PhasteFeedProps {
  items: Phaste[];
  searchResults?: SearchResultItem[] | null;
  isLoading: boolean;
  onPinToggle: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  onImageClick: (phaste: Phaste) => void;
  onToast: (msg: string) => void;
}

export const PhasteFeed: React.FC<PhasteFeedProps> = ({
  items,
  searchResults,
  isLoading,
  onPinToggle,
  onDelete,
  onImageClick,
  onToast,
}) => {
  // If search results are active, render them with match indicators
  if (searchResults !== null && searchResults !== undefined) {
    if (searchResults.length === 0 && !isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center text-md3-on-surface-variant">
          <Sparkles className="w-10 h-10 text-md3-outline mb-3 stroke-1" />
          <h3 className="text-sm font-medium text-md3-on-surface">No matches found</h3>
          <p className="text-xs text-md3-on-surface-variant/70 mt-1">
            Try adjusting your query or remove filter tags
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {searchResults.map(({ phaste, match_type, score }) => (
          <div key={phaste.id} className="relative">
            {match_type !== 'filter' && (
              <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-md3-primary-container text-md3-on-primary-container text-[10px] font-semibold shadow-md3-1">
                {match_type === 'hybrid' ? '⚡ Hybrid' : match_type === 'semantic' ? '🔮 Visual' : '📝 Text'}
              </span>
            )}
            <PhasteCard
              phaste={phaste}
              onPinToggle={onPinToggle}
              onDelete={onDelete}
              onImageClick={onImageClick}
              onToast={onToast}
            />
          </div>
        ))}
      </div>
    );
  }

  // Normal Feed
  if (items.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-md3-on-surface-variant">
        <div className="w-16 h-16 rounded-full bg-md3-surface-container-high flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-md3-primary stroke-1" />
        </div>
        <h3 className="text-base font-semibold text-md3-on-surface">Your Phastebin is empty</h3>
        <p className="text-xs text-md3-on-surface-variant/80 mt-1.5 max-w-sm leading-relaxed">
          Press <kbd className="px-1.5 py-0.5 bg-md3-surface-container rounded font-mono text-md3-primary">Cmd+V</kbd> anywhere
          or drag and drop files onto the window to capture in haste.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((phaste) => (
        <PhasteCard
          key={phaste.id}
          phaste={phaste}
          onPinToggle={onPinToggle}
          onDelete={onDelete}
          onImageClick={onImageClick}
          onToast={onToast}
        />
      ))}
    </div>
  );
};
