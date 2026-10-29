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
  emptyTrash,
  requestAndCacheLocation,
  requestLocationPermission,
  getLocationStatus,
} from './api';
import { Sidebar } from './components/Sidebar';
import { NotesList } from './components/NotesList';
import { NoteCanvas } from './components/NoteCanvas';
import { MetadataInspector } from './components/MetadataInspector';
import { UnpinConfirmDialog } from './components/UnpinConfirmDialog';
import { EmptyTrashConfirmDialog } from './components/EmptyTrashConfirmDialog';
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
  const [selectedPhasteId, setSelectedPhasteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Phaste[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Inspector & Dialogs State
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [unpinTarget, setUnpinTarget] = useState<Phaste | null>(null);
  const [isEmptyTrashConfirmOpen, setIsEmptyTrashConfirmOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);
  const pendingDeletions = React.useRef<
    Map<string, { phaste: Phaste; index: number; timer: any }>
  >(new Map());

  // Clean up pending deletion timers on unmount
  useEffect(() => {
    return () => {
      pendingDeletions.current.forEach((val) => clearTimeout(val.timer));
    };
  }, []);

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
  // Note: Only depends on [selectedCollection, selectedTag].
  // Never re-fetches when user changes active note selection!
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
      // If no phaste is selected, pick the first one
      setSelectedPhasteId((currId) => {
        if (!currId && data.items.length > 0 && window.innerWidth >= 768) {
          return data.items[0].id;
        }
        return currId;
      });
    } catch {
      showToast('Failed to load phastes', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCollection, selectedTag, showToast]);

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

  // 5. Global Ambient Capture (Cmd+V clipboard & Drag-and-Drop) with Instant Optimistic UI
  const { isDragging } = useAmbientCapture({
    onOptimisticCreate: (tempPhaste) => {
      setPhastes((prev) => [tempPhaste, ...prev]);
      setSelectedPhasteId(tempPhaste.id);
      setMobileScreen('detail');
    },
    onSuccess: (realItem, msg, tempId) => {
      setPhastes((prev) =>
        tempId
          ? prev.map((p) => (p.id === tempId ? realItem : p))
          : [realItem, ...prev.filter((p) => p.id !== realItem.id)]
      );
      setSelectedPhasteId(realItem.id);
      loadCategories();
      showToast(msg, 'success');
    },
    onError: (err, tempId) => {
      if (tempId) {
        setPhastes((prev) => prev.filter((p) => p.id !== tempId));
      }
      showToast(err, 'error');
    },
  });

  // 6. Live SSE Updates
  useEvents({
    onPhasteCreated: (newItem) => {
      setPhastes((prev) => {
        if (prev.some((p) => p.id === newItem.id)) return prev;
        return [newItem, ...prev];
      });
      loadCategories();
    },
    onPhasteProcessed: (updatedItem) => {
      setPhastes((prev) =>
        prev.map((p) => (p.id === updatedItem.id ? updatedItem : p))
      );
      loadCategories();
    },
    onPhasteUpdated: (updatedItem) => {
      setPhastes((prev) =>
        prev.map((p) =>
          p.id === updatedItem.id ? { ...p, ...updatedItem } : p
        )
      );
      loadCategories();
    },
    onPhasteDeleted: ({ id }) => {
      setPhastes((prev) => prev.filter((p) => p.id !== id));
      setSelectedPhasteId((curr) => (curr === id ? null : curr));
      loadCategories();
    },
  });

  // Derived selected phaste without causing re-renders of the list!
  const selectedPhaste = useMemo(() => {
    if (!selectedPhasteId) return phastes[0] || null;
    return phastes.find((p) => p.id === selectedPhasteId) || phastes[0] || null;
  }, [phastes, selectedPhasteId]);

  // 7. Instant Create Phaste Handler (0ms optimistic response)
  const handleNewPhaste = async () => {
    const tempId = `temp-${Date.now()}`;
    const defaultTag = selectedTag ? `#${selectedTag} ` : '';
    const initialText = `${defaultTag}\n\n`;

    const optimistic: Phaste = {
      id: tempId,
      public_slug: 'pending',
      kind: 'text',
      status: 'ready',
      title: '📝 Untitled Phaste',
      content: initialText,
      tags: selectedTag ? [selectedTag] : [],
      is_pinned: false,
      is_archived: false,
      is_trash: false,
      is_todo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata_context: {
        author: { name: 'You', label: 'You', is_owner: true, source: 'local' },
      },
    };

    // Deliver immediately to UI (<1ms)
    setPhastes((prev) => [optimistic, ...prev]);
    setSelectedPhasteId(tempId);
    setMobileScreen('detail');

    try {
      const realItem = await createPhasteText(initialText, 'text', '📝 Untitled Phaste');
      setPhastes((prev) => prev.map((p) => (p.id === tempId ? realItem : p)));
      setSelectedPhasteId(realItem.id);
      loadCategories();
      showToast('Created new phaste', 'success');
    } catch {
      setPhastes((prev) => prev.filter((p) => p.id !== tempId));
      showToast('Failed to create phaste', 'error');
    }
  };

  // Instant note selection (0ms, zero network requests, no screen flash)
  const handleSelectPhaste = (p: Phaste) => {
    setSelectedPhasteId(p.id);
    setMobileScreen('detail');
  };

  const handleTogglePin = (p: Phaste) => {
    if (p.is_pinned) {
      setUnpinTarget(p);
    } else {
      updatePhaste(p.id, { is_pinned: true })
        .then((updated) => {
          setPhastes((prev) =>
            prev.map((item) => (item.id === p.id ? updated : item))
          );
          loadCategories();
          showToast('Pinned phaste to top', 'success');
        })
        .catch(() => showToast('Failed to pin phaste', 'error'));
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
        loadCategories();
        showToast('Unpinned phaste', 'info');
      })
      .catch(() => showToast('Failed to unpin phaste', 'error'));
  };

  const handleDeletePhaste = (p: Phaste) => {
    const originalIndex = phastes.findIndex((item) => item.id === p.id);
    const remaining = phastes.filter((item) => item.id !== p.id);

    // Optimistically remove from list immediately (0ms visual response)
    setPhastes(remaining);

    // If active phaste is being deleted, move selection to adjacent phaste
    if (selectedPhasteId === p.id) {
      const nextPhaste = remaining[originalIndex] || remaining[originalIndex - 1] || null;
      setSelectedPhasteId(nextPhaste?.id || null);
      if (window.innerWidth < 768 && !nextPhaste) {
        setMobileScreen('list');
      }
    }

    if (!p.is_trash) {
      // Mark as trash on backend immediately
      updatePhaste(p.id, { is_trash: true }).catch(console.error);
      loadCategories();
    }

    // Schedule permanent cleanup / commit after 20 seconds
    const timer = setTimeout(async () => {
      pendingDeletions.current.delete(p.id);
      if (p.is_trash) {
        try {
          await deletePhaste(p.id);
        } catch (e) {
          console.error('Permanent delete error:', e);
        }
        loadCategories();
      }
    }, 20000);

    pendingDeletions.current.set(p.id, { phaste: p, index: originalIndex, timer });

    // Show 20-second snackbar with Undo action
    setSnackbar({
      id: `delete-${p.id}-${Date.now()}`,
      text: p.is_trash ? 'Phaste permanently deleted' : 'Phaste moved to Trash',
      actionLabel: 'Undo',
      duration: 20000,
      onAction: async () => {
        const entry = pendingDeletions.current.get(p.id);
        if (entry) {
          clearTimeout(entry.timer);
          pendingDeletions.current.delete(p.id);

          if (!p.is_trash) {
            await updatePhaste(p.id, { is_trash: false }).catch(console.error);
          }

          setPhastes((prev) => {
            const copy = [...prev];
            const insertIdx = Math.min(entry.index, copy.length);
            copy.splice(insertIdx, 0, entry.phaste);
            return copy;
          });
          setSelectedPhasteId(entry.phaste.id);
          loadCategories();
          showToast('Phaste restored', 'success');
        }
      },
    });
  };

  const handleEmptyTrashRequest = () => {
    if (collections.trash === 0) {
      showToast('Trash is already empty', 'info');
      return;
    }
    setIsEmptyTrashConfirmOpen(true);
  };

  const handleConfirmEmptyTrash = async () => {
    setIsEmptyTrashConfirmOpen(false);
    try {
      // Cancel any pending undo timers for items in trash
      pendingDeletions.current.forEach((val, key) => {
        if (val.phaste.is_trash) {
          clearTimeout(val.timer);
          pendingDeletions.current.delete(key);
        }
      });

      const res = await emptyTrash();
      if (selectedCollection === 'trash') {
        setPhastes([]);
        setSelectedPhasteId(null);
        if (window.innerWidth < 768) {
          setMobileScreen('list');
        }
      }
      await loadCategories();
      showToast(
        `Trash emptied (${res.deleted_count} ${res.deleted_count === 1 ? 'phaste' : 'phastes'} permanently deleted)`,
        'success'
      );
    } catch (err) {
      console.error('Failed to empty trash:', err);
      showToast('Failed to empty trash', 'error');
    }
  };

  const handlePhasteUpdated = (updated: Partial<Phaste> & { id: string }) => {
    setPhastes((prev) =>
      prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
    );
    loadCategories();
  };

  // Header Title in middle column
  const activeTitle = useMemo(() => {
    if (selectedTag) return `#${selectedTag}`;
    switch (selectedCollection) {
      case 'all':
        return 'Phastes';
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
        return 'Phastes';
    }
  }, [selectedCollection, selectedTag]);

  const displayedPhastes = searchResults !== null ? searchResults : phastes;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f5f5f7] dark:bg-[#1b1614] text-[#3e2723] dark:text-[#efebe9] font-sans antialiased">
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
        onEmptyTrash={handleEmptyTrashRequest}
      />

      {/* Pane 2: Phastes List Column */}
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
          onNewPhaste={handleNewPhaste}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onTogglePin={handleTogglePin}
          onDeletePhaste={handleDeletePhaste}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onEmptyTrash={handleEmptyTrashRequest}
          isLoading={isLoading}
        />
      </div>

      {/* Pane 3: Phaste Canvas */}
      <div
        className={`${
          mobileScreen === 'detail' ? 'flex' : 'hidden'
        } md:flex flex-1 flex-col h-full overflow-hidden`}
      >
        <NoteCanvas
          phaste={selectedPhaste}
          onUpdate={handlePhasteUpdated}
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
            handlePhasteUpdated(updated);
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

      {/* Empty Trash Confirmation Dialog */}
      <EmptyTrashConfirmDialog
        isOpen={isEmptyTrashConfirmOpen}
        count={collections.trash}
        onConfirm={handleConfirmEmptyTrash}
        onCancel={() => setIsEmptyTrashConfirmOpen(false)}
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
