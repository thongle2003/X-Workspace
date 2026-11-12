import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export const THEME_STORAGE_KEY = '2g2bt-theme';
const currentTheme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

function applyTheme(theme, persist = true) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#111827' : '#F3F4F6');
  if (persist) {
    try { localStorage.setItem(THEME_STORAGE_KEY, next); }
    catch { /* The selected theme still works for this session. */ }
  }
  window.dispatchEvent(new Event('2g2bt-theme-change'));
}

export function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(currentTheme);
  useEffect(() => {
    const sync = () => setTheme(currentTheme());
    const syncStorage = event => {
      if (event.key !== THEME_STORAGE_KEY) return;
      applyTheme(event.newValue, false);
    };
    window.addEventListener('2g2bt-theme-change', sync);
    window.addEventListener('storage', syncStorage);
    return () => {
      window.removeEventListener('2g2bt-theme-change', sync);
      window.removeEventListener('storage', syncStorage);
    };
  }, []);
  const dark = theme === 'dark';
  return <button type="button" className={`theme-toggle ${className}`} aria-label={dark ? 'Bật chế độ sáng' : 'Bật chế độ tối'} aria-pressed={dark} title={dark ? 'Chế độ sáng' : 'Chế độ tối'} onClick={() => applyTheme(dark ? 'light' : 'dark')}>
    {dark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
  </button>;
}
