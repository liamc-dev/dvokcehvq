import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  viewChild,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatProgressBar } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Feed, HackerNewsApi, StoryPage } from '../../hacker-news/hacker-news-api';
import { ErrorReporter } from '../../shared/error-reporter';
import { StoryRow } from '../story-row/story-row';

export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];
export const DEFAULT_PAGE_SIZE = 30;

const FEED_TITLES: Record<Feed, string> = {
  top: 'Top stories',
  new: 'New stories',
};

@Component({
  selector: 'app-feed-page',
  imports: [MatButton, MatPaginator, MatProgressBar, StoryRow],
  templateUrl: './feed-page.html',
  styleUrl: './feed-page.scss',
})
export class FeedPage {
  private readonly api = inject(HackerNewsApi);
  private readonly reporter = inject(ErrorReporter);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');

  // Set by the router: `feed` from the route's data, `page` and `size` from the query string.
  readonly feed = input.required<Feed>();
  readonly page = input(1, { transform: toPageNumber });
  readonly size = input(DEFAULT_PAGE_SIZE, { transform: toPageSize });

  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  protected readonly placeholders = Array.from({ length: 8 }, (_, i) => i);
  protected readonly title = computed(() => FEED_TITLES[this.feed()]);

  private readonly storyPage = rxResource({
    params: () => ({ feed: this.feed(), page: this.page(), size: this.size() }),
    stream: ({ params }) => this.api.getPage(params.feed, params.page, params.size),
  });

  // While another page or a refresh is loading, keep the current stories on screen (faded) rather
  // than swapping in placeholders, so the page doesn't shrink and jump. Read through hasValue()
  // because value() throws while the resource is in its error state.
  protected readonly shownPage = linkedSignal<
    { latest: StoryPage | undefined; loading: boolean },
    StoryPage | undefined
  >({
    source: () => ({
      latest: this.storyPage.hasValue() ? this.storyPage.value() : undefined,
      loading: this.storyPage.isLoading(),
    }),
    computation: ({ latest, loading }, previous) =>
      latest ?? (loading ? previous?.value : undefined),
  });

  protected readonly loading = this.storyPage.isLoading;
  protected readonly failed = computed(() => !!this.storyPage.error());
  protected readonly pageNumbers = computed(() =>
    Array.from({ length: this.shownPage()?.pageCount ?? 0 }, (_, i) => i + 1),
  );

  protected readonly failedMessage = computed(() => {
    const failed = this.shownPage()?.failed ?? 0;
    return failed === 0
      ? ''
      : `${failed} ${failed === 1 ? 'story' : 'stories'} couldn't be loaded.`;
  });

  // Read out by screen readers whenever it changes (see the aria-live region in the template).
  protected readonly status = computed(() => {
    const shown = this.shownPage();
    if (this.loading()) {
      return 'Loading stories…';
    }
    if (!shown?.stories.length) {
      return '';
    }
    const showing = `Showing ${this.title().toLowerCase()} ${shown.firstRank} to ${shown.lastRank} of ${shown.total}.`;
    return `${showing} ${this.failedMessage()}`.trim();
  });

  constructor() {
    // Failed requests are reported by the HTTP interceptor, and the reporter skips anything it has
    // already seen. Whatever is left here is a bug in turning the data into a page.
    effect(() => {
      const error = this.storyPage.error();
      if (error) {
        this.reporter.report('feed-page', error, { feed: this.feed(), page: this.page() });
      }
    });
  }

  protected onPaginatorChange({ pageIndex, pageSize }: PageEvent): Promise<void> {
    // The new stories appear at the top of the list, so after Next, Previous, First or Last take
    // keyboard and screen reader users there, instead of leaving them on the paginator below.
    const movedPage = pageSize === this.size();
    return this.goTo(pageIndex + 1, pageSize, movedPage);
  }

  // Focus stays on the page list: moving it away while someone is still choosing would be jarring.
  protected jumpToPage(page: string): Promise<void> {
    return this.goTo(Number(page), this.size(), false);
  }

  protected refresh(): void {
    this.api.refresh(this.feed());
    this.storyPage.reload();
  }

  protected retry(): void {
    this.storyPage.reload();
  }

  private async goTo(page: number, size: number, focusHeading: boolean): Promise<void> {
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: page === 1 ? null : page,
        size: size === DEFAULT_PAGE_SIZE ? null : size,
      },
    });
    if (focusHeading) {
      this.heading().nativeElement.focus();
    }
  }
}

function toPageNumber(value: unknown): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function toPageSize(value: unknown): number {
  const size = Number(value);
  return PAGE_SIZE_OPTIONS.includes(size) ? size : DEFAULT_PAGE_SIZE;
}
