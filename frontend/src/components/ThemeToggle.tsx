import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { ThemeMode } from '../utils/theme';

interface ThemeToggleProps {
  theme: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onThemeChange }) => {
  const options: { mode: ThemeMode; label: string; icon: React.FC<{ className?: string }> }[] = [
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'system', label: 'Auto', icon: Monitor },
    { mode: 'dark', label: 'Dark', icon: Moon },
  ];

  const cycleTheme = () => {
    if (theme === 'light') onThemeChange('dark');
    else if (theme === 'dark') onThemeChange('system');
    else onThemeChange('light');
  };

  return (
    <>
      {/* Desktop Segmented Control */}
      <div
        className="hidden sm:inline-flex items-center p-0.5 rounded-full bg-md3-surface-container-high border border-md3-outline-variant/30 text-xs font-medium"
        role="group"
        aria-label="Theme selection"
      >
        {options.map(({ mode, label, icon: Icon }) => {
          const isActive = theme === mode;
          return (
            <button
              key={mode}
              onClick={() => onThemeChange(mode)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-150 ${
                isActive
                  ? 'bg-md3-primary text-md3-on-primary font-semibold shadow-sm'
                  : 'text-md3-on-surface-variant hover:text-md3-on-surface hover:bg-md3-surface-container'
              }`}
              title={`Switch to ${label} mode`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile Compact Cycle Button */}
      <button
        onClick={cycleTheme}
        className="sm:hidden p-2 rounded-full bg-md3-surface-container-high border border-md3-outline-variant/30 text-md3-on-surface-variant hover:text-md3-on-surface transition-colors"
        title={`Current theme: ${theme}. Click to switch.`}
        aria-label="Toggle theme"
      >
        {theme === 'light' ? (
          <Sun className="w-4 h-4 text-amber-500" />
        ) : theme === 'dark' ? (
          <Moon className="w-4 h-4 text-indigo-300" />
        ) : (
          <Monitor className="w-4 h-4 text-md3-primary" />
        )}
      </button>
    </>
  );
};
