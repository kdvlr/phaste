import React, { HTMLAttributes } from 'react';

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * BoardUI Keyboard Shortcut Hint Badge (<Kbd>)
 * Renders a crisp, fully-rounded or slightly-rounded neutral pill with theme-safe contrast.
 */
export const Kbd: React.FC<KbdProps> = ({ children, className = '', ...props }) => {
  return (
    <kbd
      className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-tight whitespace-nowrap bg-[#8d6e63]/10 dark:bg-white/10 text-[#6d4c41] dark:text-[#d7ccc8] border border-[#8d6e63]/20 dark:border-white/10 shadow-[0_1px_1px_rgba(0,0,0,0.05)] select-none ${className}`}
      {...props}
    >
      {children}
    </kbd>
  );
};
