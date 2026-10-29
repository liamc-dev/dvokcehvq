import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.style.colorScheme = '';
  });

  it('shows the app name and links to both feeds', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.brand')?.textContent).toContain('HN Reader');
    const links = [...element.querySelectorAll<HTMLAnchorElement>('nav a')];
    expect(links.map((link) => link.textContent?.trim())).toEqual(['Top', 'New']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/top', '/new']);
  });

  it('has a button that switches between light and dark mode', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-label$="mode"]',
    )!;
    expect(button.getAttribute('aria-label')).toBe('Switch to dark mode');

    button.click();
    await fixture.whenStable();

    expect(button.getAttribute('aria-label')).toBe('Switch to light mode');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('lets keyboard users skip straight to the stories', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    element.querySelector<HTMLAnchorElement>('.skip-link')!.click();

    expect(document.activeElement).toBe(element.querySelector('main'));
  });
});
