import React, { useRef, useState, useEffect } from 'react';
import { Search, X, Plus, Upload, Clipboard, Sparkles } from 'lucide-react';

interface OmnibarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onQuickPasteText: (text: string) => void;
  onUploadFile: (file: File) => void;
}

export const Omnibar: React.FC<OmnibarProps> = ({
  searchQuery,
  onSearchChange,
  onQuickPasteText,
  onUploadFile,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Global hotkeys: Cmd+K or / focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        onQuickPasteText(text.trim());
      }
    } catch {
      // If clipboard permission is blocked, focus search input
      inputRef.current?.focus();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      e.target.value = '';
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-6">
      <div
        className={`relative flex items-center gap-3 px-4 py-2.5 rounded-full bg-md3-surface-container-high border transition-all duration-200 ${
          isFocused
            ? 'border-md3-primary shadow-md3-3 ring-1 ring-md3-primary/30'
            : 'border-md3-outline-variant/30 hover:border-md3-outline-variant/60 shadow-md3-1'
        }`}
      >
        {/* Search / Sparkle Icon */}
        <div className="text-md3-on-surface-variant flex items-center shrink-0">
          {searchQuery ? (
            <Sparkles className="w-5 h-5 text-md3-primary animate-pulse" />
          ) : (
            <Search className="w-5 h-5 text-md3-outline" />
          )}
        </div>

        {/* Omnibar Input */}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search phastes, images, locations, or paste anywhere..."
          className="w-full bg-transparent text-sm text-md3-on-surface placeholder-md3-on-surface-variant/60 focus:outline-none"
        />

        {/* Clear query */}
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="p-1 rounded-full text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-md3-surface-container transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Shortcut Badge */}
        {!searchQuery && (
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-md3-outline bg-md3-surface-container-lowest px-2 py-0.5 rounded border border-md3-outline-variant/20">
            <span>⌘K</span>
          </div>
        )}

        <div className="h-5 w-[1px] bg-md3-outline-variant/30 shrink-0" />

        {/* Quick Action: File Upload */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded-full text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-md3-surface-container transition"
          title="Upload image or video file"
        >
          <Upload className="w-4 h-4" />
        </button>

        {/* Quick Action: Paste from Clipboard */}
        <button
          onClick={handlePasteClipboard}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-md3-primary text-md3-on-primary text-xs font-medium hover:brightness-105 active:scale-95 transition-all shadow-md3-1"
          title="Paste from clipboard immediately"
        >
          <Clipboard className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Paste</span>
        </button>
      </div>

      {/* Helper search syntax hints */}
      {isFocused && (
        <div className="mt-2 px-4 flex flex-wrap gap-2 text-[11px] text-md3-on-surface-variant/70 animate-in fade-in duration-150">
          <span>Search hints:</span>
          <span className="font-mono bg-md3-surface-container-low px-1.5 py-0.5 rounded border border-md3-outline-variant/20">kind:image</span>
          <span className="font-mono bg-md3-surface-container-low px-1.5 py-0.5 rounded border border-md3-outline-variant/20">city:Chicago</span>
          <span className="font-mono bg-md3-surface-container-low px-1.5 py-0.5 rounded border border-md3-outline-variant/20">kind:video</span>
          <span>or plain English description</span>
        </div>
      )}
    </div>
  );
};
