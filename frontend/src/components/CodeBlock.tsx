import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  content: string;
  maxHeight?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ content, maxHeight = 'max-h-60' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = content.split('\n').length;

  return (
    <div className="relative group rounded-md3-md bg-md3-surface-container-lowest border border-md3-outline-variant/30 overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-2 bg-md3-surface-container-low/70 border-b border-md3-outline-variant/20 text-xs text-md3-on-surface-variant font-mono font-medium">
        <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'} • {content.length} chars</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-md3-surface-container text-md3-on-surface-variant hover:text-md3-on-surface transition-colors cursor-pointer text-xs font-semibold"
          title="Copy content"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre
        className={`p-3.5 sm:p-4 text-sm font-mono text-md3-on-surface overflow-x-auto overflow-y-auto ${maxHeight} leading-[1.65] select-text`}
      >
        <code>{content}</code>
      </pre>
    </div>
  );
};
