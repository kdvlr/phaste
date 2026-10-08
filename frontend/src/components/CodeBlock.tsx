import React from 'react';

interface CodeBlockProps {
  content: string;
  maxHeight?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ content, maxHeight = 'max-h-60' }) => {
  return (
    <div className="rounded-xl bg-md3-surface-container-lowest border border-md3-outline-variant/30 overflow-hidden shadow-xs">
      <pre
        className={`p-3.5 sm:p-4 text-base font-mono text-md3-on-surface overflow-x-auto overflow-y-auto ${maxHeight} leading-relaxed select-text font-medium`}
      >
        <code>{content}</code>
      </pre>
    </div>
  );
};
