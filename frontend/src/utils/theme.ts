export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'phaste_theme';

export function getStoredTheme(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'system';
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'system';
}

export function isSystemDark(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(mode: ThemeMode): boolean {
  if (typeof document === 'undefined') return true;
  const isDark = mode === 'dark' || (mode === 'system' && isSystemDark());
  const root = document.documentElement;

  if (isDark) {
    root.classList.add('dark');
    root.classList.remove('light');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }

  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch (_) {}

  return isDark;
}

export function subscribeToThemeChanges(onThemeChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system');
      onThemeChange();
    }
  };

  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}
