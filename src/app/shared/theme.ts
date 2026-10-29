import { DOCUMENT, inject, Service, signal } from '@angular/core';

export type ColorScheme = 'light' | 'dark';

// index.html reads the same key before the app starts, so a saved theme doesn't flash.
export const THEME_STORAGE_KEY = 'hn-reader-theme';

/**
 * Light or dark mode. Starts from the system setting and remembers the visitor's choice.
 * The Material theme picks its colours from the page's `color-scheme`, so that's all this sets.
 */
@Service()
export class Theme {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;

  readonly scheme = signal<ColorScheme>(this.savedScheme() ?? this.systemScheme());

  constructor() {
    this.apply(this.scheme());
  }

  toggle(): void {
    const next = this.scheme() === 'dark' ? 'light' : 'dark';
    this.scheme.set(next);
    this.apply(next);
    try {
      this.window?.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be blocked, e.g. in private browsing. The choice just won't be remembered.
    }
  }

  private apply(scheme: ColorScheme): void {
    this.document.documentElement.style.colorScheme = scheme;
  }

  private savedScheme(): ColorScheme | null {
    try {
      const saved = this.window?.localStorage.getItem(THEME_STORAGE_KEY);
      return saved === 'light' || saved === 'dark' ? saved : null;
    } catch {
      return null;
    }
  }

  private systemScheme(): ColorScheme {
    return this.window?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
