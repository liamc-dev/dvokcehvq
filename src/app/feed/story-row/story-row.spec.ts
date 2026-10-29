import { TestBed } from '@angular/core/testing';
import { HnItem } from '../../hacker-news/hn-item';
import { StoryRow } from './story-row';

const HOUR = 60 * 60;

const baseStory: HnItem = {
  id: 42,
  type: 'story',
  by: 'pg',
  time: Math.floor(Date.now() / 1000) - 3 * HOUR,
  title: 'A better way to read the news',
  url: 'https://www.example.com/article',
  score: 128,
  descendants: 1,
};

async function render(story: HnItem, rank = 7): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(StoryRow);
  fixture.componentRef.setInput('story', story);
  fixture.componentRef.setInput('rank', rank);
  await fixture.whenStable();
  return fixture.nativeElement;
}

/** The text a sighted reader sees: everything except the screen-reader-only extras. */
function visibleText(element: Element): string {
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('.visually-hidden').forEach((hidden) => hidden.remove());
  return copy.textContent!.replace(/\s+/g, ' ').trim();
}

/** Each piece of the info line under the title, e.g. ['example.com', '128 points', ...]. */
function metaParts(row: HTMLElement): string[] {
  return [...row.querySelectorAll('.meta > *')].map(visibleText);
}

describe('StoryRow', () => {
  it('links the title to the story and shows its details', async () => {
    const row = await render(baseStory);

    const title = row.querySelector<HTMLAnchorElement>('.title a')!;
    expect(visibleText(title)).toBe('A better way to read the news');
    expect(title.href).toBe('https://www.example.com/article');
    expect(visibleText(row.querySelector('.rank')!)).toBe('7');
    expect(metaParts(row)).toEqual([
      'example.com',
      '128 points',
      'by pg',
      '3 hours ago',
      '1 comment',
    ]);
  });

  it('links a text post with no url to its discussion on Hacker News', async () => {
    const row = await render({ ...baseStory, url: undefined, title: 'Ask HN: How do you learn?' });

    expect(row.querySelector<HTMLAnchorElement>('.title a')!.href).toBe(
      'https://news.ycombinator.com/item?id=42',
    );
    expect(row.querySelector('.domain')).toBeNull();
  });

  it('tells screen reader users which story a comments link is for, and that links open a new tab', async () => {
    const row = await render(baseStory);
    const [title, comments] = [...row.querySelectorAll('a')].map((link) =>
      link.textContent!.replace(/\s+/g, ' ').trim(),
    );

    expect(title).toBe('A better way to read the news (opens in a new tab)');
    expect(comments).toBe('1 comment : A better way to read the news (opens in a new tab)');
  });

  it('shows the full date when hovering over the time', async () => {
    const row = await render(baseStory);
    const time = row.querySelector('time')!;

    expect(time.getAttribute('datetime')).toBe(new Date(baseStory.time * 1000).toISOString());
    expect(time.title).toMatch(/\d{4}/);
  });

  it('uses the singular for a single point', async () => {
    const row = await render({ ...baseStory, score: 1 });
    expect(metaParts(row)).toContain('1 point');
  });

  it('invites discussion when there are no comments yet', async () => {
    const row = await render({ ...baseStory, descendants: 0 });
    expect(visibleText(row.querySelector('.meta a')!)).toBe('discuss');
  });

  it('hides points and comments for job posts', async () => {
    const row = await render({ ...baseStory, type: 'job', descendants: undefined });

    expect(metaParts(row)).toEqual(['example.com', 'by pg', '3 hours ago']);
  });
});
