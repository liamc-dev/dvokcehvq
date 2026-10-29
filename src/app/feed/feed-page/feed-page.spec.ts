import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { routes } from '../../app.routes';
import { HackerNewsApi } from '../../hacker-news/hacker-news-api';
import { HnItem } from '../../hacker-news/hn-item';
import { ErrorReporter } from '../../shared/error-reporter';

// 45 stories: a full first page of 30 and a second page of 15.
const STORY_IDS = Array.from({ length: 45 }, (_, i) => i + 1);

function toStories(ids: number[]): HnItem[] {
  return ids.map((id) => ({ id, type: 'story', time: 1_700_000_000, title: `Story ${id}` }));
}

describe('FeedPage', () => {
  let api: HackerNewsApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes, withComponentInputBinding())],
    });
    // The real service, so its paging logic runs too. Only the network calls are faked.
    api = TestBed.inject(HackerNewsApi);
    vi.spyOn(api, 'getStoryIds').mockReturnValue(of(STORY_IDS));
    vi.spyOn(api, 'getStories').mockImplementation((ids) =>
      of({ stories: toStories(ids), failed: 0 }),
    );
    vi.spyOn(api, 'refresh');
  });

  async function open(url: string) {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    await harness.fixture.whenStable();
    const page = harness.routeNativeElement!;
    return {
      harness,
      page,
      ranks: () => [...page.querySelectorAll('.rank')].map((el) => el.textContent?.trim()),
      button: (label: string) =>
        [...page.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!,
    };
  }

  it('shows the first page of top stories', async () => {
    const { page, ranks } = await open('/top');

    expect(page.querySelector('h1')?.textContent).toBe('Top stories');
    expect(api.getStoryIds).toHaveBeenCalledWith('top');
    expect(ranks()).toHaveLength(30);
    expect(ranks()[0]).toBe('1');
    expect(page.querySelector('.title')?.textContent).toContain('Story 1');
    expect(page.querySelector('mat-paginator')).not.toBeNull();
  });

  it('shows the new stories feed', async () => {
    const { page } = await open('/new');

    expect(page.querySelector('h1')?.textContent).toBe('New stories');
    expect(api.getStoryIds).toHaveBeenCalledWith('new');
  });

  it('opens the page given in the URL', async () => {
    const { ranks } = await open('/top?page=2');

    expect(api.getStories).toHaveBeenLastCalledWith(STORY_IDS.slice(30));
    expect(ranks()).toHaveLength(15);
    expect(ranks()[0]).toBe('31');
  });

  it('shows the last page when the page in the URL is too high', async () => {
    const { ranks } = await open('/top?page=99');
    expect(ranks()[0]).toBe('31');
  });

  it('puts the page in the URL when the paginator moves on, and focuses the heading', async () => {
    const { harness, page, ranks } = await open('/top');

    page.querySelector<HTMLButtonElement>('.mat-mdc-paginator-navigation-next')!.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/top?page=2');
    expect(ranks()[0]).toBe('31');
    expect(document.activeElement).toBe(page.querySelector('h1'));
  });

  it('jumps straight to a page picked from the page list', async () => {
    const { harness, page, ranks } = await open('/top?size=10');
    const pageList = page.querySelector<HTMLSelectElement>('.page-jump select')!;
    expect([...pageList.options].map((option) => option.textContent?.trim())).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);

    pageList.value = '3';
    pageList.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/top?page=3&size=10');
    expect(ranks()[0]).toBe('21');
    expect(pageList.value).toBe('3');
  });

  it('shows the number of stories per page chosen in the URL', async () => {
    const { page, ranks } = await open('/top?size=10');

    expect(ranks()).toHaveLength(10);
    expect(page.querySelector('.mat-mdc-paginator-range-label')?.textContent?.trim()).toBe(
      '1 – 10 of 45',
    );
  });

  it('uses 30 per page when the size in the URL is not one of the options', async () => {
    const { ranks } = await open('/top?size=7');
    expect(ranks()).toHaveLength(30);
  });

  it('keeps the page size when moving to the next page', async () => {
    const { harness, page, ranks } = await open('/top?size=10');

    page.querySelector<HTMLButtonElement>('.mat-mdc-paginator-navigation-next')!.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/top?page=2&size=10');
    expect(ranks()[0]).toBe('11');
  });

  it('tells screen reader users which stories are showing', async () => {
    const { page } = await open('/top?page=2');

    expect(page.querySelector('[aria-live]')?.textContent?.trim()).toBe(
      'Showing top stories 31 to 45 of 45.',
    );
  });

  it('says how many stories could not be loaded, keeps the true ranks, and offers to try again', async () => {
    vi.mocked(api.getStories).mockReturnValueOnce(of({ stories: toStories([1, 3]), failed: 1 }));
    const { harness, page, ranks, button } = await open('/top?size=10');

    expect(page.querySelector('.partial-failure')?.textContent).toContain(
      "1 story couldn't be loaded.",
    );
    expect(page.querySelector('[aria-live]')?.textContent).toContain("1 story couldn't be loaded.");
    expect(ranks()).toEqual(['1', '3']);

    button('Try again').click();
    await harness.fixture.whenStable();

    expect(page.querySelector('.partial-failure')).toBeNull();
    expect(ranks()).toHaveLength(10);
  });

  it('reports errors that are not network failures, such as a bug while building the page', async () => {
    const report = vi
      .spyOn(TestBed.inject(ErrorReporter), 'report')
      .mockImplementation(() => undefined);
    const bug = new TypeError('bug while building the page');
    vi.spyOn(api, 'getPage').mockReturnValueOnce(throwError(() => bug));

    const { page } = await open('/top');

    expect(page.querySelector('[role="alert"]')).not.toBeNull();
    expect(report).toHaveBeenCalledWith('feed-page', bug, { feed: 'top', page: 1 });
  });

  it('shows an error with a way to try again when the list fails to load', async () => {
    vi.mocked(api.getStoryIds).mockReturnValueOnce(throwError(() => new Error('offline')));
    const { harness, page, ranks, button } = await open('/top');

    expect(page.querySelector('[role="alert"]')?.textContent).toContain("couldn't load");
    expect(ranks()).toHaveLength(0);

    button('Try again').click();
    await harness.fixture.whenStable();

    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(ranks()).toHaveLength(30);
  });

  it('tries again when the stories themselves fail to load', async () => {
    vi.mocked(api.getStories).mockReturnValueOnce(throwError(() => new Error('offline')));
    const { harness, page, ranks, button } = await open('/top');

    expect(page.querySelector('[role="alert"]')).not.toBeNull();

    button('Try again').click();
    await harness.fixture.whenStable();

    expect(ranks()).toHaveLength(30);
  });

  it('says so when a feed has no stories', async () => {
    vi.mocked(api.getStoryIds).mockReturnValueOnce(of([]));
    const { page } = await open('/top');

    expect(page.textContent).toContain('There are no stories to show right now.');
    expect(page.querySelector('mat-paginator')).toBeNull();
  });

  it('asks for a fresh list when refreshed', async () => {
    const { harness, button } = await open('/top');

    button('Refresh').click();
    await harness.fixture.whenStable();

    expect(api.refresh).toHaveBeenCalledWith('top');
    expect(api.getStoryIds).toHaveBeenCalledTimes(2);
  });

  it('keeps the current stories on screen while a refresh loads, so the page does not jump', async () => {
    const { harness, page, ranks, button } = await open('/top');
    const freshIds = new Subject<number[]>();
    vi.mocked(api.getStoryIds).mockReturnValueOnce(freshIds);

    button('Refresh').click();
    harness.detectChanges();

    expect(ranks()).toHaveLength(30);
    expect(page.querySelector('.stories')!.classList).toContain('updating');

    freshIds.next([...STORY_IDS].reverse());
    freshIds.complete();
    await harness.fixture.whenStable();

    expect(page.querySelector('.stories')!.classList).not.toContain('updating');
    expect(page.querySelector('.title')?.textContent).toContain('Story 45');
  });
});
