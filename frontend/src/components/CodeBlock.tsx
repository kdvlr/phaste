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
    <div className="relative group rounded-md3-md bg-md3-surface-container-lowest border border-md3-outline-variant/20 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-md3-surface-container-low/50 border-b border-md3-outline-variant/10 text-[10px] text-md3-on-surface-variant font-mono">
        <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'} • {content.length} chars</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-md3-surface-container text-md3-on-surface-variant hover:text-md3-on-surface transition-colors"
          title="Copy content"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre
        className={`p-3 text-xs font-mono text-md3-on-surface overflow-x-auto overflow-y-auto ${maxHeight} leading-relaxed select-text`}
      >
        <code>{content}</code>
      </pre>
    </div>
  );
};
