import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { HackerNewsApi, LoadedStories, StoryPage } from './hacker-news-api';
import { HnItem } from './hn-item';

const API = environment.hackerNewsApiUrl;
const SERVER_ERROR = { status: 500, statusText: 'Server Error' };

function story(id: number, extra: Partial<HnItem> = {}): HnItem {
  return { id, type: 'story', time: 1_700_000_000, title: `Story ${id}`, ...extra };
}

describe('HackerNewsApi', () => {
  let api: HackerNewsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    api = TestBed.inject(HackerNewsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getStoryIds', () => {
    it('loads the top stories list', () => {
      let ids: number[] | undefined;
      api.getStoryIds('top').subscribe((value) => (ids = value));

      const req = http.expectOne(`${API}/topstories.json`);
      expect(req.request.method).toBe('GET');
      req.flush([3, 2, 1]);

      expect(ids).toEqual([3, 2, 1]);
    });

    it('loads the new stories list', () => {
      let ids: number[] | undefined;
      api.getStoryIds('new').subscribe((value) => (ids = value));

      http.expectOne(`${API}/newstories.json`).flush([9, 8]);

      expect(ids).toEqual([9, 8]);
    });

    it('reuses the list for the same feed instead of fetching it again', () => {
      api.getStoryIds('top').subscribe();
      http.expectOne(`${API}/topstories.json`).flush([1, 2]);

      let ids: number[] | undefined;
      api.getStoryIds('top').subscribe((value) => (ids = value));

      http.expectNone(`${API}/topstories.json`);
      expect(ids).toEqual([1, 2]);
    });

    it('fetches a fresh list after refresh()', () => {
      api.getStoryIds('top').subscribe();
      http.expectOne(`${API}/topstories.json`).flush([1, 2]);

      api.refresh('top');
      let ids: number[] | undefined;
      api.getStoryIds('top').subscribe((value) => (ids = value));
      http.expectOne(`${API}/topstories.json`).flush([5, 4]);

      expect(ids).toEqual([5, 4]);
    });

    it('asks again after a failed request instead of remembering the failure', () => {
      let failed = false;
      api.getStoryIds('top').subscribe({ error: () => (failed = true) });
      http.expectOne(`${API}/topstories.json`).flush('down', SERVER_ERROR);
      expect(failed).toBe(true);

      let ids: number[] | undefined;
      api.getStoryIds('top').subscribe((value) => (ids = value));
      http.expectOne(`${API}/topstories.json`).flush([7]);

      expect(ids).toEqual([7]);
    });
  });

  describe('getStories', () => {
    it('loads the stories in the order they were asked for', () => {
      let result: LoadedStories | undefined;
      api.getStories([2, 1]).subscribe((value) => (result = value));

      http.expectOne(`${API}/item/1.json`).flush(story(1));
      http.expectOne(`${API}/item/2.json`).flush(story(2));

      expect(result?.stories.map((s) => s.id)).toEqual([2, 1]);
      expect(result?.failed).toBe(0);
    });

    it('leaves out stories that are missing, deleted or dead, without calling them failures', () => {
      let result: LoadedStories | undefined;
      api.getStories([1, 2, 3, 4]).subscribe((value) => (result = value));

      http.expectOne(`${API}/item/1.json`).flush(story(1));
      http.expectOne(`${API}/item/2.json`).flush(null);
      http.expectOne(`${API}/item/3.json`).flush(story(3, { deleted: true }));
      http.expectOne(`${API}/item/4.json`).flush(story(4, { dead: true }));

      expect(result).toEqual({ stories: [story(1)], failed: 0 });
    });

    it('leaves out stories that fail to load and counts them, instead of failing them all', () => {
      let result: LoadedStories | undefined;
      api.getStories([1, 2, 3]).subscribe((value) => (result = value));

      http.expectOne(`${API}/item/1.json`).flush(story(1));
      http.expectOne(`${API}/item/2.json`).flush('down', SERVER_ERROR);
      http.expectOne(`${API}/item/3.json`).flush('down', SERVER_ERROR);

      expect(result).toEqual({ stories: [story(1)], failed: 2 });
    });

    it('does not fetch a story it has already loaded', () => {
      api.getStories([1]).subscribe();
      http.expectOne(`${API}/item/1.json`).flush(story(1));

      let result: LoadedStories | undefined;
      api.getStories([1]).subscribe((value) => (result = value));

      http.expectNone(`${API}/item/1.json`);
      expect(result?.stories[0].title).toBe('Story 1');
    });

    it('returns an empty result straight away when given no ids', () => {
      let result: LoadedStories | undefined;
      api.getStories([]).subscribe((value) => (result = value));

      expect(result).toEqual({ stories: [], failed: 0 });
    });
  });

  describe('getPage', () => {
    /** Loads a page of the top feed. Stories listed in `failing` get a server error. */
    function loadPage(
      page: number,
      pageSize: number,
      ids: number[],
      failing: number[] = [],
    ): StoryPage | undefined {
      let result: StoryPage | undefined;
      api.getPage('top', page, pageSize).subscribe((value) => (result = value));
      http.expectOne(`${API}/topstories.json`).flush(ids);
      http
        .match((req) => req.url.includes('/item/'))
        .forEach((req) => {
          const id = Number(req.request.url.match(/item\/(\d+)\.json/)![1]);
          if (failing.includes(id)) {
            req.flush('down', SERVER_ERROR);
          } else {
            req.flush(story(id));
          }
        });
      return result;
    }

    it('loads just the stories on the requested page, with their ranks', () => {
      const page = loadPage(2, 2, [11, 12, 13, 14, 15]);

      expect(page?.stories.map((s) => [s.id, s.rank])).toEqual([
        [13, 3],
        [14, 4],
      ]);
      expect(page).toMatchObject({
        failed: 0,
        page: 2,
        pageCount: 3,
        total: 5,
        firstRank: 3,
        lastRank: 4,
      });
    });

    it('keeps the true rank of each story when one before it fails to load', () => {
      const page = loadPage(1, 3, [11, 12, 13], [12]);

      expect(page?.stories.map((s) => [s.id, s.rank])).toEqual([
        [11, 1],
        [13, 3],
      ]);
      expect(page).toMatchObject({ failed: 1, firstRank: 1, lastRank: 3 });
    });

    it('shows the last page for a page number past the end', () => {
      const page = loadPage(9, 2, [11, 12, 13, 14, 15]);

      expect(page?.stories.map((s) => s.id)).toEqual([15]);
      expect(page).toMatchObject({ page: 3, firstRank: 5, lastRank: 5 });
    });

    it('shows the first page for a page number below 1', () => {
      const page = loadPage(0, 2, [11, 12, 13]);
      expect(page).toMatchObject({ page: 1, firstRank: 1 });
    });

    it('gives an empty first page for an empty feed', () => {
      const page = loadPage(1, 30, []);
      expect(page).toEqual({
        stories: [],
        failed: 0,
        page: 1,
        pageCount: 1,
        total: 0,
        firstRank: 1,
        lastRank: 0,
      });
    });
  });
});
