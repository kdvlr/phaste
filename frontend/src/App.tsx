import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UploadCloud } from 'lucide-react';
import {
  Phaste,
  CollectionType,
  CategoryItem,
  SystemCollections,
  SnackbarMessage,
} from './types';
import {
  fetchPhastes,
  fetchCategories,
  searchPhastes,
  createPhasteText,
  uploadPhasteFile,
  updatePhaste,
  deletePhaste,
  requestAndCacheLocation,
  requestLocationPermission,
  getLocationStatus,
} from './api';
import { Sidebar } from './components/Sidebar';
import { NotesList } from './components/NotesList';
import { NoteCanvas } from './components/NoteCanvas';
import { MetadataInspector } from './components/MetadataInspector';
import { UnpinConfirmDialog } from './components/UnpinConfirmDialog';
import { Snackbar } from './components/Snackbar';
import { useAmbientCapture } from './hooks/useAmbientCapture';
import { useEvents } from './hooks/useEvents';
import {
  getStoredTheme,
  applyTheme,
  subscribeToThemeChanges,
  ThemeMode,
} from './utils/theme';

export const App: React.FC = () => {
  // Navigation & Filtering State
  const [selectedCollection, setSelectedCollection] = useState<CollectionType>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [collections, setCollections] = useState<SystemCollections>({
    all: 0,
    today: 0,
    pinned: 0,
    media: 0,
    todo: 0,
    untagged: 0,
    archive: 0,
    trash: 0,
  });

  // Notes & Content State
  const [phastes, setPhastes] = useState<Phaste[]>([]);
  const [selectedPhaste, setSelectedPhaste] = useState<Phaste | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Phaste[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Inspector & Dialogs State
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [unpinTarget, setUnpinTarget] = useState<Phaste | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);

  // Mobile Drill-down Navigation: 'list' or 'detail' (sidebar opens via drawer)
  const [mobileScreen, setMobileScreen] = useState<'list' | 'detail'>('list');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Theme & Location
  const [theme, setTheme] = useState<ThemeMode>(getStoredTheme);
  const [locationStatus, setLocationStatus] = useState<
    'granted' | 'prompt' | 'denied' | 'unsupported'
  >('prompt');

  const showToast = useCallback(
    (text: string, type: 'info' | 'success' | 'error' = 'info') => {
      setSnackbar({ id: String(Date.now()), text, type });
    },
    []
  );

  // 1. Initial Theme & Geolocation Setup
  useEffect(() => {
    applyTheme(theme);
    const unsubscribe = subscribeToThemeChanges(() => {
      if (getStoredTheme() === 'system') {
        applyTheme('system');
        setTheme('system');
      }
    });
    return unsubscribe;
  }, [theme]);

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    showToast(
      `Theme switched to ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode`,
      'info'
    );
  };

  useEffect(() => {
    requestAndCacheLocation();
    getLocationStatus().then((s) => setLocationStatus(s));
  }, []);

  const handleEnableLocation = async () => {
    const granted = await requestLocationPermission();
    if (granted) {
      setLocationStatus('granted');
      showToast('Location permission granted! GPS coordinates active.', 'success');
    } else {
      setLocationStatus('denied');
      showToast('Location permission denied or unavailable.', 'info');
    }
  };

  // 2. Fetch Categories & Counts
  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchCategories();
      setCollections(data.collections);
      setCategories(data.categories);
    } catch {
      // silently tolerate initial offline
    }
  }, []);

  // 3. Fetch Phastes for active collection / tag
  const loadPhastes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchPhastes(
        1,
        60,
        undefined,
        undefined,
        selectedCollection,
        selectedTag || undefined
      );
      setPhastes(data.items);
      // Automatically select the first note if none is selected on desktop
      if (!selectedPhaste && data.items.length > 0 && window.innerWidth >= 768) {
        setSelectedPhaste(data.items[0]);
      } else if (selectedPhaste) {
        // Refresh selected note if present in list
        const refreshed = data.items.find((p) => p.id === selectedPhaste.id);
        if (refreshed) setSelectedPhaste(refreshed);
      }
    } catch {
      showToast('Failed to load notes', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCollection, selectedTag, selectedPhaste, showToast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      loadPhastes();
    }
  }, [selectedCollection, selectedTag, searchQuery, loadPhastes]);

  // 4. Debounced Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await searchPhastes(searchQuery.trim());
        setSearchResults(res.results.map((r) => r.phaste));
      } catch {
        showToast('Search query failed', 'error');
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, showToast]);

  // 5. Global Ambient Capture (Cmd+V clipboard & Drag-and-Drop)
  const { isDragging } = useAmbientCapture({
    onSuccess: (newItem, msg) => {
      setPhastes((prev) => [newItem, ...prev.filter((p) => p.id !== newItem.id)]);
      setSelectedPhaste(newItem);
      setMobileScreen('detail');
      loadCategories();
      showToast(msg, 'success');
    },
    onError: (err) => showToast(err, 'error'),
  });

  // 6. Live SSE Updates
  useEvents({
    onPhasteCreated: (newItem) => {
      setPhastes((prev) => [newItem, ...prev.filter((p) => p.id !== newItem.id)]);
      loadCategories();
    },
    onPhasteProcessed: (updatedItem) => {
      setPhastes((prev) =>
        prev.map((p) => (p.id === updatedItem.id ? updatedItem : p))
      );
      if (selectedPhaste?.id === updatedItem.id) {
        setSelectedPhaste(updatedItem);
      }
      loadCategories();
    },
    onPhasteUpdated: (updatedItem) => {
      setPhastes((prev) =>
        prev.map((p) =>
          p.id === updatedItem.id ? { ...p, ...updatedItem } : p
        )
      );
      if (selectedPhaste?.id === updatedItem.id) {
        setSelectedPhaste((prev) => (prev ? { ...prev, ...updatedItem } : null));
      }
      loadCategories();
    },
    onPhasteDeleted: ({ id }) => {
      setPhastes((prev) => prev.filter((p) => p.id !== id));
      if (selectedPhaste?.id === id) {
        setSelectedPhaste(null);
        setMobileScreen('list');
      }
      loadCategories();
    },
  });

  // 7. Note Handlers
  const handleNewNote = async () => {
    try {
      const defaultTag = selectedTag ? `#${selectedTag} ` : '';
      const initialText = `${defaultTag}\n\n`;
      const newNote = await createPhasteText(initialText, 'text', '📝 Untitled');
      setPhastes((prev) => [newNote, ...prev]);
      setSelectedPhaste(newNote);
      setMobileScreen('detail');
      loadCategories();
      showToast('Created new note', 'success');
    } catch {
      showToast('Failed to create note', 'error');
    }
  };

  const handleSelectPhaste = (p: Phaste) => {
    setSelectedPhaste(p);
    setMobileScreen('detail');
  };

  const handleTogglePin = (p: Phaste) => {
    if (p.is_pinned) {
      // Prompt unpin confirmation dialog
      setUnpinTarget(p);
    } else {
      // Pin immediately
      updatePhaste(p.id, { is_pinned: true })
        .then((updated) => {
          setPhastes((prev) =>
            prev.map((item) => (item.id === p.id ? updated : item))
          );
          if (selectedPhaste?.id === p.id) setSelectedPhaste(updated);
          loadCategories();
          showToast('Pinned note to top', 'success');
        })
        .catch(() => showToast('Failed to pin note', 'error'));
    }
  };

  const handleConfirmUnpin = () => {
    if (!unpinTarget) return;
    const target = unpinTarget;
    setUnpinTarget(null);
    updatePhaste(target.id, { is_pinned: false })
      .then((updated) => {
        setPhastes((prev) =>
          prev.map((item) => (item.id === target.id ? updated : item))
        );
        if (selectedPhaste?.id === target.id) setSelectedPhaste(updated);
        loadCategories();
        showToast('Unpinned note', 'info');
      })
      .catch(() => showToast('Failed to unpin note', 'error'));
  };

  const handleDeletePhaste = async (p: Phaste) => {
    try {
      if (p.is_trash) {
        // Permanent delete
        await deletePhaste(p.id);
        showToast('Permanently deleted phaste', 'info');
      } else {
        // Move to trash
        await updatePhaste(p.id, { is_trash: true });
        showToast('Moved note to Trash', 'info');
      }
      setPhastes((prev) => prev.filter((item) => item.id !== p.id));
      if (selectedPhaste?.id === p.id) {
        setSelectedPhaste(null);
        setMobileScreen('list');
      }
      loadCategories();
    } catch {
      showToast('Failed to delete phaste', 'error');
    }
  };

  const handleNoteUpdated = (updated: Partial<Phaste> & { id: string }) => {
    setPhastes((prev) =>
      prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
    );
    if (selectedPhaste?.id === updated.id) {
      setSelectedPhaste((prev) => (prev ? { ...prev, ...updated } : null));
    }
    loadCategories();
  };

  // Header Title in middle column
  const activeTitle = useMemo(() => {
    if (selectedTag) return `#${selectedTag}`;
    switch (selectedCollection) {
      case 'all':
        return 'Notes';
      case 'untagged':
        return 'Untagged';
      case 'todo':
        return 'Todo';
      case 'today':
        return 'Today';
      case 'pinned':
        return 'Pinned';
      case 'media':
        return 'Media';
      case 'archive':
        return 'Archive';
      case 'trash':
        return 'Trash';
      default:
        return 'Notes';
    }
  }, [selectedCollection, selectedTag]);

  const displayedPhastes = searchResults !== null ? searchResults : phastes;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1b1614] text-[#3e2723] dark:text-[#efebe9] font-sans antialiased">
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-[#8d6e63]/20 backdrop-blur-sm border-4 border-dashed border-[#8d6e63] flex flex-col items-center justify-center pointer-events-none animate-in fade-in">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#2d2421] shadow-2xl flex flex-col items-center gap-3">
            <UploadCloud className="w-12 h-12 text-[#8d6e63] animate-bounce" />
            <h2 className="text-lg font-bold text-[#3e2723] dark:text-[#efebe9]">
              Drop to Phaste
            </h2>
            <p className="text-xs text-[#a1887f]">
              Instant capture of image, video, or files
            </p>
          </div>
        </div>
      )}

      {/* Pane 1: Left Sidebar (Desktop + Mobile Drawer) */}
      <Sidebar
        selectedCollection={selectedCollection}
        onSelectCollection={(col) => {
          setSelectedCollection(col);
          setSelectedTag(null);
        }}
        selectedTag={selectedTag}
        onSelectTag={(tag) => {
          setSelectedTag(tag);
        }}
        categories={categories}
        collections={collections}
        theme={theme}
        onThemeChange={handleThemeChange}
        locationStatus={locationStatus}
        onEnableLocation={handleEnableLocation}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Pane 2: Notes List Column */}
      <div
        className={`${
          mobileScreen === 'list' ? 'flex' : 'hidden'
        } md:flex flex-col h-full`}
      >
        <NotesList
          phastes={displayedPhastes}
          selectedPhaste={selectedPhaste}
          onSelectPhaste={handleSelectPhaste}
          activeTitle={activeTitle}
          onNewNote={handleNewNote}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onTogglePin={handleTogglePin}
          onDeletePhaste={handleDeletePhaste}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          isLoading={isLoading}
        />
      </div>

      {/* Pane 3: Note Canvas */}
      <div
        className={`${
          mobileScreen === 'detail' ? 'flex' : 'hidden'
        } md:flex flex-1 flex-col h-full overflow-hidden`}
      >
        <NoteCanvas
          phaste={selectedPhaste}
          onUpdate={handleNoteUpdated}
          onDelete={handleDeletePhaste}
          onTogglePin={handleTogglePin}
          onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
          isInspectorOpen={isInspectorOpen}
          onBackMobile={() => setMobileScreen('list')}
          onShowToast={showToast}
          onTagClick={(tag) => {
            setSelectedTag(tag);
            if (window.innerWidth < 768) setMobileScreen('list');
          }}
        />
      </div>

      {/* Pane 4 / Slide-over: Metadata Inspector */}
      {isInspectorOpen && selectedPhaste && (
        <MetadataInspector
          phaste={selectedPhaste}
          onClose={() => setIsInspectorOpen(false)}
          onPhasteUpdated={(updated) => {
            handleNoteUpdated(updated);
            loadCategories();
          }}
          onShowToast={showToast}
        />
      )}

      {/* Unpin Confirmation Dialog */}
      <UnpinConfirmDialog
        isOpen={Boolean(unpinTarget)}
        phaste={unpinTarget}
        onConfirm={handleConfirmUnpin}
        onCancel={() => setUnpinTarget(null)}
      />

      {/* Toast Snackbar Notification */}
      {snackbar && (
        <Snackbar
          message={snackbar}
          onDismiss={() => setSnackbar(null)}
        />
      )}
    </div>
  );
};
export default App;
