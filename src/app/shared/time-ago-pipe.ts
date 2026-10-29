import { Pipe, PipeTransform } from '@angular/core';

const DAY = 24 * 60 * 60;

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * DAY],
  ['month', 30 * DAY],
  ['week', 7 * DAY],
  ['day', DAY],
  ['hour', 60 * 60],
  ['minute', 60],
];

const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** Turns a Unix timestamp in seconds, as the HN API returns it, into "3 hours ago". */
@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
  transform(unixSeconds: number, now: number = Date.now()): string {
    const secondsAgo = now / 1000 - unixSeconds;
    for (const [unit, size] of UNITS) {
      if (secondsAgo >= size) {
        return formatter.format(-Math.floor(secondsAgo / size), unit);
      }
    }
    return 'just now';
  }
}
