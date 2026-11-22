import { useState, useCallback } from 'react';

type Theme = 'light dark' | 'light' | 'dark';

function setMetaColorScheme(value: Theme) {
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="color-scheme"]',
  );
  if (meta) meta.content = value;
}

function getSystemPreference(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function useTheme() {
  const [storedValue, setStoredValue] = useState<'light' | 'dark' | null>(
    () => {
      try {
        const v = localStorage.getItem('bookify-color-scheme');
        return v === 'light' || v === 'dark' ? v : null;
      } catch {
        return null;
      }
    },
  );

  // The currently rendered scheme: stored value OR system preference
  const resolvedScheme: 'light' | 'dark' = storedValue ?? getSystemPreference();

  const toggle = useCallback(() => {
    // Target = opposite of what is currently rendered
    const target: 'light' | 'dark' = resolvedScheme === 'dark' ? 'light' : 'dark';
    const system = getSystemPreference();

    if (target !== system) {
      // Differs from system → pin it
      try { localStorage.setItem('bookify-color-scheme', target); } catch { /* noop */ }
      setMetaColorScheme(target);
      setStoredValue(target);
    } else {
      // Matches system → undo override
      try { localStorage.removeItem('bookify-color-scheme'); } catch { /* noop */ }
      setMetaColorScheme('light dark');
      setStoredValue(null);
    }
  }, [resolvedScheme]);

  return { resolvedScheme, toggle };
}
