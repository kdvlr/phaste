import React, { useEffect, useRef, useState } from 'react';
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
  Folder,
  Plus,
  MoreHorizontal,
  Pencil,
  FolderPlus,
} from 'lucide-react';
import { CollectionType, CategoryItem, SystemCollections } from '../types';
import { ThemeMode } from '../utils/theme';
import { Kbd } from './base/Kbd';

interface SidebarProps {
  selectedCollection: CollectionType;
  onSelectCollection: (col: CollectionType) => void;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  categories: CategoryItem[];
  collections: SystemCollections;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  locationStatus: 'granted' | 'prompt' | 'denied' | 'unsupported';
  onEnableLocation: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onEmptyTrash?: () => void;
  onNewPhaste: () => void;
  onCreateCategory?: (name: string) => Promise<void>;
  onRenameCategory?: (oldName: string, newName: string) => Promise<void>;
  onDeleteCategory?: (name: string) => Promise<void>;
}

// Maps category names to contextual Lucide icons
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
  return Folder;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedCollection,
  onSelectCollection,
  selectedCategory,
  onSelectCategory,
  categories,
  collections,
  theme,
  onThemeChange,
  locationStatus,
  onEnableLocation,
  isMobileOpen = false,
  onCloseMobile,
  onEmptyTrash,
  onNewPhaste,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
}) => {
  const [isPhastesExpanded, setIsPhastesExpanded] = useState(true);

  // Category creation & inline editing state
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const createInputRef = useRef<HTMLInputElement>(null);

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [menuOpenCategory, setMenuOpenCategory] = useState<string | null>(null);

  // Tap-and-pause tracker
  const pressTimerRef = useRef<any>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressRef = useRef<boolean>(false);

  // Close context menu on outside click
  useEffect(() => {
    if (!menuOpenCategory) return;
    const handleOutsideClick = () => setMenuOpenCategory(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [menuOpenCategory]);

  const handleSelectCollection = (col: CollectionType) => {
    onSelectCategory(null);
    onSelectCollection(col);
    if (onCloseMobile) onCloseMobile();
  };

  const handleSelectCategory = (cat: string) => {
    onSelectCategory(cat);
    if (onCloseMobile) onCloseMobile();
  };

  const startRename = (name: string) => {
    setEditingCategory(name);
    setRenameValue(name);
    setTimeout(() => {
      if (renameInputRef.current) {
        renameInputRef.current.focus();
        renameInputRef.current.select();
      }
    }, 50);
  };

  const handleRenameSubmit = async (oldName: string) => {
    const trimmed = renameValue.trim();
    setEditingCategory(null);
    if (!trimmed || trimmed === oldName) return;
    if (onRenameCategory) {
      await onRenameCategory(oldName, trimmed);
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, oldName: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit(oldName);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingCategory(null);
    }
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewCategoryName('');
    setTimeout(() => {
      createInputRef.current?.focus();
    }, 50);
  };

  const handleCreateSubmit = async () => {
    const trimmed = newCategoryName.trim();
    setIsCreating(false);
    if (!trimmed) return;
    if (onCreateCategory) {
      await onCreateCategory(trimmed);
    }
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsCreating(false);
    }
  };

  // Pointer events for "tap and pause" to rename
  const handlePointerDown = (catName: string, e: React.PointerEvent) => {
    touchStartPosRef.current = { x: e.clientX, y: e.clientY };
    isLongPressRef.current = false;
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);

    // Tap and pause timer (420ms)
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      startRename(catName);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(30);
      }
    }, 420);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!touchStartPosRef.current) return;
    const dx = Math.abs(e.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(e.clientY - touchStartPosRef.current.y);
    if (dx > 8 || dy > 8) {
      // User is scrolling or moving pointer, cancel tap-and-pause
      if (pressTimerRef.current) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
    }
  };

  const handlePointerUp = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  const handleCategoryClick = (catName: string, e: React.MouseEvent) => {
    // If tap-and-pause / long-press already activated rename, don't re-select
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

    if (editingCategory === catName) {
      return;
    }

    if (selectedCategory === catName) {
      // Already selected category: tapping it enters rename mode (tap and pause / click selected)
      startRename(catName);
    } else {
      handleSelectCategory(catName);
    }
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

        {/* Create New Phaste Button */}
        <div className="px-3 pt-3 pb-1 shrink-0">
          <button
            onClick={() => {
              onNewPhaste();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#8d6e63] hover:bg-[#795548] active:bg-[#6d4c41] text-white font-medium text-xs shadow-sm hover:shadow active:scale-[0.99] transition-all group"
            title="Create new phaste (⌘N)"
          >
            <div className="flex items-center space-x-2">
              <Plus className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span>New Phaste</span>
            </div>
            <Kbd className="bg-white/20 text-white/95 border-white/10 text-[10px] px-1.5 py-0.5">⌘N</Kbd>
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 text-sm">
          {/* Phastes Accordion */}
          <div>
            <button
              onClick={() => setIsPhastesExpanded(!isPhastesExpanded)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#a1887f] hover:text-[#efebe9] transition-colors"
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-3.5 h-3.5 text-[#d7ccc8]" />
                <span>Phastes</span>
              </div>
              {isPhastesExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {isPhastesExpanded && (
              <div className="mt-1 space-y-0.5">
                {/* All Phastes */}
                <button
                  onClick={() => handleSelectCollection('all')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    selectedCollection === 'all' && selectedCategory === null
                      ? 'bg-[#3a2e2a] text-white font-medium'
                      : 'text-[#d7ccc8] hover:bg-[#2d2421]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-4 h-4 text-[#a1887f]" />
                    <span>All Phastes</span>
                  </div>
                  <span className="text-xs px-1.5 py-0.2 text-[#a1887f]">
                    {collections.all}
                  </span>
                </button>

                {/* Uncategorized */}
                <button
                  onClick={() => handleSelectCollection('uncategorized')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    (selectedCollection === 'uncategorized' || selectedCollection === 'untagged') && selectedCategory === null
                      ? 'bg-[#3a2e2a] text-white font-medium'
                      : 'text-[#d7ccc8] hover:bg-[#2d2421]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <FileQuestion className="w-4 h-4 text-[#a1887f]" />
                    <span>Uncategorized</span>
                  </div>
                  <span className="text-xs px-1.5 py-0.2 text-[#a1887f]">
                    {collections.uncategorized ?? collections.untagged ?? 0}
                  </span>
                </button>

                {/* Todo */}
                <button
                  onClick={() => handleSelectCollection('todo')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    selectedCollection === 'todo' && selectedCategory === null
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
                    selectedCollection === 'today' && selectedCategory === null
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
                    selectedCollection === 'pinned' && selectedCategory === null
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
                    selectedCollection === 'media' && selectedCategory === null
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
                    selectedCollection === 'archive' && selectedCategory === null
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
                <div
                  className={`group w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    selectedCollection === 'trash' && selectedCategory === null
                      ? 'bg-[#3a2e2a] text-white font-medium'
                      : 'text-[#d7ccc8] hover:bg-[#2d2421]'
                  }`}
                >
                  <button
                    onClick={() => handleSelectCollection('trash')}
                    className="flex-1 flex items-center space-x-2.5 text-left"
                  >
                    <Trash2 className="w-4 h-4 text-[#a1887f]" />
                    <span>Trash</span>
                  </button>
                  <div className="flex items-center space-x-1.5">
                    {collections.trash > 0 && onEmptyTrash && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEmptyTrash();
                        }}
                        className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-300 hover:text-white bg-rose-900/50 hover:bg-rose-700/80 rounded transition-all"
                        title="Empty Trash"
                      >
                        Empty
                      </button>
                    )}
                    <span className="text-xs px-1.5 py-0.2 text-[#a1887f]">
                      {collections.trash}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Categories Section */}
          <div className="pt-2 border-t border-[#3a2e2a]/40">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#a1887f]">
                Categories
              </span>
              <button
                type="button"
                onClick={handleStartCreate}
                className="p-1 rounded-md text-[#a1887f] hover:text-[#efebe9] hover:bg-[#3a2e2a] active:scale-95 transition-all"
                title="Create New Category (+)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-1 space-y-0.5">
              {/* Inline Create Input */}
              {isCreating && (
                <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-[#3a2e2a] text-white animate-in fade-in duration-150">
                  <FolderPlus className="w-3.5 h-3.5 text-[#ffbd2e] shrink-0" />
                  <input
                    ref={createInputRef}
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={handleCreateKeyDown}
                    onBlur={handleCreateSubmit}
                    placeholder="New category..."
                    className="w-full bg-[#1b1614] text-xs text-white font-medium px-2 py-0.5 rounded border border-[#ffbd2e] focus:outline-none"
                    autoFocus
                  />
                </div>
              )}

              {categories.length === 0 && !isCreating ? (
                <div className="px-3 py-2 text-xs text-[#a1887f]/70 italic">
                  No categories yet. Click + to add one.
                </div>
              ) : (
                categories.map((cat) => {
                  const IconComponent = getCategoryIcon(cat.name);
                  const isSelected = selectedCategory === cat.name;
                  const isEditing = editingCategory === cat.name;

                  if (isEditing) {
                    return (
                      <div
                        key={cat.name}
                        className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-[#3a2e2a] text-white"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconComponent className="w-3.5 h-3.5 text-[#ffbd2e] shrink-0" />
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => handleRenameKeyDown(e, cat.name)}
                          onBlur={() => handleRenameSubmit(cat.name)}
                          className="w-full bg-[#1b1614] text-xs text-white font-medium px-1.5 py-0.5 rounded border border-[#ffbd2e] focus:outline-none"
                          autoFocus
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={cat.name}
                      onPointerDown={(e) => handlePointerDown(cat.name, e)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      onClick={(e) => handleCategoryClick(cat.name, e)}
                      onDoubleClick={() => startRename(cat.name)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors group cursor-pointer select-none relative ${
                        isSelected
                          ? 'bg-[#3a2e2a] text-white font-medium'
                          : 'text-[#d7ccc8] hover:bg-[#2d2421]'
                      }`}
                      title={isSelected ? 'Tap again or pause to rename' : 'Click to filter, tap & pause to rename'}
                    >
                      <div className="flex items-center space-x-2.5 truncate flex-1 min-w-0">
                        <IconComponent
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected
                              ? 'text-[#ffbd2e]'
                              : 'text-[#a1887f] group-hover:text-[#d7ccc8]'
                          }`}
                        />
                        <span className="truncate">{cat.name}</span>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0 ml-1.5">
                        {/* More options button on hover */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenCategory(
                                menuOpenCategory === cat.name ? null : cat.name
                              );
                            }}
                            className="p-1 rounded text-[#a1887f] hover:text-[#efebe9] hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Category options"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>

                          {menuOpenCategory === cat.name && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-full mt-1 z-30 w-32 bg-[#2d2421] border border-[#4e342e] rounded-xl shadow-xl py-1 text-xs"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuOpenCategory(null);
                                  startRename(cat.name);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-[#3a2e2a] text-[#efebe9] flex items-center space-x-2"
                              >
                                <Pencil className="w-3 h-3 text-[#ffbd2e]" />
                                <span>Rename</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuOpenCategory(null);
                                  if (
                                    onDeleteCategory &&
                                    confirm(
                                      `Delete category "${cat.name}"? Notes will become uncategorized.`
                                    )
                                  ) {
                                    onDeleteCategory(cat.name);
                                  }
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-[#b3261e]/20 text-[#f2b8b5] flex items-center space-x-2"
                              >
                                <Trash2 className="w-3 h-3 text-[#b3261e]" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <span className="text-xs px-1.5 py-0.2 text-[#a1887f] shrink-0 font-mono">
                          {cat.count}
                        </span>
                      </div>
                    </div>
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
