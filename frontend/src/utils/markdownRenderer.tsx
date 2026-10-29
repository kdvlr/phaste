import React from 'react';

interface MarkdownRendererProps {
  content: string;
  onToggleCheckbox?: (lineIndex: number, newChecked: boolean) => void;
  onTagClick?: (tag: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  onToggleCheckbox,
  onTagClick,
}) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = '';

  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (!inTable) return;
    const currentHeader = [...tableHeader];
    const currentRows = [...tableRows];
    tableHeader = [];
    tableRows = [];
    inTable = false;

    elements.push(
      <div key={`table-${elements.length}`} className="my-4 overflow-x-auto rounded-xl border border-[#e5e2da] dark:border-[#4e342e]/40 shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          {currentHeader.length > 0 && (
            <thead className="bg-[#f5f5f7] dark:bg-[#2d2421] text-[#3e2723] dark:text-[#efebe9] border-b border-[#e5e2da] dark:border-[#4e342e]/40">
              <tr>
                {currentHeader.map((th, i) => (
                  <th key={i} className="px-4 py-2.5 font-semibold">
                    {renderInline(th, onTagClick)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-[#e5e2da]/40 dark:divide-[#4e342e]/30 bg-white dark:bg-[#1b1614]">
            {currentRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-4 py-2.5 text-[#3e2723] dark:text-[#d7ccc8]">
                    {renderInline(cell, onTagClick)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const flushCodeBlock = () => {
    if (!inCodeBlock) return;
    const text = codeBlockLines.join('\n');
    elements.push(
      <pre
        key={`code-${elements.length}`}
        className="my-3 p-4 rounded-xl bg-[#241e1b] text-[#f5f5f7] font-mono text-xs overflow-x-auto border border-[#4e342e]/40 leading-relaxed"
      >
        <code>{text}</code>
      </pre>
    );
    codeBlockLines = [];
    codeBlockLang = '';
    inCodeBlock = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Code Block Fence (```)
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        flushTable();
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // 2. Table parsing (| col 1 | col 2 |)
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      // Check if this is separator line (| --- | --- |)
      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));
      if (isSeparator) {
        // Just marks separator, keep table open
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    // 3. Task List Item (- [ ] or - [x])
    const taskMatch = line.match(/^(\s*)[-*]\s*\[([ xX])\]\s*(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[2].toLowerCase() === 'x';
      const textAfter = taskMatch[3];
      elements.push(
        <div
          key={`task-${i}`}
          className="flex items-start space-x-2.5 my-1.5 group select-none cursor-pointer"
          onClick={() => onToggleCheckbox && onToggleCheckbox(i, !isChecked)}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => onToggleCheckbox && onToggleCheckbox(i, !isChecked)}
            className="mt-1 h-4 w-4 rounded border-2 border-[#8d6e63] text-[#8d6e63] focus:ring-[#8d6e63] focus:ring-offset-0 cursor-pointer transition-transform group-hover:scale-105"
          />
          <span
            className={`text-sm leading-relaxed transition-all ${
              isChecked
                ? 'line-through text-[#8d6e63]/60 dark:text-[#a1887f]/60'
                : 'text-[#3e2723] dark:text-[#efebe9]'
            }`}
          >
            {renderInline(textAfter, onTagClick)}
          </span>
        </div>
      );
      continue;
    }

    // 4. Bullet lists (- item or * item)
    if (/^\s*[-*]\s+/.test(line)) {
      const itemText = line.replace(/^\s*[-*]\s+/, '');
      elements.push(
        <li key={`li-${i}`} className="ml-5 list-disc text-sm text-[#3e2723] dark:text-[#efebe9] my-1 leading-relaxed">
          {renderInline(itemText, onTagClick)}
        </li>
      );
      continue;
    }

    // 5. Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-2xl font-bold text-[#3e2723] dark:text-[#efebe9] mt-6 mb-2 tracking-tight">
          {renderInline(line.slice(2), onTagClick)}
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-xl font-semibold text-[#3e2723] dark:text-[#efebe9] mt-5 mb-2 tracking-tight">
          {renderInline(line.slice(3), onTagClick)}
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-lg font-semibold text-[#3e2723] dark:text-[#efebe9] mt-4 mb-1.5">
          {renderInline(line.slice(4), onTagClick)}
        </h3>
      );
      continue;
    }

    // 6. Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-4 border-[#8d6e63] pl-4 py-1 my-3 text-sm italic text-[#6d4c41] dark:text-[#d7ccc8] bg-black/[0.02] dark:bg-white/[0.02] rounded-r-lg"
        >
          {renderInline(line.slice(2), onTagClick)}
        </blockquote>
      );
      continue;
    }

    // 7. Empty line
    if (!line.trim()) {
      elements.push(<div key={`empty-${i}`} className="h-3" />);
      continue;
    }

    // 8. Normal paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm text-[#3e2723] dark:text-[#efebe9] leading-relaxed my-1.5">
        {renderInline(line, onTagClick)}
      </p>
    );
  }

  flushTable();
  flushCodeBlock();

  return <div className="space-y-0.5 font-sans leading-relaxed">{elements}</div>;
};

/**
 * Parses inline formatting:
 * - Bold: **text**
 * - Italic: *text*
 * - Strikethrough: ~~text~~
 * - Inline Code: `code`
 * - Links: [label](url)
 * - Hashtags: #tag (styled as rounded chips)
 */
function renderInline(text: string, onTagClick?: (tag: string) => void): React.ReactNode[] {
  if (!text) return [];

  // Tokenize regex
  // 1: bold, 2: italic, 3: strike, 4: code, 5: link, 6: hashtag
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|`[^`]+`|\[[^\]]+\]\([^)]+\)|#([a-zA-Z0-9_\-]+))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-[#3e2723] dark:text-[#efebe9]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={`i-${match.index}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      parts.push(
        <del key={`del-${match.index}`} className="line-through opacity-70">
          {token.slice(2, -2)}
        </del>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`c-${match.index}`}
          className="px-1.5 py-0.5 rounded bg-[#e5e2da]/40 dark:bg-[#3a2e2a] font-mono text-xs text-[#6d4c41] dark:text-[#d7ccc8]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const label = token.slice(1, token.indexOf(']('));
      const url = token.slice(token.indexOf('](') + 2, -1);
      parts.push(
        <a
          key={`a-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#b3261e] hover:underline font-medium inline-flex items-center gap-0.5"
        >
          <span>{label}</span>
          <span className="text-[10px]">&#8599;</span>
        </a>
      );
    } else if (token.startsWith('#')) {
      const tagName = token.slice(1);
      parts.push(
        <span
          key={`tag-${match.index}`}
          onClick={(e) => {
            e.stopPropagation();
            onTagClick && onTagClick(tagName);
          }}
          className="inline-block mx-0.5 px-2 py-0.5 rounded-md bg-[#e5e2da]/70 dark:bg-[#3a2e2a] text-xs font-mono font-medium text-[#6d4c41] dark:text-[#d7ccc8] hover:bg-[#8d6e63]/20 cursor-pointer transition-colors"
        >
          #{tagName}
        </span>
      );
    } else {
      parts.push(token);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
