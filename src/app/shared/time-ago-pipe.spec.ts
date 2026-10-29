import { TimeAgoPipe } from './time-ago-pipe';

describe('TimeAgoPipe', () => {
  const pipe = new TimeAgoPipe();
  const now = Date.UTC(2026, 0, 15, 12, 0, 0);
  const secondsBeforeNow = (seconds: number) => now / 1000 - seconds;

  it.each([
    [30, 'just now'],
    [60, '1 minute ago'],
    [5 * 60, '5 minutes ago'],
    [119 * 60, '1 hour ago'],
    [3 * 60 * 60, '3 hours ago'],
    [24 * 60 * 60, 'yesterday'],
    [3 * 24 * 60 * 60, '3 days ago'],
    [14 * 24 * 60 * 60, '2 weeks ago'],
    [400 * 24 * 60 * 60, 'last year'],
  ])('shows %i seconds ago as "%s"', (seconds, expected) => {
    expect(pipe.transform(secondsBeforeNow(seconds), now)).toBe(expected);
  });
});
