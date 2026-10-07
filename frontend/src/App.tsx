import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  UploadCloud,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { Phaste, SearchResultItem, SnackbarMessage } from './types';
import {
  fetchPhastes,
  searchPhastes,
  createPhasteText,
  uploadPhasteFile,
  updatePhaste,
  deletePhaste,
} from './api';
import { Omnibar } from './components/Omnibar';
import { FilterChips } from './components/FilterChips';
import { PhasteFeed } from './components/PhasteFeed';
import { ImageLightbox } from './components/ImageLightbox';
import { MetadataModal } from './components/MetadataModal';
import { PhasteDetailModal } from './components/PhasteDetailModal';
import { ThemeToggle } from './components/ThemeToggle';
import { Snackbar } from './components/Snackbar';
import { useAmbientCapture } from './hooks/useAmbientCapture';
import { useEvents } from './hooks/useEvents';
import { requestAndCacheLocation, requestLocationPermission, getLocationStatus } from './api';
import { getStoredTheme, applyTheme, subscribeToThemeChanges, ThemeMode } from './utils/theme';

export const App: React.FC = () => {
  const [phastes, setPhastes] = useState<Phaste[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResultItem[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKind, setSelectedKind] = useState('all');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeLightbox, setActiveLightbox] = useState<Phaste | null>(null);
  const [selectedPhasteForModal, setSelectedPhasteForModal] = useState<Phaste | null>(null);
  const [selectedDetailPhaste, setSelectedDetailPhaste] = useState<Phaste | null>(null);
  const [locationStatus, setLocationStatus] = useState<'granted' | 'prompt' | 'denied' | 'unsupported'>('prompt');
  const [theme, setTheme] = useState<ThemeMode>(getStoredTheme);
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);

  const showToast = useCallback((text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setSnackbar({ id: String(Date.now()), text, type });
  }, []);

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
    showToast(`Theme switched to ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode`, 'info');
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

  const loadPhastes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchPhastes(
        1,
        60,
        selectedKind === 'all' ? undefined : selectedKind,
        showPinnedOnly ? true : undefined
      );
      setPhastes(data.items);
    } catch (err: any) {
      showToast('Could not connect to phaste service', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedKind, showPinnedOnly, showToast]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      loadPhastes();
    }
  }, [selectedKind, showPinnedOnly, searchQuery, loadPhastes]);

  // 2. Debounced Hybrid Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await searchPhastes(searchQuery.trim());
        setSearchResults(res.results);
      } catch (err) {
        showToast('Search query failed', 'error');
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, showToast]);

  // 3. Ambient Global Capture Hook (Cmd+V anywhere & Drag-Drop)
  const { isDragging, isSubmitting } = useAmbientCapture({
    onSuccess: (newItem, msg) => {
      setPhastes((prev) => [newItem, ...prev.filter((p) => p.id !== newItem.id)]);
      showToast(msg, 'success');
    },
    onError: (err) => showToast(err, 'error'),
  });

  // 4. Live Server-Sent Events (SSE) background updates
  useEvents({
    onPhasteCreated: (newItem) => {
      setPhastes((prev) => [newItem, ...prev.filter((p) => p.id !== newItem.id)]);
    },
    onPhasteProcessed: (updatedItem) => {
      setPhastes((prev) => prev.map((p) => (p.id === updatedItem.id ? updatedItem : p)));
      if (searchResults) {
        setSearchResults((prev) =>
          prev?.map((r) => (r.phaste.id === updatedItem.id ? { ...r, phaste: updatedItem } : r)) || null
        );
      }
      setSelectedDetailPhaste((prev) => (prev?.id === updatedItem.id ? updatedItem : prev));
    },
    onPhasteDeleted: ({ id }) => {
      setPhastes((prev) => prev.filter((p) => p.id !== id));
      if (searchResults) {
        setSearchResults((prev) => prev?.filter((r) => r.phaste.id !== id) || null);
      }
      setSelectedDetailPhaste((prev) => (prev?.id === id ? null : prev));
    },
  });

  // 5. Actions: Pin Toggle & Delete
  const handlePinToggle = async (id: string, current: boolean) => {
    try {
      const updated = await updatePhaste(id, { is_pinned: !current });
      setPhastes((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setSelectedDetailPhaste((prev) => (prev?.id === id ? updated : prev));
      showToast(updated.is_pinned ? 'Pinned to top' : 'Unpinned');
    } catch {
      showToast('Failed to update pin status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePhaste(id);
      setPhastes((prev) => prev.filter((p) => p.id !== id));
      showToast('Phaste deleted');
    } catch {
      showToast('Failed to delete phaste', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-md3-surface text-md3-on-surface flex flex-col">
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-md3-primary/20 backdrop-blur-sm border-4 border-dashed border-md3-primary flex flex-col items-center justify-center pointer-events-none animate-in fade-in">
          <div className="p-6 rounded-md3-xl bg-md3-surface-container-high shadow-md3-4 flex flex-col items-center gap-3">
            <UploadCloud className="w-12 h-12 text-md3-primary animate-bounce" />
            <h2 className="text-lg font-bold text-md3-on-surface">Drop to Phaste</h2>
            <p className="text-xs text-md3-on-surface-variant">Instant capture of image, video, or files</p>
          </div>
        </div>
      )}

      {/* App Header */}
      <header className="sticky top-0 z-40 bg-md3-surface/90 backdrop-blur-md border-b border-md3-outline-variant/30 px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-md3-primary-container flex items-center justify-center text-md3-on-primary-container shadow-md3-1">
            <Zap className="w-4 h-4 fill-current stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-md3-on-surface flex items-center gap-2">
              <span>phaste</span>
              <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-md3-primary-container text-md3-on-primary-container tracking-wider">
                beta
              </span>
            </h1>
          </div>
        </div>

        {/* Action Controls & Ambient Status */}
        <div className="flex items-center gap-2.5 sm:gap-3 text-xs text-md3-on-surface-variant">
          {/* Light / Auto / Dark Mode Toggle */}
          <ThemeToggle theme={theme} onThemeChange={handleThemeChange} />

          {/* Location Permission Status / Trigger */}
          {locationStatus === 'granted' ? (
            <span
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold"
              title="High-accuracy GPS location attached to pastes"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>📍 GPS Active</span>
            </span>
          ) : locationStatus === 'prompt' ? (
            <button
              onClick={handleEnableLocation}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-md3-surface-container-high hover:bg-md3-surface-container-highest border border-md3-outline-variant/40 text-md3-on-surface text-xs font-medium transition-colors cursor-pointer"
              title="Click to allow browser location credentials for pastes"
            >
              <span>📍 Enable Location</span>
            </button>
          ) : locationStatus === 'denied' ? (
            <span
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-md3-surface-container-high text-md3-on-surface-variant/80 text-xs"
              title="Location permission denied in browser settings"
            >
              <span>📍 Location: Blocked</span>
            </span>
          ) : null}

          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>You (Owner)</span>
          </span>

          {isSubmitting ? (
            <span className="flex items-center gap-1.5 text-md3-primary font-semibold text-xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </span>
          ) : (
            <span className="hidden lg:flex items-center gap-1.5 text-xs text-md3-on-surface-variant font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Cmd+V to paste</span>
            </span>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6">
        {/* Omnibar (Unified search and capture control) */}
        <Omnibar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onQuickPasteText={async (text) => {
            try {
              const res = await createPhasteText(text);
              setPhastes((prev) => [res, ...prev]);
              showToast('Captured in haste!', 'success');
            } catch (err: any) {
              showToast(err.message, 'error');
            }
          }}
          onUploadFile={async (file) => {
            try {
              const res = await uploadPhasteFile(file);
              setPhastes((prev) => [res, ...prev]);
              showToast('Uploaded in haste!', 'success');
            } catch (err: any) {
              showToast(err.message, 'error');
            }
          }}
        />

        {/* Filter Chips */}
        {!searchQuery && (
          <div className="mb-6">
            <FilterChips
              selectedKind={selectedKind}
              onSelectKind={setSelectedKind}
              showPinnedOnly={showPinnedOnly}
              onTogglePinned={() => setShowPinnedOnly((v) => !v)}
            />
          </div>
        )}

        {/* Feed / Results */}
        <PhasteFeed
          items={phastes}
          searchResults={searchResults}
          isLoading={isLoading}
          onPinToggle={handlePinToggle}
          onDelete={handleDelete}
          onSelect={(p) => setSelectedDetailPhaste(p)}
          onImageClick={setActiveLightbox}
          onInspect={setSelectedPhasteForModal}
          onToast={showToast}
        />
      </main>

      {/* 4/5th Big Content Modal with 1/5th Context Sidebar (Request 4) */}
      <PhasteDetailModal
        phaste={selectedDetailPhaste}
        isOpen={Boolean(selectedDetailPhaste)}
        onClose={() => setSelectedDetailPhaste(null)}
        onPinToggle={handlePinToggle}
        onToast={showToast}
      />

      {/* Fullscreen Image Lightbox Modal */}
      <ImageLightbox phaste={activeLightbox} onClose={() => setActiveLightbox(null)} />

      {/* Capture Context Inspector Modal */}
      <MetadataModal
        phaste={selectedPhasteForModal}
        isOpen={Boolean(selectedPhasteForModal)}
        onClose={() => setSelectedPhasteForModal(null)}
      />

      {/* Non-blocking Transient Material 3 Snackbar */}
      <Snackbar message={snackbar} onDismiss={() => setSnackbar(null)} />
    </div>
  );
};
