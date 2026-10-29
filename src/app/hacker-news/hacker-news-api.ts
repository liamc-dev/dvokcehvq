import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, shareReplay, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { HnItem } from './hn-item';

export type Feed = 'top' | 'new';

export interface LoadedStories {
  stories: HnItem[];
  /** How many stories couldn't be loaded, even after retrying. They're not in `stories`. */
  failed: number;
}

/** A story plus its position in the feed, which stays correct even if stories before it are missing. */
export interface RankedStory extends HnItem {
  rank: number;
}

export interface StoryPage {
  stories: RankedStory[];
  /** How many stories on this page couldn't be loaded, even after retrying. */
  failed: number;
  /** The page actually shown: a page number past the end gives the last page. */
  page: number;
  pageCount: number;
  /** How many stories the whole feed has. */
  total: number;
  /** The ranks this page covers, e.g. 31 to 60. */
  firstRank: number;
  lastRank: number;
}

const API_URL = environment.hackerNewsApiUrl;

@Service()
export class HackerNewsApi {
  private readonly http = inject(HttpClient);

  // The id list for each feed is fetched once and reused for every page of that feed,
  // so stories don't shift between pages while someone is reading. refresh() starts over.
  private readonly storyIds = new Map<Feed, Observable<number[]>>();
  private readonly items = new Map<number, HnItem>();

  getStoryIds(feed: Feed): Observable<number[]> {
    let ids = this.storyIds.get(feed);
    if (!ids) {
      ids = this.http.get<number[]>(`${API_URL}/${feed}stories.json`).pipe(shareReplay(1));
      this.storyIds.set(feed, ids);
    }
    return ids;
  }

  getItem(id: number): Observable<HnItem | null> {
    const cached = this.items.get(id);
    if (cached) {
      return of(cached);
    }
    return this.http.get<HnItem | null>(`${API_URL}/item/${id}.json`).pipe(
      tap((item) => {
        if (item) {
          this.items.set(id, item);
        }
      }),
    );
  }

  /**
   * Loads the given stories in parallel and keeps their order. Stories that no longer exist or
   * were deleted or flagged dead are left out. So are stories that fail to load, so one bad
   * request doesn't fail the whole page, but those are counted in `failed` so the page can say so.
   * The failures themselves have already been reported by the error-reporting interceptor.
   */
  getStories(ids: number[]): Observable<LoadedStories> {
    if (ids.length === 0) {
      return of({ stories: [], failed: 0 });
    }
    const requests = ids.map((id) => this.getItem(id).pipe(catchError(() => of(FAILED))));
    return forkJoin(requests).pipe(
      map((items) => ({
        stories: items.filter(isVisible),
        failed: items.filter((item) => item === FAILED).length,
      })),
    );
  }

  /** One page of a feed, numbered from 1. Out-of-range page numbers are moved into range. */
  getPage(feed: Feed, page: number, pageSize: number): Observable<StoryPage> {
    return this.getStoryIds(feed).pipe(
      switchMap((ids) => {
        const pageCount = Math.max(1, Math.ceil(ids.length / pageSize));
        const shownPage = Math.min(Math.max(page, 1), pageCount);
        const start = (shownPage - 1) * pageSize;
        const pageIds = ids.slice(start, start + pageSize);
        return this.getStories(pageIds).pipe(
          map(({ stories, failed }) => ({
            stories: stories.map((story) => ({
              ...story,
              rank: start + pageIds.indexOf(story.id) + 1,
            })),
            failed,
            page: shownPage,
            pageCount,
            total: ids.length,
            firstRank: start + 1,
            lastRank: start + pageIds.length,
          })),
        );
      }),
    );
  }

  refresh(feed: Feed): void {
    this.storyIds.delete(feed);
    this.items.clear();
  }
}

// Marks a story whose request failed, as opposed to `null`, which the API returns for an id that
// no longer exists.
const FAILED = Symbol('failed');

function isVisible(item: HnItem | null | typeof FAILED): item is HnItem {
  return typeof item === 'object' && item !== null && !item.deleted && !item.dead;
}
