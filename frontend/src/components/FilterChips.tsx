import React from 'react';
import { Layers, Link2, Image, Video, FileText, Code2, Pin } from 'lucide-react';

interface FilterChipsProps {
  selectedKind: string;
  onSelectKind: (kind: string) => void;
  showPinnedOnly: boolean;
  onTogglePinned: () => void;
  counts?: Record<string, number>;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  selectedKind,
  onSelectKind,
  showPinnedOnly,
  onTogglePinned,
}) => {
  const chips = [
    { id: 'all', label: 'All', icon: Layers },
    { id: 'link', label: 'Links', icon: Link2 },
    { id: 'image', label: 'Images', icon: Image },
    { id: 'video', label: 'Videos', icon: Video },
    { id: 'text', label: 'Notes', icon: FileText },
    { id: 'richtext', label: 'Rich Text', icon: Code2 },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-none">
      {chips.map(({ id, label, icon: Icon }) => {
        const isSelected = selectedKind === id && !showPinnedOnly;
        return (
          <button
            key={id}
            onClick={() => {
              if (showPinnedOnly) onTogglePinned();
              onSelectKind(id);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
              isSelected
                ? 'bg-md3-primary-container text-md3-on-primary-container border-transparent shadow-md3-1'
                : 'bg-md3-surface-container-low text-md3-on-surface-variant border-md3-outline-variant/30 hover:bg-md3-surface-container hover:text-md3-on-surface'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        );
      })}

      <div className="h-4 w-[1px] bg-md3-outline-variant/30 mx-1" />

      {/* Pinned filter toggle */}
      <button
        onClick={onTogglePinned}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
          showPinnedOnly
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md3-1'
            : 'bg-md3-surface-container-low text-md3-on-surface-variant border-md3-outline-variant/30 hover:bg-md3-surface-container'
        }`}
      >
        <Pin className="w-3.5 h-3.5" />
        <span>Pinned</span>
      </button>
    </div>
  );
};
