import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Pin,
  Share2,
  Info,
  MoreVertical,
  Edit3,
  Eye,
  CheckSquare,
  List,
  Bold,
  Italic,
  Strikethrough,
  Link2,
  Table as TableIcon,
  Image as ImageIcon,
  Heading,
  Trash2,
  Archive,
  Sparkles,
} from 'lucide-react';
import { Phaste } from '../types';
import { getMediaUrl, updatePhaste, uploadPhasteFile } from '../api';
import { MarkdownRenderer } from '../utils/markdownRenderer';

interface NoteCanvasProps {
  phaste: Phaste | null;
  onUpdate: (updated: Partial<Phaste> & { id: string }) => void;
  onDelete: (phaste: Phaste) => void;
  onTogglePin: (phaste: Phaste) => void;
  onToggleInspector: () => void;
  isInspectorOpen: boolean;
  onBackMobile?: () => void;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
  onTagClick?: (tag: string) => void;
}

export const NoteCanvas: React.FC<NoteCanvasProps> = ({
  phaste,
  onUpdate,
  onDelete,
  onTogglePin,
  onToggleInspector,
  isInspectorOpen,
  onBackMobile,
  onShowToast,
  onTagClick,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isHeadingMenuOpen, setIsHeadingMenuOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<any>(null);

  // Sync state when active phaste changes
  useEffect(() => {
    if (phaste) {
      setTitle(phaste.title || '');
      setContent(phaste.content || phaste.ocr_transcript || '');
      // Default to view mode for rich rendering (user can click to edit or toggle B I U)
      setIsEditMode(false);
    } else {
      setTitle('');
      setContent('');
    }
  }, [phaste?.id]);

  if (!phaste) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-white dark:bg-[#1b1614] text-[#a1887f] p-8 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] dark:bg-[#241e1b] flex items-center justify-center text-3xl mb-4 shadow-sm">
          &#128221;
        </div>
        <h3 className="text-base font-semibold text-[#3e2723] dark:text-[#efebe9]">No Note Selected</h3>
        <p className="text-xs text-[#a1887f] max-w-sm mt-1">
          Select a note from the list, paste anywhere with <kbd className="px-1.5 py-0.5 rounded bg-[#e5e2da] dark:bg-[#3a2e2a] font-mono text-[10px]">Cmd+V</kbd>, or drop files to create one.
        </p>
      </div>
    );
  }

  // Auto-save logic
  const triggerAutoSave = (newTitle: string, newContent: string) => {
    if (!phaste) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await updatePhaste(phaste.id, {
          title: newTitle,
          content: newContent,
        });
        onUpdate(res);
      } catch (err: any) {
        onShowToast('Failed to save changes', 'error');
      }
    }, 600);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    triggerAutoSave(newTitle, content);
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    triggerAutoSave(title, newContent);
  };

  // Interactive Checklist Toggling (- [ ] ↔ - [x])
  const handleToggleCheckbox = (lineIndex: number, newChecked: boolean) => {
    const lines = content.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return;

    const targetLine = lines[lineIndex];
    const updatedLine = targetLine.replace(
      /^(\s*[-*]\s*\[)([ xX])(\])/,
      `$1${newChecked ? 'x' : ' '}$3`
    );
    lines[lineIndex] = updatedLine;
    const newContent = lines.join('\n');
    setContent(newContent);
    triggerAutoSave(title, newContent);
  };

  // Formatting helpers for toolbar
  const insertTextAtCursor = (prefix: string, suffix: string = '') => {
    setIsEditMode(true);
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) {
        const newContent = content + '\n' + prefix + suffix;
        handleContentChange(newContent);
        return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = textarea.value.substring(start, end);
      const replacement = prefix + selected + suffix;
      const newContent =
        textarea.value.substring(0, start) +
        replacement +
        textarea.value.substring(end);
      handleContentChange(newContent);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + prefix.length,
          start + prefix.length + selected.length
        );
      }, 0);
    }, 50);
  };

  const handleInsertTable = () => {
    const tableTemplate =
      '\n\n| Information | Detail | Reference |\n| --- | --- | --- |\n| Status | Vulnerable | [Facts](https://example.com) |\n| Population | 22,000 - 31,000 | [Source](https://example.com) |\n\n';
    insertTextAtCursor(tableTemplate);
  };

  const handleShareClick = () => {
    const shareUrl = `${window.location.origin}/sh/${phaste.public_slug}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      onShowToast('Public share URL copied to clipboard!', 'success');
    });
  };

  const handleAttachMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      onShowToast('Uploading media attachment...', 'info');
      const uploaded = await uploadPhasteFile(file, file.name);
      if (uploaded.media_path) {
        const mediaMd = `\n\n![${file.name}](/api/media/${uploaded.media_path})\n\n`;
        handleContentChange(content + mediaMd);
        onShowToast('Attachment embedded!', 'success');
      }
    } catch (err: any) {
      onShowToast('Attachment failed', 'error');
    }
  };

  const heroMediaUrl = phaste.media_path ? getMediaUrl(phaste.media_path) : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#1b1614] relative overflow-hidden">
      {/* Top Action Bar */}
      <div className="h-12 px-6 border-b border-[#e5e2da]/40 dark:border-[#4e342e]/40 flex items-center justify-between shrink-0 bg-white/80 dark:bg-[#1b1614]/80 backdrop-blur-sm z-10">
        <div className="flex items-center space-x-2">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="flex items-center space-x-1 text-xs text-[#8d6e63] dark:text-[#a1887f] font-medium p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 md:hidden"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Notes</span>
            </button>
          )}

          {/* Active Tag Pills */}
          {phaste.tags && phaste.tags.length > 0 && (
            <div className="hidden sm:flex items-center space-x-1">
              {phaste.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  onClick={() => onTagClick && onTagClick(tag)}
                  className="px-2 py-0.5 rounded-full bg-[#8d6e63]/10 text-[#6d4c41] dark:text-[#d7ccc8] text-[11px] font-mono cursor-pointer hover:bg-[#8d6e63]/20"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right Action Icons: B I U toggle, Pin, Share, Inspector i, More ⋮ */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* View / Edit Mode Toggle (B I U icon) */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-2.5 py-1 rounded-lg text-xs font-serif font-bold transition-colors ${
              isEditMode
                ? 'bg-[#8d6e63] text-white'
                : 'text-[#6d4c41] dark:text-[#d7ccc8] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title={isEditMode ? 'Switch to Live Render View' : 'Edit Markdown Text'}
          >
            <span className="tracking-widest">B I U</span>
          </button>

          {/* Pin */}
          <button
            onClick={() => onTogglePin(phaste)}
            className={`p-1.5 rounded-lg transition-colors ${
              phaste.is_pinned
                ? 'text-[#ff5f56] bg-[#ff5f56]/10'
                : 'text-[#6d4c41] dark:text-[#d7ccc8] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title={phaste.is_pinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin className="w-4 h-4" />
          </button>

          {/* Share */}
          <button
            onClick={handleShareClick}
            className="p-1.5 rounded-lg text-[#6d4c41] dark:text-[#d7ccc8] hover:bg-black/5 dark:hover:bg-white/5"
            title="Copy Public Share Link"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Inspector ⓘ */}
          <button
            onClick={onToggleInspector}
            className={`p-1.5 rounded-lg transition-colors ${
              isInspectorOpen
                ? 'bg-[#8d6e63]/20 text-[#3e2723] dark:text-white'
                : 'text-[#6d4c41] dark:text-[#d7ccc8] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title="Note Details Inspector"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* More Menu ⋮ */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1.5 rounded-lg text-[#6d4c41] dark:text-[#d7ccc8] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div
                className="absolute right-0 mt-1 w-44 rounded-xl bg-white dark:bg-[#2d2421] border border-[#e5e2da] dark:border-[#4e342e] shadow-lg py-1 z-30 text-xs"
                onClick={() => setShowMoreMenu(false)}
              >
                <button
                  onClick={() => onDelete(phaste)}
                  className="w-full px-3 py-2 flex items-center space-x-2 text-[#b3261e] hover:bg-[#b3261e]/10 text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Move to Trash</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Note Canvas Body */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 max-w-4xl mx-auto w-full pb-32">
        {/* Large Note Title (Editable with Leading Emoji) */}
        <div className="mb-6">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="🐼 Note Title..."
            className="w-full text-2xl sm:text-3xl font-bold tracking-tight bg-transparent text-[#3e2723] dark:text-[#efebe9] border-none focus:outline-none focus:ring-0 placeholder:text-[#a1887f]/50"
          />
        </div>

        {/* Hero Media (Image or Video) */}
        {heroMediaUrl && phaste.kind === 'image' && (
          <div className="mb-8 rounded-2xl overflow-hidden border border-[#e5e2da]/50 dark:border-[#4e342e]/50 shadow-sm max-h-[420px] bg-black/5">
            <img
              src={heroMediaUrl}
              alt={title}
              className="w-full h-full object-cover max-h-[420px]"
            />
          </div>
        )}

        {heroMediaUrl && phaste.kind === 'video' && (
          <div className="mb-8 rounded-2xl overflow-hidden border border-[#e5e2da]/50 dark:border-[#4e342e]/50 shadow-sm bg-black">
            <video
              controls
              playsInline
              className="w-full max-h-[420px]"
              src={heroMediaUrl}
            />
          </div>
        )}

        {/* Link Card Preview */}
        {phaste.kind === 'link' && phaste.metadata_context?.og && (
          <div className="mb-8 rounded-2xl overflow-hidden border border-[#e5e2da] dark:border-[#4e342e]/50 shadow-sm bg-[#fbfbfa] dark:bg-[#241e1b] p-4 flex flex-col sm:flex-row gap-4 items-center">
            {phaste.metadata_context.og.image_url && (
              <img
                src={phaste.metadata_context.og.image_url}
                alt=""
                className="w-full sm:w-48 h-32 object-cover rounded-xl"
              />
            )}
            <div className="flex-1 space-y-1">
              <a
                href={phaste.source_url || phaste.content || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-semibold text-[#3e2723] dark:text-[#efebe9] hover:underline"
              >
                {phaste.metadata_context.og.title || phaste.source_url} &nearr;
              </a>
              <p className="text-xs text-[#6d4c41] dark:text-[#d7ccc8] line-clamp-2">
                {phaste.metadata_context.og.description}
              </p>
              <div className="text-[11px] font-mono text-[#a1887f] truncate">
                {phaste.source_url}
              </div>
            </div>
          </div>
        )}

        {/* Content Area: Markdown View or Textarea Edit */}
        {isEditMode ? (
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Write note in haste... Markdown, #hashtags, and - [ ] checkboxes supported."
              className="w-full min-h-[350px] bg-transparent text-[#3e2723] dark:text-[#efebe9] font-sans text-sm leading-relaxed border-none focus:outline-none resize-none placeholder:text-[#a1887f]/50"
              autoFocus
            />
          </div>
        ) : (
          <div
            onDoubleClick={() => setIsEditMode(true)}
            className="cursor-text min-h-[250px]"
            title="Double click to edit markdown"
          >
            {content ? (
              <MarkdownRenderer
                content={content}
                onToggleCheckbox={handleToggleCheckbox}
                onTagClick={onTagClick}
              />
            ) : (
              <div className="text-sm text-[#a1887f] italic py-8">
                Click here or use the toolbar below to start writing.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Bottom Toolbar (Centered Pill) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center space-x-1.5 sm:space-x-3 px-3 sm:px-4 py-2 rounded-full bg-white/95 dark:bg-[#2d2421]/95 backdrop-blur-md border border-[#e5e2da] dark:border-[#4e342e] shadow-xl text-[#6d4c41] dark:text-[#d7ccc8]">
          {/* Heading H ⌵ */}
          <div className="relative">
            <button
              onClick={() => setIsHeadingMenuOpen(!isHeadingMenuOpen)}
              className="px-2 py-1 rounded text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 flex items-center space-x-0.5"
              title="Heading Level"
            >
              <span>H</span>
              <span className="text-[10px]">&#709;</span>
            </button>

            {isHeadingMenuOpen && (
              <div
                className="absolute bottom-10 left-0 w-28 rounded-xl bg-white dark:bg-[#2d2421] border border-[#e5e2da] dark:border-[#4e342e] shadow-xl py-1 text-xs z-30"
                onClick={() => setIsHeadingMenuOpen(false)}
              >
                <button
                  onClick={() => insertTextAtCursor('\n# ')}
                  className="w-full px-3 py-1.5 text-left font-bold hover:bg-black/5"
                >
                  H1 Heading
                </button>
                <button
                  onClick={() => insertTextAtCursor('\n## ')}
                  className="w-full px-3 py-1.5 text-left font-semibold hover:bg-black/5"
                >
                  H2 Heading
                </button>
                <button
                  onClick={() => insertTextAtCursor('\n### ')}
                  className="w-full px-3 py-1.5 text-left font-medium hover:bg-black/5"
                >
                  H3 Heading
                </button>
              </div>
            )}
          </div>

          {/* Checklist ☑ */}
          <button
            onClick={() => insertTextAtCursor('\n- [ ] ')}
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
            title="Task Checklist (- [ ])"
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          {/* Bullet List :≡ */}
          <button
            onClick={() => insertTextAtCursor('\n- ')}
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
            title="Bullet List (- )"
          >
            <List className="w-4 h-4" />
          </button>

          {/* Bold B */}
          <button
            onClick={() => insertTextAtCursor('**', '**')}
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 font-bold text-xs"
            title="Bold (**text**)"
          >
            <Bold className="w-4 h-4" />
          </button>

          {/* Italic I */}
          <button
            onClick={() => insertTextAtCursor('*', '*')}
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 italic text-xs"
            title="Italic (*text*)"
          >
            <Italic className="w-4 h-4" />
          </button>

          {/* Strikethrough ✎ */}
          <button
            onClick={() => insertTextAtCursor('~~', '~~')}
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
            title="Strikethrough (~~text~~)"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          {/* Link 🔗 */}
          <button
            onClick={() => insertTextAtCursor('[', '](https://)')}
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
            title="Insert Link"
          >
            <Link2 className="w-4 h-4" />
          </button>

          {/* Table ⊞ */}
          <button
            onClick={handleInsertTable}
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
            title="Insert Table"
          >
            <TableIcon className="w-4 h-4" />
          </button>

          {/* Image Upload 🖼 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
            title="Upload/Attach Image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAttachMedia}
            className="hidden"
            accept="image/*,video/*"
          />
        </div>
      </div>
    </div>
  );
};
