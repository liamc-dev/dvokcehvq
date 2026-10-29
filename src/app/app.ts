import { Component, computed, inject } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatToolbar } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Theme } from './shared/theme';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbar,
    MatButton,
    MatIconButton,
    MatIcon,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly feeds = [
    { path: '/top', label: 'Top' },
    { path: '/new', label: 'New' },
  ];
  protected readonly theme = inject(Theme);
  protected readonly themeLabel = computed(() =>
    this.theme.scheme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
  );

  // A plain #main-content link would make the browser leave the page (the base href is "/"),
  // so move focus to the content directly.
  protected skipToContent(event: Event, main: HTMLElement): void {
    event.preventDefault();
    main.focus();
  }
}
