import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Theme, THEME_STORAGE_KEY } from './theme';

describe('Theme', () => {
  const root = document.documentElement;
  // jsdom has no matchMedia, so each test installs a fake one when it needs a system preference.
  const browserWindow = document.defaultView as unknown as {
    matchMedia?: (query: string) => { matches: boolean };
  };

  function systemPrefersDark(prefersDark: boolean): void {
    browserWindow.matchMedia = vi.fn(() => ({ matches: prefersDark }));
  }

  afterEach(() => {
    delete browserWindow.matchMedia;
    localStorage.clear();
    root.style.colorScheme = '';
  });

  it('starts from the system setting', () => {
    systemPrefersDark(true);
    const theme = TestBed.inject(Theme);

    expect(theme.scheme()).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');
  });

  it('uses the choice the visitor made last time', () => {
    systemPrefersDark(true);
    localStorage.setItem(THEME_STORAGE_KEY, 'light');

    expect(TestBed.inject(Theme).scheme()).toBe('light');
  });

  it('switches between light and dark, and remembers the choice', () => {
    systemPrefersDark(false);
    const theme = TestBed.inject(Theme);

    theme.toggle();
    expect(theme.scheme()).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    theme.toggle();
    expect(theme.scheme()).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('falls back to light when the browser cannot report a preference', () => {
    expect(TestBed.inject(Theme).scheme()).toBe('light');
  });
});
