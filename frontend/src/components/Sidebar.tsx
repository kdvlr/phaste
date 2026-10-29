import React, { useState } from 'react';
import {
  FileText,
  FileQuestion,
  CheckSquare,
  Calendar,
  Pin,
  Image as ImageIcon,
  Archive,
  Trash2,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  MapPin,
  Sun,
  Moon,
  Laptop,
  Hash,
  User,
  Users,
  Heart,
  Feather,
  Code2,
  UtensilsCrossed,
  FlaskConical,
  GraduationCap,
  Plane,
  X,
} from 'lucide-react';
import { CollectionType, CategoryItem, SystemCollections } from '../types';
import { ThemeMode } from '../utils/theme';

interface SidebarProps {
  selectedCollection: CollectionType;
  onSelectCollection: (col: CollectionType) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  categories: CategoryItem[];
  collections: SystemCollections;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  locationStatus: 'granted' | 'prompt' | 'denied' | 'unsupported';
  onEnableLocation: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

// Maps category names to contextual Lucide icons matching screenshot
function getCategoryIcon(name: string) {
  const lower = name.toLowerCase();
  if (/bear|pet|dog|cat|animal|zoo|polar/.test(lower)) return Heart;
  if (/personal|self|me/.test(lower)) return User;
  if (/family|friends|people|kids/.test(lower)) return Users;
  if (/health|fitness|med|workout/.test(lower)) return Heart;
  if (/blog|post|article|write|journal/.test(lower)) return Feather;
  if (/code|swift|python|dev|git|tech|ts|js/.test(lower)) return Code2;
  if (/recipe|food|cook|pizza|dinner|lunch/.test(lower)) return UtensilsCrossed;
  if (/science|bio|lab|chem|physics/.test(lower)) return FlaskConical;
  if (/study|learn|school|book|course/.test(lower)) return GraduationCap;
  if (/travel|flight|trip|hotel|paris|tokyo/.test(lower)) return Plane;
  return Hash;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedCollection,
  onSelectCollection,
  selectedTag,
  onSelectTag,
  categories,
  collections,
  theme,
  onThemeChange,
  locationStatus,
  onEnableLocation,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [isNotesExpanded, setIsNotesExpanded] = useState(true);

  const handleSelectCollection = (col: CollectionType) => {
    onSelectTag(null);
    onSelectCollection(col);
    if (onCloseMobile) onCloseMobile();
  };

  const handleSelectTag = (tag: string) => {
    onSelectTag(tag);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-[#1f1b18] text-[#e7e5e4] border-r border-[#3a2e2a]/50 select-none transition-transform duration-300 md:static md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Traffic Lights / Window Controls */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-[#3a2e2a]/40 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-sm" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-sm" />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const nextTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
                onThemeChange(nextTheme);
              }}
              className="p-1 rounded text-[#a1887f] hover:text-[#efebe9] hover:bg-[#2d2421] transition-colors"
              title={`Theme: ${theme}`}
            >
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : theme === 'light' ? <Sun className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
            </button>
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="p-1 rounded text-[#a1887f] hover:text-[#efebe9] md:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 text-sm">
          {/* Notes Accordion */}
          <div>
            <button
              onClick={() => setIsNotesExpanded(!isNotesExpanded)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#a1887f] hover:text-[#efebe9] transition-colors"
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-3.5 h-3.5 text-[#d7ccc8]" />
                <span>Notes</span>
              </div>
              {isNotesExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {isNotesExpanded && (
              <div className="mt-1 space-y-0.5">
                {/* All Notes */}
                <button
                  onClick={() => handleSelectCollection('all')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    selectedCollection === 'all' && selectedTag === null
                      ? 'bg-[#3a2e2a] text-white font-medium'
                      : 'text-[#d7ccc8] hover:bg-[#2d2421]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-4 h-4 text-[#a1887f]" />
                    <span>All Notes</span>
                  </div>
                  <span className="text-xs px-1.5 py-0.2 text-[#a1887f]">
                    {collections.all}
                  </span>
                </button>

                {/* Untagged */}
                <button
                  onClick={() => handleSelectCollection('untagged')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    selectedCollection === 'untagged' && selectedTag === null
                      ? 'bg-[#3a2e2a] text-white font-medium'
                      : 'text-[#d7ccc8] hover:bg-[#2d2421]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <FileQuestion className="w-4 h-4 text-[#a1887f]" />
                    <span>Untagged</span>
                  </div>
                  <span className="text-xs px-1.5 py-0.2 text-[#a1887f]">
                    {collections.untagged}
                  </span>
                </button>

                {/* Todo */}
                <button
                  onClick={() => handleSelectCollection('todo')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    selectedCollection === 'todo' && selectedTag === null
                      ? 'bg-[#3a2e2a] text-white font-medium'
                      : 'text-[#d7ccc8] hover:bg-[#2d2421]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <CheckSquare className="w-4 h-4 text-[#a1887f]" />
                    <span>Todo</span>
                  </div>
                  <span className="text-xs px-1.5 py-0.2 text-[#a1887f]">
                    {collections.todo}
                  </span>
                </button>

                {/* Today */}
                <button
                  onClick={() => handleSelectCollection('today')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    selectedCollection === 'today' && selectedTag === null
                      ? 'bg-[#3a2e2a] text-white font-medium'
                      : 'text-[#d7ccc8] hover:bg-[#2d2421]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Calendar className="w-4 h-4 text-[#a1887f]" />
                    <span>Today</span>
                  </div>
                  <span className="text-xs px-1.5 py-0.2 text-[#a1887f]">
                    {collections.today}
                  </span>
                </button>

                {/* Pinned */}
                <button
                  onClick={() => handleSelectCollection('pinned')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    selectedCollection === 'pinned' && selectedTag === null
                      ? 'bg-[#3a2e2a] text-white font-medium'
                      : 'text-[#d7ccc8] hover:bg-[#2d2421]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Pin className="w-4 h-4 text-[#a1887f]" />
                    <span>Pinned</span>
                  </div>
                  <span className="text-xs px-1.5 py-0.2 text-[#a1887f]">
                    {collections.pinned}
                  </span>
                </button>

                {/* Media */}
                <button
                  onClick={() => handleSelectCollection('media')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    selectedCollection === 'media' && selectedTag === null
                      ? 'bg-[#3a2e2a] text-white font-medium'
                      : 'text-[#d7ccc8] hover:bg-[#2d2421]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <ImageIcon className="w-4 h-4 text-[#a1887f]" />
                    <span>Media</span>
                  </div>
                  <span className="text-xs px-1.5 py-0.2 text-[#a1887f]">
                    {collections.media}
                  </span>
                </button>

                {/* Archive */}
                <button
                  onClick={() => handleSelectCollection('archive')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    selectedCollection === 'archive' && selectedTag === null
                      ? 'bg-[#3a2e2a] text-white font-medium'
                      : 'text-[#d7ccc8] hover:bg-[#2d2421]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Archive className="w-4 h-4 text-[#a1887f]" />
                    <span>Archive</span>
                  </div>
                  <span className="text-xs px-1.5 py-0.2 text-[#a1887f]">
                    {collections.archive}
                  </span>
                </button>

                {/* Trash */}
                <button
                  onClick={() => handleSelectCollection('trash')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    selectedCollection === 'trash' && selectedTag === null
                      ? 'bg-[#3a2e2a] text-white font-medium'
                      : 'text-[#d7ccc8] hover:bg-[#2d2421]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Trash2 className="w-4 h-4 text-[#a1887f]" />
                    <span>Trash</span>
                  </div>
                  <span className="text-xs px-1.5 py-0.2 text-[#a1887f]">
                    {collections.trash}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Dynamic Categories Section */}
          <div className="pt-2 border-t border-[#3a2e2a]/40">
            <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[#a1887f]">
              Tags
            </div>

            <div className="mt-1 space-y-0.5">
              {categories.length === 0 ? (
                <div className="px-3 py-2 text-xs text-[#a1887f]/70 italic">
                  No tags yet. Use #hashtags in notes to auto-categorize.
                </div>
              ) : (
                categories.map((cat) => {
                  const IconComponent = getCategoryIcon(cat.name);
                  const isSelected = selectedTag === cat.name;

                  return (
                    <button
                      key={cat.name}
                      onClick={() => handleSelectTag(cat.name)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors group ${
                        isSelected
                          ? 'bg-[#3a2e2a] text-white font-medium'
                          : 'text-[#d7ccc8] hover:bg-[#2d2421]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#ffbd2e]' : 'text-[#a1887f] group-hover:text-[#d7ccc8]'}`} />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <span className="text-xs px-1.5 py-0.2 text-[#a1887f] shrink-0">
                        {cat.count}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer info: Location & Version */}
        <div className="p-3 border-t border-[#3a2e2a]/40 text-xs text-[#a1887f] flex items-center justify-between shrink-0">
          <button
            onClick={onEnableLocation}
            className={`flex items-center space-x-1.5 px-2 py-1 rounded transition-colors ${
              locationStatus === 'granted'
                ? 'text-[#27c93f] hover:bg-[#2d2421]'
                : 'text-[#a1887f] hover:text-[#efebe9] hover:bg-[#2d2421]'
            }`}
            title={locationStatus === 'granted' ? 'GPS Active' : 'Click to enable location permissions'}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{locationStatus === 'granted' ? 'GPS Active' : 'Enable GPS'}</span>
          </button>

          <span className="text-[11px] opacity-60">Phaste</span>
        </div>
      </aside>
    </>
  );
};
